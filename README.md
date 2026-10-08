# Ströer SDK for React Native

The Ströer SDK helps publishers integrate banner, interstitial and rewarded ads into React Native
applications on Android and iOS. Confiant ad-quality monitoring is available as an option.

npm package: `react-native-stroeer-sdk`

## Release notes

### 1.0.0 (07.Oct.2026)

#### New
- SDK rebranded as StröerSDK.
- The bridge is built for the New Architecture only (React Native 0.82): every module is a codegen
  TurboModule and the banner is a Fabric component.
- Interstitial and rewarded ads are ad handles (`create` → `load` → `show` → `destroy`), with hooks
  and headless components on top.

#### Fixed
- Banner `onAdLoaded` is no longer lost when an impression follows immediately, and every load
  failure is reported to `onAdFailedToLoad`.
- Interstitial and rewarded ads no longer show automatically after loading.
- `clearConfigurationCache()` no longer clears the app's default shared preferences (including
  consent).

#### Changed
- Errors are reported as `{ code, message }`.
- The React Native API has breaking changes: see the [full release notes](docs/ReleaseNotes.md).

## Documentation

- [Integration manual](docs/1.0/Integration.md): setup, every ad format, errors, targeting and
  debugging.
- [Release notes](docs/ReleaseNotes.md)
- Example apps with a preconfigured test setup: [React Native](example/react-native/README.md)
  and [Expo](example/expo/README.md).

## Requirements

| Component    | Version            |
|--------------|--------------------|
| React Native | 0.82.1+            |
| React        | 19.1.1+            |
| Node         | 20.19.4+           |
| Android      | minSdk 24, Java 17 |
| iOS          | 15.1+, Xcode 16.1+ |

The New Architecture (Fabric, TurboModules) is required. React Native 0.82 removed the legacy
architecture.

## Before you start

You need two values from your Ströer account manager:

- `APPLICATION_NAME`: unique identifier of your app.
- `PUBLISHER_SLOT_NAME`: identifies an ad slot, for example `b1` or `home_b1`.

A test configuration is available before your own setup is ready.

The Google Mobile Ads SDK must be configured with your application ID, or the app crashes on
start: `com.google.android.gms.ads.APPLICATION_ID` in `AndroidManifest.xml` and
`GADApplicationIdentifier` in `Info.plist`.

## Installation

### 1. Add the package

The package is distributed as a tarball from this repository, not through the npm registry.

**npm:** npm 12 and later refuse tarball URLs by default (`EALLOWREMOTE`). Allow the URLs declared
in your own `package.json` by adding this line to the `.npmrc` in your project root:

```ini
allow-remote=root
```

```bash
npm install https://stroeersdk.github.io/react-native/npm/react-native-stroeer-sdk-1.0.0-rc1.tgz
```

**Yarn:**

```bash
yarn add react-native-stroeer-sdk@https://stroeersdk.github.io/react-native/npm/react-native-stroeer-sdk-1.0.0-rc1.tgz
```

Always use the full `https://` URL: without it, npm treats the address as a local file path.

### 2. Android: add the SDK repository

Add the Ströer Maven repository to the repositories of your Android project
(`android/build.gradle` or `android/settings.gradle`):

```groovy
repositories {
    google()
    mavenCentral()

    maven {
        url 'https://stroeersdk.github.io/android/maven'
    }
}
```

### 3. iOS: add the SDK pod

The bridge depends on the `StroeerSDK` pod, which is not on the CocoaPods trunk. Declare it in the
app target of your `ios/Podfile`:

```ruby
pod 'StroeerSDK', :podspec => 'https://stroeersdk.github.io/iOS/CocoaPods/StroeerSDK.podspec'
```

The default `Core` subspec is all the bridge needs. If your app uses the native consent
management (CMP), add the `Consent` subspec:
`:subspecs => ['Core', 'Consent']`.

Then install the pods:

```bash
cd ios && pod install
```

Autolinking adds the native modules on both platforms; no manual linking is needed.

## Basic setup

Call `setApplicationName` once, as early as possible during app start:

```tsx
import { useEffect } from 'react';
import { StroeerSDK } from 'react-native-stroeer-sdk';

export default function App() {
  useEffect(() => {
    StroeerSDK.setApplicationName('APPLICATION_NAME').catch((error) => {
      console.warn('Ströer SDK setup failed', error.code, error.message);
    });
  }, []);

  // ...
}
```

The promise resolves once the setup has started. The configuration is fetched asynchronously; ads
requested before it arrives fail to load.

## Banner example

```tsx
import { StroeerBannerAd } from 'react-native-stroeer-sdk';

<StroeerBannerAd
  publisherSlotName="home_b1"
  onAdLoaded={({ width, height }) => {
    // The banner is ready. Sizes are in dp.
  }}
  onAdFailedToLoad={({ code, message }) => {
    // Handle the loading failure.
  }}
/>
```

- The banner loads when mounted and resizes itself to the creative.
- It reloads when `publisherSlotName`, `contentUrl` or `customTargeting` change in value. To force a
  fresh load, change the React `key`.
- Unmounting destroys the banner; never destroy it yourself.

## Interstitial example

```tsx
import { Button } from 'react-native';
import { useStroeerInterstitial } from 'react-native-stroeer-sdk';

export function ArticleScreen() {
  const interstitial = useStroeerInterstitial('AD_SLOT_ID', {
    onAdDismissed: () => {
      // Continue the app flow.
    },
    onAdFailedToLoad: ({ code, message }) => {
      // Handle the loading failure.
    },
  });

  return (
    <>
      <Button title="Load" onPress={() => interstitial.load().catch(() => {})} />
      <Button
        title="Show"
        disabled={!interstitial.isLoaded}
        onPress={() => interstitial.show().catch(() => {})}
      />
    </>
  );
}
```

- The hook owns its ad and destroys it on unmount, slot change or `destroy()`.
- An ad loads once and shows once; `load()` creates a fresh ad each time.
- Ads expire about one hour after loading: load a new one when an old ad is stale.
- The headless `StroeerInterstitialAd` component and the low-level `StroeerInterstitial` handle are
  described in the [integration manual](docs/1.0/Integration.md#interstitial).

## Rewarded example

```tsx
import { Button } from 'react-native';
import { useStroeerRewarded } from 'react-native-stroeer-sdk';

export function BonusScreen() {
  const rewarded = useStroeerRewarded('AD_SLOT_ID', {
    onUserEarnedReward: ({ type, amount }) => {
      grantReward(type, amount);
    },
  });

  return (
    <>
      <Button title="Load" onPress={() => rewarded.load().catch(() => {})} />
      <Button
        title="Watch ad"
        disabled={!rewarded.isLoaded}
        onPress={() => rewarded.show().catch(() => {})}
      />
    </>
  );
}
```

> **Important:** grant the reward in `onUserEarnedReward` only, never in `onAdDismissed` or after
> `show()` resolves. The reward can arrive after the ad is dismissed.

## Confiant

Initialize Confiant once with your property ID:

```ts
import { StroeerConfiant } from 'react-native-stroeer-sdk';

const running = await StroeerConfiant.initialize('confiantPropertyId', false);
```

The promise resolves `true` when Confiant is running and `false` when it is not activated for your
app. Confiant monitoring does not apply to video ads.

On Android, also add the Confiant Maven repository next to the Ströer one:

```groovy
maven {
    url 'https://cdn.confiant-integrations.net/backend-integrations/in-app/releases/android/maven'
}
```

## Targeting

```ts
import { StroeerSDK } from 'react-native-stroeer-sdk';

// Content currently shown to the user.
StroeerSDK.setContentUrl('https://www.stroeer.de');

// Global targeting, applied to all slots and formats.
StroeerSDK.setGlobalCustomTargeting({
  context: ['sport', 'game', 'technology'],
  user: ['sports', 'technology'],
  section: ['soccer'],
});
```

```tsx
// Per-banner targeting.
<StroeerBannerAd
  publisherSlotName="home_b1"
  customTargeting={{ context: 'sport,game,technology', section: 'soccer' }}
/>
```

Per-banner targeting takes precedence over global targeting and uses comma-separated strings.

## Debugging

```ts
StroeerSDK.enableDebugMode(); // Verbose logging.
StroeerSDK.enableInspectionMode(); // Debug panel and detailed logging.

// Log SDK errors at info level instead of error level.
StroeerSDK.disableErrorLog(true);
```

**Debug panel on device:** press and hold an ad with two or three fingers for three to four
seconds, then tap the debug label in the top-left corner. Double-tap the panel to copy its
contents. Restart the app to leave the mode.

> **Warning:** inspection mode is intended for ad debugging. Do not enable it in production builds.

## Support

Contact your Ströer account manager for onboarding, your production configuration or help with the
integration.
