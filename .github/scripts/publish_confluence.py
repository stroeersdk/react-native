#!/usr/bin/env python3
"""Publish repository Markdown documents to existing Confluence Cloud pages.

The page mapping lives in .github/confluence/pages.json. Each mapped file is
converted to Confluence storage format and the page is updated in place.
A content hash is stored in the version message so unchanged documents do not
create new page versions.

Environment:
  CONFLUENCE_BASE_URL   e.g. https://stroeerdigitalgroup.atlassian.net
  CONFLUENCE_USER       Atlassian account email of the API token owner
  CONFLUENCE_API_TOKEN  Atlassian API token
  GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_SHA, GITHUB_REF_NAME (set by Actions)
"""

import argparse
import base64
import hashlib
import html
import json
import os
import posixpath
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

from markdown_it import MarkdownIt
from mdit_py_plugins.anchors import anchors_plugin

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_CONFIG = os.path.join(REPO_ROOT, ".github", "confluence", "pages.json")

ALERT_MACROS = {
    "NOTE": "info",
    "TIP": "tip",
    "IMPORTANT": "note",
    "WARNING": "warning",
    "CAUTION": "warning",
}
# Markdown fence names that Confluence's code macro knows under a different name.
CODE_LANGUAGES = {"ts": "typescript", "tsx": "typescript", "js": "javascript", "jsx": "javascript", "sh": "bash", "shell": "bash"}
HASH_MARKER = re.compile(r"\[content:([0-9a-f]{12})\]")


def github_slug(text, separator="-"):
    """Heading anchor compatible with GitHub's Markdown renderer."""
    text = html.unescape(re.sub(r"<[^>]+>", "", text)).strip().lower()
    text = re.sub(r"[^\w\- ]", "", text)
    return text.replace(" ", separator)


def code_macro(match):
    language = CODE_LANGUAGES.get(match.group(1), match.group(1))
    code = html.unescape(match.group(2)).rstrip("\n")
    # A CDATA section cannot contain "]]>", so split it across two sections.
    code = code.replace("]]>", "]]]]><![CDATA[>")
    params = f'<ac:parameter ac:name="language">{language}</ac:parameter>' if language else ""
    return (
        '<ac:structured-macro ac:name="code">'
        f"{params}"
        f"<ac:plain-text-body><![CDATA[{code}]]></ac:plain-text-body>"
        "</ac:structured-macro>"
    )


ALERT_START = re.compile(r"^\s*>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$", re.IGNORECASE)
ALERT_PLACEHOLDER = "CONFLUENCEALERTBLOCK{}"


def extract_alerts(markdown_text):
    """Replaces GitHub alert blockquotes with placeholders and returns the rendered macros.

    Alerts are handled before the main conversion because Python-Markdown merges
    adjacent blockquotes, while GitHub renders each alert separately.
    """
    lines = markdown_text.split("\n")
    output, alerts, index = [], [], 0
    while index < len(lines):
        match = ALERT_START.match(lines[index])
        if not match:
            output.append(lines[index])
            index += 1
            continue
        index += 1
        content = []
        while index < len(lines) and lines[index].lstrip().startswith(">"):
            content.append(re.sub(r"^\s*> ?", "", lines[index]))
            index += 1
        macro = ALERT_MACROS[match.group(1).upper()]
        alerts.append(
            f'<ac:structured-macro ac:name="{macro}"><ac:rich-text-body>'
            f"{render_markdown(chr(10).join(content))}"
            "</ac:rich-text-body></ac:structured-macro>"
        )
        output.extend(["", ALERT_PLACEHOLDER.format(len(alerts) - 1), ""])
    return "\n".join(output), alerts


def render_markdown(markdown_text):
    # CommonMark parser, so nested lists and code blocks render the same as on GitHub.
    renderer = (
        MarkdownIt("commonmark", {"html": True, "xhtmlOut": True})
        .enable(["table", "strikethrough"])
        .use(anchors_plugin, min_level=1, max_level=6, slug_func=github_slug)
    )
    return renderer.render(markdown_text)


def heading_with_anchor(match):
    level, anchor, content = match.group(1), match.group(2), match.group(3)
    return (
        f'<ac:structured-macro ac:name="anchor"><ac:parameter ac:name="">{anchor}</ac:parameter>'
        f"</ac:structured-macro><h{level}>{content}</h{level}>"
    )


class LinkRewriter:
    """Rewrites links so they work from Confluence instead of GitHub."""

    def __init__(self, source_file, page_ids, repo_url, ref):
        self.source_dir = posixpath.dirname(source_file)
        self.page_ids = page_ids
        self.repo_url = repo_url
        self.ref = ref

    def __call__(self, match):
        href, body = html.unescape(match.group(1)), match.group(2)
        if href.startswith("#"):
            return (
                f'<ac:link ac:anchor="{html.escape(href[1:])}">'
                f"<ac:link-body>{body}</ac:link-body></ac:link>"
            )
        if re.match(r"^[a-z][a-z0-9+.-]*:", href, re.IGNORECASE):
            return match.group(0)

        path, _, fragment = href.partition("#")
        target = posixpath.normpath(posixpath.join(self.source_dir, path))
        if target in self.page_ids:
            url = f"/wiki/pages/viewpage.action?pageId={self.page_ids[target]}"
            if fragment:
                url += "#" + fragment
        else:
            url = f"{self.repo_url}/blob/{self.ref}/{target}"
            if fragment:
                url += "#" + fragment
        return f'<a href="{html.escape(url)}">{body}</a>'


def to_storage_format(markdown_text, source_file, page_ids, repo_url, ref):
    markdown_text, alerts = extract_alerts(markdown_text)
    body = render_markdown(markdown_text)
    for index, alert in enumerate(alerts):
        body = body.replace(f"<p>{ALERT_PLACEHOLDER.format(index)}</p>", alert)

    body = re.sub(
        r'<pre><code(?: class="language-([\w+#.-]+)")?>(.*?)</code></pre>',
        code_macro,
        body,
        flags=re.DOTALL,
    )
    body = re.sub(r'<h([1-6]) id="([^"]+)">(.*?)</h\1>', heading_with_anchor, body, flags=re.DOTALL)
    body = re.sub(
        r'<a href="([^"]*)">(.*?)</a>',
        LinkRewriter(source_file, page_ids, repo_url, ref),
        body,
        flags=re.DOTALL,
    )

    return body


def assert_well_formed(storage, source_file):
    wrapped = (
        '<root xmlns:ac="urn:confluence:ac" xmlns:ri="urn:confluence:ri">' + storage + "</root>"
    )
    try:
        ET.fromstring(wrapped)
    except ET.ParseError as error:
        raise SystemExit(f"{source_file}: generated storage format is not well-formed XML: {error}")


class Confluence:
    def __init__(self, base_url, user, token):
        self.base_url = base_url.rstrip("/")
        credentials = base64.b64encode(f"{user}:{token}".encode()).decode()
        self.headers = {
            "Authorization": f"Basic {credentials}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    def _request(self, method, path, payload=None):
        data = json.dumps(payload).encode() if payload is not None else None
        request = urllib.request.Request(
            self.base_url + path, data=data, method=method, headers=self.headers
        )
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            detail = error.read().decode(errors="replace")
            raise RuntimeError(f"{method} {path} failed with HTTP {error.code}: {detail}") from None

    def get_page(self, page_id):
        return self._request("GET", f"/wiki/rest/api/content/{page_id}?expand=version")

    def update_page(self, page, title, storage, message):
        payload = {
            "id": page["id"],
            "type": page["type"],
            "title": title,
            "version": {"number": page["version"]["number"] + 1, "message": message},
            "body": {"storage": {"value": storage, "representation": "storage"}},
        }
        return self._request("PUT", f"/wiki/rest/api/content/{page['id']}", payload)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--config", default=DEFAULT_CONFIG)
    parser.add_argument("--dry-run", action="store_true", help="convert only, do not call Confluence")
    parser.add_argument("--output-dir", help="write generated storage format files here")
    parser.add_argument("--force", action="store_true", help="update pages even if content is unchanged")
    args = parser.parse_args()

    with open(args.config, encoding="utf-8") as config_file:
        entries = json.load(config_file)["pages"]

    page_ids = {entry["file"]: str(entry["page_id"]) for entry in entries if entry.get("page_id")}
    repo_url = f"{os.environ.get('GITHUB_SERVER_URL', 'https://github.com')}/{os.environ.get('GITHUB_REPOSITORY', 'stroeersdk/react-native')}"
    ref = os.environ.get("GITHUB_REF_NAME", "main")
    sha = os.environ.get("GITHUB_SHA", "local")

    client = None
    if not args.dry_run:
        missing = [name for name in ("CONFLUENCE_BASE_URL", "CONFLUENCE_USER", "CONFLUENCE_API_TOKEN") if not os.environ.get(name)]
        if missing:
            raise SystemExit("Missing environment variables: " + ", ".join(missing))
        client = Confluence(
            os.environ["CONFLUENCE_BASE_URL"], os.environ["CONFLUENCE_USER"], os.environ["CONFLUENCE_API_TOKEN"]
        )

    failures = 0
    for entry in entries:
        source_file = entry["file"]
        page_id = str(entry.get("page_id") or "")
        if not page_id and not args.dry_run:
            print(f"::notice::Skipping {source_file}: no page_id configured")
            continue

        with open(os.path.join(REPO_ROOT, source_file), encoding="utf-8") as source:
            markdown_text = source.read()
        storage = to_storage_format(markdown_text, source_file, page_ids, repo_url, ref)
        # Hash the converted page (not the Markdown) so converter or mapping changes also trigger an update.
        content_hash = hashlib.sha256(storage.encode()).hexdigest()[:12]
        assert_well_formed(storage, source_file)

        if args.output_dir:
            out_path = os.path.join(args.output_dir, source_file + ".xml")
            os.makedirs(os.path.dirname(out_path), exist_ok=True)
            with open(out_path, "w", encoding="utf-8") as out:
                out.write(storage)

        if args.dry_run:
            print(f"Converted {source_file} ({len(storage)} chars, page_id={page_id or '-'})")
            continue

        try:
            page = client.get_page(page_id)
            previous = HASH_MARKER.search(page["version"].get("message") or "")
            if previous and previous.group(1) == content_hash and not args.force:
                print(f"Unchanged {source_file} -> page {page_id}, skipping")
                continue
            title = entry.get("title") or page["title"]
            message = f"Synced from {os.environ.get('GITHUB_REPOSITORY', 'repository')}@{sha[:7]} [content:{content_hash}]"
            updated = client.update_page(page, title, storage, message)
            print(f"Updated {source_file} -> page {page_id} (version {updated['version']['number']})")
        except RuntimeError as error:
            failures += 1
            print(f"::error file={source_file}::{error}")

    if failures:
        sys.exit(1)


if __name__ == "__main__":
    main()
