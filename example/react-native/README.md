# Ströer SDK React Native example

Port of the Android example (`MainActivity.java`) to React Native 0.82.1 (New Architecture) using
`react-native-stroeer-sdk` 1.0.0-rc1. It shows a banner, an interstitial and a rewarded ad, the
consent buttons, and an on-screen event log (plus `ToastAndroid` on Android).

An Expo (prebuild) version of this app lives in [`../expo`](../expo/README.md).

## Prerequisites

- Node >= 20, npm (use npm/npx; Yarn is not set up here)
- JDK 17+, Android SDK (platform 36), an emulator or device
- The [React Native environment setup](https://reactnative.dev/docs/set-up-your-environment)

## Install

```sh
npm install
```

The SDK is installed from its tarball URL,
https://stroeersdk.github.io/react-native/npm/react-native-stroeer-sdk-1.0.0-rc1.tgz. npm 12 and
later refuse tarball URLs by default (`EALLOWREMOTE`), so this project has a `.npmrc` with
`allow-remote=root`, which allows URLs declared in this project's own `package.json`.

## Run on Android

```sh
npm start            # Metro on 8081 (or: npx react-native start --port 8082)
npm run android      # (or: npx react-native run-android --port 8082)
```

## Native setup already done (Android)

- `android/build.gradle`: minSdk 26, compile/target SDK 36, Maven repositories for
  `com.stroeer.ads` (https://stroeersdk.github.io/android/maven) and `com.confiant.android`.
- `AndroidManifest.xml`: `com.google.android.gms.ads.APPLICATION_ID` set to Google's test AdMob ID.
- `newArchEnabled=true`.

## Custom settings (everything changed from the React Native 0.82.1 template)

| Setting | Value | File | Why |
| --- | --- | --- | --- |
| `minSdkVersion` | 26 (template: 24) | `android/build.gradle` | Same as the Android example |
| `compileSdkVersion` / `targetSdkVersion` | 36 | `android/build.gradle` | Same as the Android example |
| Maven repo | `https://stroeersdk.github.io/android/maven` (`includeGroup("com.stroeer.ads")`) | `android/build.gradle` (`allprojects`) | Where the Android SDK is published |
| Maven repo | `https://cdn.confiant-integrations.net/backend-integrations/in-app/releases/android/maven` (`includeGroup("com.confiant.android")`) | `android/build.gradle` (`allprojects`) | Optional Confiant module of the SDK |
| `com.google.android.gms.ads.APPLICATION_ID` | `ca-app-pub-3940256099942544~3347511713` (Google test ID) | `android/app/src/main/AndroidManifest.xml` | Required by the Google Mobile Ads SDK. Use your own |
| `react-native-stroeer-sdk` | `https://stroeersdk.github.io/react-native/npm/react-native-stroeer-sdk-1.0.0-rc1.tgz` | `package.json` | The SDK is distributed as a tarball, not via the npm registry |
| `allow-remote` | `root` | `.npmrc` | npm 12+ refuses tarball URLs by default (`EALLOWREMOTE`) |
| `@react-native/new-app-screen` | removed | `package.json` | Template welcome screen is not used |
| Jest mock of the SDK | virtual stub module | `__tests__/App.test.tsx` | Native modules do not exist in Jest |
| Debug / inspection mode | enabled in `__DEV__` builds only, after `setApplicationName()` | `App.tsx` | The Android example enables them unconditionally |

## Test configuration

Application name `appTest`; banner slot `b1` (`banner`, `banner2`, `banner3` also work),
`interstitial`, `rewarded`. Replace them with your own.

## Consent caveat

The Android consent bridge is disabled in 1.0.0-rc1. `StroeerConsentModule.isAvailable()` returns
false there, so the Consent / Privacy / Remove Consent buttons are disabled with a note.

## Debug panel

In debug builds the app calls `enableInspectionMode()`. Press and hold an ad with two or three
fingers for three to four seconds, then tap the debug label in the top-left corner. Double-tap the
panel to copy its contents. Never enable inspection mode in production.

## iOS (not yet configured or verified in this example)

The `ios/` folder is the unmodified template. To integrate, you would need:

- Podfile: `pod 'StroeerSDK', :podspec => 'https://stroeersdk.github.io/iOS/cocoapods/StroeerSDK.podspec', :subspecs => ['Core']`
  (lowercase `cocoapods`; the casing `CocoaPods` in the package README returns 404)
- `GADApplicationIdentifier` in `Info.plist`
- iOS deployment target 15.1, then `pod install`

## Troubleshooting

If you see "AsyncStorage is null" or another app's code appears, another Metro server is running
on port 8081. Stop it or use `--port` (e.g. `npx react-native start --port 8082` and
`npx react-native run-android --port 8082`).
