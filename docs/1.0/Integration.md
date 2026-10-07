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

## Support

Contact your Ströer account manager for onboarding, your production configuration or help with
the integration.
