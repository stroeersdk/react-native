# Ströer SDK for React Native: Integration Manual

This manual covers the setup and the three ad formats of `react-native-stroeer-sdk`: banner,
interstitial and rewarded. It mirrors the [Ströer SDK for Android README](https://github.com/stroeersdk/android/blob/main/README.md).

## Contents

- [Requirements](#requirements)
- [Before you start](#before-you-start)
- [Installation](#installation)
- [Basic setup](#basic-setup)
- [Banner](#banner)
- [Interstitial](#interstitial)
- [Rewarded](#rewarded)
- [Errors](#errors)
- [Targeting](#targeting)
- [Debugging](#debugging)
- [Confiant](#confiant)
- [Migrating to 1.0](#migrating-to-10)
- [Support](#support)

## Requirements

| Component    | Version              |
|--------------|----------------------|
| React Native | 0.82.1+              |
| React        | 19.1.1+              |
| Node         | 20.19.4+             |
| Android      | minSdk 24, Java 17, Kotlin 2.1.20 |
| iOS          | 15.1+, Xcode 16.1+   |

The New Architecture (Fabric, TurboModules) is required. React Native 0.82 removed the legacy
architecture.

> **Platform status:** the banner, interstitial and rewarded APIs described here are implemented
> on Android. The iOS native side is being migrated to the same API.

## Before you start

You need two values from your Ströer account manager:

- `APPLICATION_NAME`: unique identifier of your app.
- `PUBLISHER_SLOT_NAME`: identifies an ad slot, for example `b1` or `home_b1`.

Ask your account manager for a test configuration to try the integration before your own setup is
ready.

The Google Mobile Ads SDK must be configured with your application ID, or the app crashes on
start:

- Android: `com.google.android.gms.ads.APPLICATION_ID` meta-data in `AndroidManifest.xml`
  ([Ad Manager guide](https://developers.google.com/ad-manager/mobile-ads-sdk/android/quick-start)).
- iOS: `GADApplicationIdentifier` in `Info.plist`
  ([Ad Manager guide](https://developers.google.com/ad-manager/mobile-ads-sdk/ios/quick-start#update_your_infoplist)).

## Installation

### 1. Add the package

The package is published on the npm registry as
[`react-native-stroeer-sdk`](https://www.npmjs.com/package/react-native-stroeer-sdk).

**npm:**

```bash
npm install react-native-stroeer-sdk
```

**Yarn:**

```bash
yarn add react-native-stroeer-sdk
```

### 2. Android: add the SDK repository

The native SDK is hosted in the Ströer Maven repository. Add it to the repositories of your
Android project (`android/build.gradle` or `android/settings.gradle`):

```groovy
repositories {
    google()
    mavenCentral()

    maven {
        url 'https://stroeersdk.github.io/android/maven'
    }
}
```

### 3. iOS: install the pods

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

The promise resolves once the setup has **started**. The configuration is then fetched
asynchronously; ads requested before it arrives fail to load.

## Banner

`StroeerBannerAd` is a regular React component. It loads when mounted and resizes itself to the
size of the loaded creative.

```tsx
import { View } from 'react-native';
import { StroeerBannerAd } from 'react-native-stroeer-sdk';

export function HomeScreen() {
  return (
    <View>
      {/* ... */}
      <StroeerBannerAd
        publisherSlotName="home_b1"
        onAdLoaded={({ width, height }) => {
          // The banner is ready. Sizes are in dp.
        }}
        onAdFailedToLoad={({ code, message }) => {
          // Handle the loading failure.
        }}
      />
    </View>
  );
}
```

**Props**

| Prop                | Type                     | Description |
|---------------------|--------------------------|-------------|
| `publisherSlotName` | `string`                 | Required. The ad slot. |
| `contentUrl`        | `string`                 | URL of the content the banner is shown next to. |
| `customTargeting`   | `Record<string, string>` | Per-banner targeting, see [Targeting](#targeting). |
| `style` and other `View` props | |  Applied to the banner view. |

**Events:** `onAdLoaded`, `onAdImpression` (both `{ width, height, publisherSlotName, source }`),
`onAdFailedToLoad` (`{ code, message }`), `onAdOpened`, `onAdClosed`, `onAdClicked`.

**Key points**

- The banner loads on mount and loads again whenever `publisherSlotName`, `contentUrl` or
  `customTargeting` change **in value**. Passing a new but equal targeting object does not reload.
- There is no `load()` or `reload()` method. To force a fresh load with an unchanged config,
  change the React `key` of the component.
- Unmounting destroys the banner. You never destroy it yourself.
- The final size may only be known at impression time: the component applies the size reported
  by both `onAdLoaded` and `onAdImpression`, including after automatic refreshes.
- `onAdFailedToLoad` is also called when an automatic refresh fails. The previous creative stays
  visible in that case.

## Interstitial

Full screen ads are available at three levels. Pick the one that fits your code:

| API                       | Use it when |
|---------------------------|-------------|
| `useStroeerInterstitial`  | Recommended. A hook that owns the ad and exposes its state. |
| `<StroeerInterstitialAd>` | You prefer a headless component controlled with a ref or `autoLoad` / `autoShow`. |
| `StroeerInterstitial`     | Low-level handles outside React components. You manage `destroy()`. |

### Hook

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
      <Button
        title="Load"
        disabled={interstitial.isLoading}
        onPress={() => interstitial.load().catch(() => {})}
      />
      <Button
        title="Show"
        disabled={!interstitial.isLoaded}
        onPress={() => interstitial.show().catch(() => {})}
      />
    </>
  );
}
```

The hook returns:

| Field                  | Description |
|------------------------|-------------|
| `status`               | `'idle' \| 'loading' \| 'loaded' \| 'showing' \| 'dismissed' \| 'failed'` |
| `isLoading`, `isLoaded`| Shortcuts for the status. |
| `error`                | `{ code, message }` of the last failed operation, cleared when a new load starts. |
| `load()`               | Creates a fresh ad and loads it. Rejects while loading or showing. |
| `show()`               | Shows the loaded ad. Rejects unless `status` is `'loaded'`. |
| `isReady()`            | Resolves `true` when the ad can be shown. |
| `destroy()`            | Discards the ad and resets to `'idle'`. |

The ad is destroyed automatically when `destroy()` is called, the slot changes or the component
unmounts.

### Component

```tsx
import { useRef } from 'react';
import {
  StroeerInterstitialAd,
  type StroeerInterstitialAdRef,
} from 'react-native-stroeer-sdk';

export function ArticleScreen() {
  const ref = useRef<StroeerInterstitialAdRef>(null);

  return (
    <StroeerInterstitialAd
      ref={ref}
      publisherSlotName="AD_SLOT_ID"
      autoLoad
      onAdLoaded={() => ref.current?.show()}
      onAdFailedToLoad={({ code, message }) => {
        // Handle the loading failure.
      }}
    />
  );
}
```

The component renders nothing. `autoLoad` loads on mount; `autoShow` shows as soon as the ad is
loaded (once per slot and mount). The ref exposes `load()`, `show()` and `isReady()`. Unmounting
destroys the ad.

### Low-level handle

```ts
import { StroeerInterstitial } from 'react-native-stroeer-sdk';

const ad = await StroeerInterstitial.create('AD_SLOT_ID');
const subscription = ad.subscribe({
  onAdDismissed: async () => {
    subscription.remove();
    await ad.destroy();
  },
});

try {
  await ad.load();
  await ad.show();
} catch (error) {
  subscription.remove();
  await ad.destroy();
}
```

**Key points**

- A handle is **one-shot**: it loads once and shows once. Create a new handle for the next ad.
- Always call `destroy()` on a handle. The native ad is not released before that, not even after
  it was dismissed. The hook and the component do this for you.
- `show()` resolves when the ad is on screen. Dismissal is reported by `onAdDismissed`.
- `show()` rejects with `APP_IN_BACKGROUND` while the app is in the background. The ad stays
  loaded and can be shown after the app resumes.
- Loaded ads expire about one hour after loading. Load a new ad if the old one is stale.

**Events:** `onAdLoaded`, `onAdFailedToLoad`, `onAdShowed`, `onAdDismissed`,
`onAdFailedToShow`, `onAdClicked`, `onAdImpression`.

## Rewarded

Rewarded ads use the same three levels as interstitials, plus the `onUserEarnedReward` event:
`useStroeerRewarded`, `<StroeerRewardedAd>` and `StroeerRewarded`.

### Hook

```tsx
import { Button } from 'react-native';
import { useStroeerRewarded } from 'react-native-stroeer-sdk';

export function BonusScreen() {
  const rewarded = useStroeerRewarded('AD_SLOT_ID', {
    onUserEarnedReward: ({ type, amount }) => {
      grantReward(type, amount);
    },
    onAdFailedToLoad: ({ code, message }) => {
      // Handle the loading failure.
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

The hook returns the same fields as `useStroeerInterstitial`, plus `reward`
(`{ type, amount } | null`), which is reset when a new ad is loaded or the ad is discarded.

### Component

```tsx
<StroeerRewardedAd
  ref={ref}
  publisherSlotName="AD_SLOT_ID"
  autoLoad
  onUserEarnedReward={({ type, amount }) => grantReward(type, amount)}
/>
```

### Low-level handle

```ts
import { StroeerRewarded } from 'react-native-stroeer-sdk';

const ad = await StroeerRewarded.create('AD_SLOT_ID');
const subscription = ad.subscribe({
  onUserEarnedReward: ({ type, amount }) => grantReward(type, amount),
});

await ad.load();
await ad.show(); // Resolves when the ad is presented, before any reward.

// Later, when the owner (for example the screen) goes away:
subscription.remove();
await ad.destroy();
```

> **Important:** grant the reward in `onUserEarnedReward` only, never in `onAdDismissed` or after
> `show()` resolves.

**Key points**

- The reward is delivered at most once per ad. An ad that reports no reward item delivers no
  event.
- The reward can arrive **after** `onAdDismissed`. Keep the handle and its subscription alive until
  the owner goes away; nothing is delivered after `destroy()`.
- A failed load cannot be retried on the same handle. Create a new one; the hook's `load()` does
  this for you.
- Everything else (one-shot handles, `destroy()`, `APP_IN_BACKGROUND`, expiry) works as for
  [interstitials](#interstitial).

## Errors

Rejected promises and failure events carry `{ code, message }`.

| Code                | Meaning |
|---------------------|---------|
| `INVALID_ARGUMENT`  | A blank slot name or malformed input. |
| `LOAD_FAILED`       | The ad could not be loaded (for example no fill). |
| `LOAD_TIMEOUT`      | The load did not finish within 60 seconds. |
| `NOT_READY`         | `show()` was called before the ad was loaded. |
| `INVALID_STATE`     | The operation is not allowed in the current state, for example a second `load()`. |
| `SHOW_FAILED`       | The ad could not be shown. |
| `APP_IN_BACKGROUND` | `show()` was refused because the app is in the background. The ad stays loaded. |
| `NO_ACTIVITY`, `ACTIVITY_LOST` | Android: no foreground Activity, or it went away during the operation. |
| `UNKNOWN_AD`, `DESTROYED` | The handle was destroyed or does not exist. |

Banner failures use `INVALID_ARGUMENT`, `SETUP_FAILED` or `LOAD_FAILED`. A banner without an
Activity is not an error: it waits and loads once one is available.

`describeNativeError(error)` and `formatNativeError(error)` turn any caught error into readable
details for logging.

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

**Notes**

- `user` carries user interests and `context` the page context. Any other key is sent as is.
- Global targeting is merged per key: setting one key does not remove the others.
- Per-banner targeting takes precedence over global targeting and uses comma-separated strings.
- On iOS, call `setContentUrl` after `setApplicationName`.

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

> **Warning:** inspection mode is intended for ad debugging. Do not enable it in production
> builds.

## Confiant

Confiant monitors the quality of the ads served through the Ströer SDK and blocks harmful ones. It
is optional and must be activated for your app: contact your Ströer account manager to enable it
and to get your **Confiant property ID**. Do not reuse a property ID from another app or from an
example.

Once Confiant is initialized, the SDK connects supported ads to it automatically. No code is
needed per ad. Confiant does not monitor video ads.

### 1. Android: add the Confiant module

Add the Confiant Maven repository next to the Ströer repository (in a React Native project, in the
`allprojects` repositories of `android/build.gradle`):

```groovy
maven {
    url 'https://cdn.confiant-integrations.net/backend-integrations/in-app/releases/android/maven'
    content {
        includeGroup 'com.confiant.android'
    }
}
```

Add the Ströer Confiant module and the Confiant SDK to `android/app/build.gradle`:

```groovy
dependencies {
    implementation 'com.stroeer.ads:confiant:1.0.0'
    implementation 'com.confiant.android:sdk:6.1.4'
}
```

Use the same version for `com.stroeer.ads:confiant` as the Ströer Android SDK used by
`react-native-stroeer-sdk`.

### 2. iOS: use the Confiant-enabled podspec

The Confiant SDK is not on the CocoaPods trunk. Add the Confiant source at the top of
`ios/Podfile`, and install `StroeerSDK` from the Confiant-enabled podspec in the app target:

```ruby
source 'https://cdn.cocoapods.org/'
source 'https://cdn.confiant-integrations.net/backend-integrations/in-app/releases/ios/podspecs.git'

target 'YourApp' do
  pod 'StroeerSDK',
      :podspec => 'https://stroeersdk.github.io/iOS/cocoapods/1.0.0/StroeerSDK-Confiant.podspec',
      :subspecs => ['Core', 'Confiant']
  # ...
end
```

Then run `cd ios && pod install`.

- Declare `StroeerSDK` only once. If you also use the SDK's consent module, add `'Consent'` to the
  same `:subspecs` list instead of adding a second `pod 'StroeerSDK'` line.
- Confiant requires the `-ObjC` linker flag. CocoaPods already adds it for React Native apps; keep
  `$(inherited)` in **Build Settings → Other Linker Flags** of the app target.
- **Expo:** apply these changes with a config plugin. The example's
  [`withStroeerSdk`](../../example/expo/plugins/withStroeerSdk.js) plugin adds a plain
  `pod 'StroeerSDK'` line: replace it with the Confiant-enabled declaration above, and add the
  Confiant `source`.

### 3. Initialize Confiant

Initialize Confiant once, after `setApplicationName`:

```tsx
import { useEffect } from 'react';
import { StroeerConfiant, StroeerSDK } from 'react-native-stroeer-sdk';

export default function App() {
  useEffect(() => {
    (async () => {
      try {
        await StroeerSDK.setApplicationName('APPLICATION_NAME');
        const running = await StroeerConfiant.initialize('CONFIANT_PROPERTY_ID', false);
        if (!running) {
          // Confiant is not available or not activated for this app. Ads still load.
        }
      } catch (error) {
        console.warn('Ströer SDK setup failed', error.code, error.message);
      }
    })();
  }, []);

  // ...
}
```

`initialize(confiantPropertyId, enableReload)` resolves `true` when Confiant is running and
`false` when it is not available or not activated. The result is kept: later calls resolve the
same value. It rejects with:

| Code                   | Meaning |
|------------------------|---------|
| `INVALID_ARGUMENT`     | The property ID is blank. |
| `ALREADY_INITIALIZING` | `initialize` was called again while the first call is still running. |
| `INIT_TIMEOUT`         | Confiant did not report a result in time. |
| `INIT_FAILED`          | The native Confiant initialization failed. |
| `MODULE_UNAVAILABLE`   | The native module of the bridge is missing. |

**`enableReload`:** pass `false`. Automatic reloading of blocked ads is currently disabled on
Android because it can crash the app. When it is supported, `true` reloads a blocked ad up to two
times and `false` leaves the slot empty. Use another value only if Ströer tells you to.

### 4. Test mode

Test mode makes Confiant block every ad, so you can check that the integration works. Call
`enableTestMode()` **before** `initialize`; a later call is ignored.

```ts
if (__DEV__) {
  StroeerConfiant.enableTestMode();
}
const running = await StroeerConfiant.initialize('CONFIANT_PROPERTY_ID', false);
```

> **Warning:** never enable test mode in production builds.

### Troubleshooting

- **`initialize` resolves `false`:** check that the native Confiant dependency is installed
  (`com.stroeer.ads:confiant` on Android, the `Confiant` subspec on iOS), that Confiant is activated
  for your app, and that the property ID belongs to this app.
- **`pod install` cannot resolve `ConfiantSDK`:** the Confiant `source` is missing from the
  `Podfile`, or `StroeerSDK` is not installed from the Confiant-enabled podspec.
- **Gradle cannot resolve `com.confiant.android:sdk`:** the Confiant Maven repository is missing.
- **Every ad is blocked:** test mode is enabled.

## Migrating to 1.0

`react-native-stroeer-sdk` 1.0.1 replaces `react-native-yieldlove` 4.3.1. The version number
restarts at 1.0 together with the native StröerSDK. React Native 0.82.1 and the New Architecture
are still required, as in 4.3.x.

### 1. Replace the package

```bash
npm uninstall react-native-yieldlove
npm install react-native-stroeer-sdk
```

Update your imports:

```diff
- import { StroeerSDK, StroeerBannerAd } from 'react-native-yieldlove';
+ import { StroeerSDK, StroeerBannerAd } from 'react-native-stroeer-sdk';
```

### 2. Update the native setup

- **Android:** replace the Yieldlove Maven repository (`slabs-yieldlove-ad-integration.s3...`,
  group `com.yieldlove.adIntegration`) with the Ströer repository from
  [Installation](#2-android-add-the-sdk-repository) (group `com.stroeer.ads`). If you declared
  Yieldlove artifacts yourself, replace them: `com.yieldlove.adIntegration:yieldlove` becomes
  `com.stroeer.ads:core`, and `com.yieldlove.adIntegration:confiant` becomes
  `com.stroeer.ads:confiant`. Jetifier is no longer required.
- **iOS:** the `StroeerSDK` pod replaces `YieldloveAdIntegration`. Remove any
  `YieldloveAdIntegration` entries from your `Podfile`, then run `pod install --repo-update`.
- Rebuild the native app. A JS reload is not enough.

### 3. SDK configuration and targeting

```diff
- StroeerSDK.setApplicationName('your-app-name');
+ await StroeerSDK.setApplicationName('your-app-name');

- StroeerSDK.setUserTargeting(['sports', 'technology']);
- StroeerSDK.setContextTargeting(['sport', 'game']);
- StroeerSDK.setCustomTargeting({ section: ['soccer'] });
+ StroeerSDK.setGlobalCustomTargeting({
+   user: ['sports', 'technology'],
+   context: ['sport', 'game'],
+   section: ['soccer'],
+ });

- const slots = await StroeerSDK.reloadConfigurationAndGetSlotNames('your-app-name');
+ const slots = await StroeerSDK.resetAndLoadConfiguration('your-app-name');
```

- `setContextDataTargeting(...)` keys also move into `setGlobalCustomTargeting`.
- `clearConfigurationCache()` returns a Promise. On Android it no longer clears the app's default
  shared preferences, so consent is kept.
- `getSlotNames()` rejects with `CONFIG_NOT_LOADED` instead of resolving `null`: wrap it in
  `try`/`catch` instead of checking for `null`. `getConfiguration()` resolves `null` when no
  configuration is loaded.

### 4. Banner

```diff
  <StroeerBannerAd
    publisherSlotName="banner_slot"
-   destroyWhenDetached={false}
  />
```

- Remove `destroyWhenDetached`. The banner is destroyed when it unmounts.
- `onAdFailedToLoad` still receives `message`, so existing handlers keep working. It now also
  receives an error `code`.
- The banner reloads when `publisherSlotName`, `contentUrl` or `customTargeting` change in value.
  To force a reload, change the React `key`. Keep `customTargeting` stable (define it outside the
  component or memoize it), or the banner reloads on every render.
- `onAdImpression` receives the same `{ width, height, publisherSlotName, source }` payload as
  `onAdLoaded`.

### 5. Interstitial and rewarded

`StroeerInterstitial` and `StroeerRewarded` used to be single shared objects. They now create ad
handles. `setLoadAfterReady`, `setListeners` and `removeAllListeners` are removed, and ads never
show automatically after loading.

```diff
- StroeerInterstitial.setListeners({ onAdDismissed: () => {} });
- await StroeerInterstitial.load('interstitial_slot');
- await StroeerInterstitial.show();
- StroeerInterstitial.removeAllListeners();
+ const ad = await StroeerInterstitial.create('interstitial_slot');
+ const sub = ad.subscribe({ onAdDismissed: () => {} });
+ await ad.load();
+ await ad.show();
+ sub.remove();
+ await ad.destroy();
```

- A handle loads once and shows once. Create a new handle for the next ad, and always call
  `destroy()`. See [Low-level handle](#low-level-handle).
- `onAdFailedToLoad` and `onAdFailedToShow` receive `{ code, message }` instead of a string:

  ```diff
  - onAdFailedToLoad: (error) => console.warn(error),
  + onAdFailedToLoad: ({ code, message }) => console.warn(code, message),
  ```
- The hooks take listeners as an optional second argument. `checkReady()` is replaced by
  `isReady()` (or `isLoaded`), and `load()` always creates a fresh ad:

  ```diff
  - const ad = useStroeerInterstitial('interstitial_slot');
  + const ad = useStroeerInterstitial('interstitial_slot', { onAdDismissed: () => {} });
  ```
- `StroeerInterstitialAd` and `StroeerRewardedAd` keep their props (`autoLoad`, `autoShow`,
  listeners) and can also be controlled through a ref (`load`, `show`, `isReady`). Several
  components and hooks can coexist without replacing each other's listeners.
- Rewarded: deliver rewards from `onUserEarnedReward`, which can fire after `onAdDismissed`. Keep
  the handle alive until then.

### 6. Identity

The per-field setters and `apply()` are replaced by one `setCustomInfo` call:

```diff
- StroeerIdentity.setEmail('user@example.com');
- StroeerIdentity.setPhone('+49301234567');
- StroeerIdentity.setPuid('user-1234');
- StroeerIdentity.setRegionCode(regionCode);
- StroeerIdentity.setCityCode(cityCode);
- StroeerIdentity.apply();
+ StroeerIdentity.setCustomInfo({
+   email: 'user@example.com',
+   phone: '+49301234567',
+   puid: 'user-1234',
+   regionCode,
+   cityCode,
+ });
```

Pass only the fields you have. Every `setCustomInfo` call is applied at once, and values that were
already applied are kept when a later call leaves them out.

### 7. Confiant

The `initialize(propertyId, enableReload)` signature is unchanged. It now settles only once: a
second call while the first one runs rejects with `ALREADY_INITIALIZING`. See [Confiant](#confiant)
for the native setup.

### 8. Errors and test tooling

- All rejections and failure events are `{ code, message }`. A missing native module rejects with
  `MODULE_UNAVAILABLE` instead of a generic error. See [Errors](#errors).
- `IabTestConsent` is no longer exported. It was test tooling: write test consent in your app
  instead.

For the complete list of changes, see the [release notes](../ReleaseNotes.md).

## Support

Contact your Ströer account manager for onboarding, your production configuration or help with
the integration.
