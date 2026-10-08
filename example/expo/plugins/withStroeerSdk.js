// Local config plugin for the Stroeer SDK. Plain JS, runs during `expo prebuild`.
//   android: <meta-data com.google.android.gms.ads.APPLICATION_ID> in <application>
//   ios:     GADApplicationIdentifier in Info.plist, and the StroeerSDK pod in the Podfile
// Options (app.json): { androidAdMobAppId, iosAdMobAppId }
const fs = require('fs');
const path = require('path');
const {
  AndroidConfig,
  withAndroidManifest,
  withInfoPlist,
  withDangerousMod,
} = require('expo/config-plugins');

const PODFILE_MARKER = '# @generated stroeer-sdk';
const POD_LINE =
  "pod 'StroeerSDK', :podspec => 'https://stroeersdk.github.io/iOS/cocoapods/StroeerSDK.podspec', :subspecs => ['Core']";

function withStroeerSdk(config, options = {}) {
  const { androidAdMobAppId, iosAdMobAppId } = options;

  if (androidAdMobAppId) {
    config = withAndroidManifest(config, cfg => {
      const app = AndroidConfig.Manifest.getMainApplicationOrThrow(cfg.modResults);
      AndroidConfig.Manifest.addMetaDataItemToMainApplication(
        app,
        'com.google.android.gms.ads.APPLICATION_ID',
        androidAdMobAppId,
      );
      return cfg;
    });
  }

  if (iosAdMobAppId) {
    config = withInfoPlist(config, cfg => {
      cfg.modResults.GADApplicationIdentifier = iosAdMobAppId;
      return cfg;
    });
  }

  // Not verified (no pod install was run for this example).
  config = withDangerousMod(config, [
    'ios',
    async cfg => {
      const file = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      if (fs.existsSync(file)) {
        const contents = fs.readFileSync(file, 'utf8');
        if (!contents.includes(PODFILE_MARKER)) {
          const patched = contents.replace(
            /^(\s*)use_native_modules!.*$/m,
            m => `${m}\n$1${PODFILE_MARKER}\n$1${POD_LINE}`,
          );
          fs.writeFileSync(file, patched === contents ? `${contents}\n${PODFILE_MARKER}\n${POD_LINE}\n` : patched);
        }
      }
      return cfg;
    },
  ]);

  return config;
}

module.exports = withStroeerSdk;
