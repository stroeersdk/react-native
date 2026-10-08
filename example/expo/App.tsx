import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import {
  StroeerBannerAd,
  StroeerSDK,
  formatNativeError,
  useStroeerInterstitial,
  useStroeerRewarded,
} from 'react-native-stroeer-sdk';
import type {
  StroeerBannerAdListeners,
  StroeerInterstitialListeners,
  StroeerRewardedListeners,
} from 'react-native-stroeer-sdk';
import { useConsent } from './src/useConsent';
import { useNotifier } from './src/useNotifier';

// The slot names and the application name below are test configuration. Use your own.
const APPLICATION_NAME = 'appTest';
const BANNER_SLOT = 'b1'; // 'banner', 'banner2' and 'banner3' work as well
const INTERSTITIAL_SLOT = 'interstitial';
const REWARDED_SLOT = 'rewarded';

// Local targeting of the banner, merged with the global targeting set in the init effect.
// Defined outside the component: the banner reloads when the targeting changes in value.
const BANNER_TARGETING = {
  context: 'localContext',
  user: 'localUser',
  section: 'localCustomValue, localCustomValue2',
};

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <Example />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function Example() {
  const { events, notify } = useNotifier();
  const consent = useConsent(notify);

  // The banner is rendered only after setApplicationName() resolved.
  const [sdkReady, setSdkReady] = useState(false);
  // Changing the key remounts the banner, which loads a fresh ad ("Reload Banner").
  const [bannerKey, setBannerKey] = useState(0);

  // Initialize the Stroeer SDK once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await StroeerSDK.setApplicationName(APPLICATION_NAME);

        if (__DEV__) {
          // Additional logs for debugging, and the debug panel (see README).
          // Inspection mode must be enabled after setApplicationName().
          StroeerSDK.enableDebugMode();
          StroeerSDK.enableInspectionMode();
        }

        // Global targeting applies to all ads. Values are lists of strings.
        StroeerSDK.setGlobalCustomTargeting({
          context: ['sports', 'entertainment'],
          user: ['sports', 'technology', 'music', 'New York'],
          section: ['soccer'],
        });
        StroeerSDK.setContentUrl('https://www.example.com/article/12345');

        // Confiant is not enabled in this example. Inquire with Ströer to use it:
        // await StroeerConfiant.enableTestMode();
        // await StroeerConfiant.initialize('<accountId>', true);

        if (!cancelled) {
          setSdkReady(true);
        }
      } catch (error) {
        notify(`SDK init failed: ${formatNativeError(error)}`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notify]);

  const bannerListeners = useMemo<StroeerBannerAdListeners>(
    () => ({
      onAdLoaded: () => notify('Ad loaded'),
      onAdFailedToLoad: error => notify(`Ad load failed: ${error.message}`),
      onAdOpened: () => notify('Ad opened'),
      onAdClosed: () => notify('Ad closed'),
      onAdClicked: () => notify('Ad clicked'),
      onAdImpression: () => notify('Ad impression'),
    }),
    [notify],
  );

  // Full screen ads: load() creates a fresh ad, and we show it as soon as it is loaded.
  // The hook discards the previous ad on every load() and on unmount, so no cleanup is needed.
  const interstitialListeners: StroeerInterstitialListeners = {
    onAdLoaded: () => {
      // show() failures are reported through onAdFailedToShow below.
      interstitial.show().catch(() => {});
    },
    onAdFailedToLoad: error => notify(`Interstitial load failed: ${error.message}`),
    onAdShowed: () => notify('Interstitial shown'),
    onAdFailedToShow: error => notify(`Interstitial failed to show: ${error.message}`),
    onAdDismissed: () => notify('Interstitial dismissed'),
    onAdImpression: () => notify('Interstitial impression'),
    onAdClicked: () => notify('Interstitial clicked'),
  };
  const interstitial = useStroeerInterstitial(INTERSTITIAL_SLOT, interstitialListeners);

  const rewardedListeners: StroeerRewardedListeners = {
    onAdLoaded: () => {
      rewarded.show().catch(() => {});
    },
    onAdFailedToLoad: error => notify(`Rewarded load failed: ${error.message}`),
    onUserEarnedReward: reward => {
      // Grant the reward to the user here.
      notify(`Reward earned: ${reward.amount} ${reward.type}`);
    },
    onAdShowed: () => notify('Rewarded shown'),
    onAdFailedToShow: error => notify(`Rewarded failed to show: ${error.message}`),
    onAdDismissed: () => notify('Rewarded dismissed'),
    onAdImpression: () => notify('Rewarded impression'),
    onAdClicked: () => notify('Rewarded clicked'),
  };
  const rewarded = useStroeerRewarded(REWARDED_SLOT, rewardedListeners);

  // load() rejects while an ad is loading or showing. Failures of an actual load are already
  // reported through onAdFailedToLoad, so the rejection itself is ignored here.
  const loadInterstitial = () => interstitial.load().catch(() => {});
  const loadRewarded = () => rewarded.load().catch(() => {});

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.title}>Ströer SDK React Native example</Text>

      <View style={styles.bannerContainer}>
        {sdkReady ? (
          <StroeerBannerAd
            key={bannerKey}
            publisherSlotName={BANNER_SLOT}
            customTargeting={BANNER_TARGETING}
            {...bannerListeners}
          />
        ) : (
          <Text style={styles.note}>Initializing SDK...</Text>
        )}
      </View>

      <View style={styles.buttons}>
        <Button
          title="Reload Banner"
          disabled={!sdkReady}
          onPress={() => setBannerKey(key => key + 1)}
        />
        <Button
          title="Interstitial"
          disabled={!sdkReady || interstitial.isLoading}
          onPress={loadInterstitial}
        />
        <Button
          title="Rewarded"
          disabled={!sdkReady || rewarded.isLoading}
          onPress={loadRewarded}
        />
        <Button title="Consent" disabled={!consent.available} onPress={consent.collect} />
        <Button title="Privacy" disabled={!consent.available} onPress={consent.showPrivacy} />
        <Button title="Remove Consent" disabled={!consent.available} onPress={consent.clear} />
      </View>
      {!consent.available && (
        <Text style={styles.note}>Consent module not available in this SDK build</Text>
      )}

      <Text style={styles.logTitle}>Events</Text>
      {events.length === 0 && <Text style={styles.note}>No events yet</Text>}
      {events.map((event, index) => (
        <Text key={`${index}-${event}`} style={styles.logLine}>
          {event}
        </Text>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  content: { padding: 16 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 16 },
  bannerContainer: {
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  buttons: { gap: 8 },
  note: { color: '#666666', marginTop: 8 },
  logTitle: { fontSize: 16, fontWeight: '600', marginTop: 24, marginBottom: 4 },
  logLine: { fontFamily: 'Courier', fontSize: 12, color: '#222222' },
});

export default App;
