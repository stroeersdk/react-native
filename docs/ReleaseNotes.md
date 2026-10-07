# Ströer SDK for React Native

The Ströer SDK helps publishers integrate banner, interstitial, and rewarded ads into React Native applications on Android and iOS. Optional modules add consent management (CMP), identity, and ad-quality protection with Confiant.

npm package: `react-native-stroeer-sdk`

### Release Notes [1.0.0] (07.Oct.2026)

#### New
- Rebranded the SDK as StröerSDK.
- Changed the package name to `com.stroeer.ads`. (Android)
- Updated the library repository: GitHub – StröerSDK Android. (Android)
- Added a Jetpack Compose wrapper (`com.stroeer.compose`). (Android)
- Configuration is now revalidated using an ETag instead of being re-downloaded on every refresh. (Android)
- The React Native bridge is now built for the New Architecture only (React Native 0.82): every module is a codegen TurboModule and the banner is a Fabric component.
- Interstitial and rewarded ads are now ad handles (`create` → `load` → `show` → `destroy`). Several ads can be loaded at the same time, and hooks and components each own their ad, so they no longer replace each other's listeners.
- Every banner, interstitial and rewarded event is logged by the native SDK. (Android)

#### Fixed
- Corrected the precedence of key-values and `contentUrl` for GAM. Key-values from remote configuration are now also included in Prebid requests. (Android)
- Ad size is now rechecked at impression time, as the size of some banners is determined only when the impression occurs. (Android)
- The SDK no longer adds an app-name label to the merged manifest. (Android)
- Banner: `onAdLoaded` is no longer lost when an impression follows immediately, and every load failure is now reported to `onAdFailedToLoad`.
- Interstitial and rewarded ads no longer show automatically after loading, and `show()` now resolves once the ad is actually presented.
- Rewarded: loading again after a failed load works, and a reward that arrives after the ad is dismissed is still delivered.
- `clearConfigurationCache()` no longer clears the app's default shared preferences (including consent); it now only requests a fresh configuration.
- User and context targeting is now sent to Prebid in the correct place; GAM receives the same key-values as before.
- Release JS bundling of the example app works again in the monorepo.
- Fixed various minor bugs.

#### Changed
- The SDK version reported to GAM and Prebid now follows the new versioning scheme (major + 20). (Android)
- Removed the OkHttp dependency. (Android)
- SDK libraries are now obfuscated. (Android)
- Updated third-party library versions (Android):
  - Prebid Mobile: 3.3.4
  - SourcePoint: 7.15.13
  - Google Mobile Ads SDK: 24.6.0 (publishers can upgrade to a later version)
  - Kotlin: 2.1.0 (publishers can upgrade to a later version)
- Errors are now reported as `{ code, message }`. A missing native module is reported with the code `MODULE_UNAVAILABLE`.
- Jetifier is no longer required. (Android)

#### Breaking changes (React Native API)
- **Banner (`StroeerBannerAd`)**: loading is driven by props. It reloads when `publisherSlotName`, `contentUrl` or `customTargeting` change in value; change the React `key` to force a reload. `onAdFailedToLoad` receives `{ code, message }`. The `destroyWhenDetached` prop is removed.
- **Interstitial and rewarded**: use `const ad = await StroeerInterstitial.create(slot)` (or `StroeerRewarded.create(slot)`), then `ad.subscribe(...)`, `ad.load()`, `ad.show()` and `ad.destroy()`. `setLoadAfterReady`, `setListeners` and `removeAllListeners` are removed. `useStroeerInterstitial` / `useStroeerRewarded` and the `StroeerInterstitialAd` / `StroeerRewardedAd` components (controlled through a ref) are kept on the new API.
- **StroeerSDK**:
  - `setUserTargeting`, `setContextTargeting`, `setContextDataTargeting` and `setCustomTargeting` are replaced by `setGlobalCustomTargeting({ user: [...], context: [...], <key>: [...] })`.
  - `reloadConfigurationAndGetSlotNames` is renamed to `resetAndLoadConfiguration`.
  - `setApplicationName` and `clearConfigurationCache` return Promises.
  - `getSlotNames` rejects with `CONFIG_NOT_LOADED` instead of resolving `null`, and `getConfiguration` resolves `null` when no configuration is loaded.
- **StroeerIdentity**: `setEmail`, `setPhone`, `setPuid`, `setRegionCode`, `setCityCode` and `apply` are replaced by `setCustomInfo({ email, phone, puid, regionCode, cityCode })`.
- **StroeerConfiant**: `initialize` resolves only once; a second call while it is running rejects with `ALREADY_INITIALIZING`.
- **IabTestConsent** is removed from the library
