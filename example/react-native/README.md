# Ströer SDK React Native example

A React Native 0.82.1 (New Architecture) app that integrates `react-native-stroeer-sdk` 1.0.0 on
Android and iOS. It shows:

- a banner ad, with local and global custom targeting,
- an interstitial ad and a rewarded ad, shown as soon as they are loaded,
- an on-screen event log of all ad callbacks (plus a `ToastAndroid` on Android).

The app runs out of the box with a Ströer test configuration. Use it as a reference for your own
integration; the full API is described in the [integration manual](../../docs/1.0/Integration.md).

An Expo (prebuild) version of this app lives in [`../expo`](../expo/README.md).

## Requirements

- Node 20.19.4+ and npm (use npm/npx; Yarn is not set up in this project)
- The [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment)
- Android: JDK 17+, Android SDK (platform 36), an emulator or device
- iOS: Xcode with an iOS 15.1+ simulator or device, CocoaPods

## Install

```sh
npm install
```

The SDK is installed from its tarball URL,
https://stroeersdk.github.io/react-native/npm/react-native-stroeer-sdk-1.0.0.tgz. npm 12 and
later refuse tarball URLs by default (`EALLOWREMOTE`), so this project has a `.npmrc` with
`allow-remote=root`, which allows URLs declared in this project's own `package.json`.

## Run on Android

```sh
npm start            # Metro on port 8081
npm run android
```

To use another Metro port: `npx react-native start --port 8082` and
`npx react-native run-android --port 8082`.

## Run on iOS

```sh
cd ios && pod install && cd ..
npm start
npm run ios
```

Or open `ios/StroeerExample.xcworkspace` in Xcode (the `.xcworkspace`, not the `.xcodeproj`).

> **Before running on iOS**
> - Select your own signing team in Xcode (target `StroeerExample` > Signing & Capabilities).
> - To see test ads on a physical device, replace the test device ID in
>   `ios/StroeerExample/AppDelegate.swift` with your device's ID. The Google Mobile Ads SDK prints
>   the ID of the current device in the Xcode console on the first ad request.

## Test configuration

The app uses Ströer test values. Replace them with the values from your Ströer account manager
before you go live.

| Value | Test value | File |
| --- | --- | --- |
| Application name | `appTest` | `App.tsx` (`APPLICATION_NAME`) |
| Banner slot | `b2` | `App.tsx` (`BANNER_SLOT`) |
| Interstitial slot | `interstitial` | `App.tsx` (`INTERSTITIAL_SLOT`) |
| Rewarded slot | `rewarded` | `App.tsx` (`REWARDED_SLOT`) |
| Google Mobile Ads app ID (Android) | `ca-app-pub-3940256099942544~3347511713` | `android/app/src/main/AndroidManifest.xml` |
| Google Mobile Ads app ID (iOS) | `ca-app-pub-3940256099942544~1458002511` | `ios/StroeerExample/Info.plist` (`GADApplicationIdentifier`) |
| Test device ID (iOS) | `dd12616ea20c86a865bb874099ad2f1b` | `ios/StroeerExample/AppDelegate.swift` |

The Google Mobile Ads app IDs are Google's public test IDs. The app crashes at startup without an
app ID, so always set your own.

## Using the app

- **Reload Banner** remounts the banner, which loads a new ad.
- **Interstitial** / **Rewarded** load the ad and show it as soon as it is loaded.

The buttons are disabled (gray) until the SDK has been initialized, and while an interstitial or
rewarded ad is loading. Every ad callback is written to the **Events** log below the buttons.

### Where to look in the code

| What | Where |
| --- | --- |
| SDK initialization (`setApplicationName`, debug mode, global targeting, content URL) | `App.tsx`, init `useEffect` |
| Banner with local targeting and listeners | `App.tsx`, `<StroeerBannerAd>` |
| Interstitial and rewarded ads | `App.tsx`, `useStroeerInterstitial` / `useStroeerRewarded` |
| Event log and toasts | `src/useNotifier.ts` |

## Consent

Consent management (Consent / Privacy / Remove Consent) is not part of this example yet and will be
added in a later version. `src/useConsent.ts` is kept for that purpose but is not used by the app.

## Debug panel

In debug builds (`__DEV__`) the app calls `enableDebugMode()` and `enableInspectionMode()`, after
`setApplicationName()`. Press and hold an ad with two or three fingers for three to four seconds,
then tap the debug label in the top-left corner. Double-tap the panel to copy its contents. Never
enable inspection mode in production.

## Project setup

Everything changed from the React Native 0.82.1 template. Apply the same changes to your own app.

### Android

| Setting | Value | File | Why |
| --- | --- | --- | --- |
| `minSdkVersion` | 26 (template: 24) | `android/build.gradle` | Same as the native Android example (the SDK needs 24+) |
| `compileSdkVersion` / `targetSdkVersion` | 36 | `android/build.gradle` | Same as the native Android example |
| Maven repo | `https://stroeersdk.github.io/android/maven` (`includeGroup("com.stroeer.ads")`) | `android/build.gradle` (`allprojects`) | Where the Android SDK is published |
| Maven repo | `https://cdn.confiant-integrations.net/backend-integrations/in-app/releases/android/maven` (`includeGroup("com.confiant.android")`) | `android/build.gradle` (`allprojects`) | Optional Confiant module of the SDK |
| `com.google.android.gms.ads.APPLICATION_ID` | Google test ID | `android/app/src/main/AndroidManifest.xml` | Required by the Google Mobile Ads SDK. Use your own |
| `newArchEnabled` | `true` | `android/gradle.properties` | The SDK requires the New Architecture |

### iOS

| Setting | Value | File | Why |
| --- | --- | --- | --- |
| `pod 'StroeerSDK'` | subspecs `Core`, `Consent` | `ios/Podfile` | Native iOS SDK. `Core` is enough if you do not use the SDK's consent module |
| `CLANG_CXX_LANGUAGE_STANDARD` for the `fmt` pod | `c++17` | `ios/Podfile` (`post_install`) | fmt 11.0.2, bundled with React Native 0.82, does not compile with the Xcode 26 clang in C++20 mode |
| `GADApplicationIdentifier` | Google test ID | `ios/StroeerExample/Info.plist` | Required by the Google Mobile Ads SDK. Use your own |
| `RCTNewArchEnabled` | `true` | `ios/StroeerExample/Info.plist` | The SDK requires the New Architecture |
| `testDeviceIdentifiers` | test device ID | `ios/StroeerExample/AppDelegate.swift` | Shows test ads on that device. Remove in production |
| Privacy manifest | `UserDefaults`, `SystemBootTime`, `DiskSpace`, `FileTimestamp` | `ios/StroeerExample/PrivacyInfo.xcprivacy` | Required-reason APIs declared for App Store submission |

### JavaScript

| Setting | Value | File | Why |
| --- | --- | --- | --- |
| `react-native-stroeer-sdk` | tarball URL (see [Install](#install)) | `package.json` | The SDK is distributed as a tarball, not through the npm registry |
| `allow-remote` | `root` | `.npmrc` | npm 12+ refuses tarball URLs by default (`EALLOWREMOTE`) |
| Codegen root of `react-native-stroeer-sdk` | `node_modules/react-native-stroeer-sdk` | `react-native.config.js` | **Required on iOS with SDK 1.0.0**, see below |
| `@react-native/new-app-screen` | removed | `package.json` | The template welcome screen is not used |
| Jest mock of the SDK | virtual stub module | `__tests__/App.test.tsx` | Native modules do not exist in Jest |

#### iOS banner workaround (`react-native.config.js`)

With `react-native-stroeer-sdk` 1.0.0, React Native's iOS codegen cannot resolve the package, so
the banner component is not registered and banners never load on iOS. Add this
`react-native.config.js` to the root of your app, then run `pod install` again:

```js
const path = require('path');

module.exports = {
  dependencies: {
    'react-native-stroeer-sdk': {
      root: path.join(__dirname, 'node_modules/react-native-stroeer-sdk'),
    },
  },
};
```

## Troubleshooting

- **`Unable to open base configuration reference file '.../Pods-StroeerExample.debug.xcconfig'`**:
  `pod install` has not run, or the `.xcodeproj` was opened instead of the `.xcworkspace`.
- **Banner never loads on iOS**: check that `react-native.config.js` is present and run
  `pod install` again.
- **`EALLOWREMOTE` during `npm install`**: the `.npmrc` with `allow-remote=root` is missing.
- **Stale builds**: `../clean-build.sh react-native [android|ios]` removes `node_modules`, Pods and
  build outputs, reinstalls everything and builds the app. Run it with `--help` for the options.
