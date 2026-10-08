/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

// The SDK needs its native modules, which do not exist in Jest: replace it with a stub.
// (virtual: the package's "exports" map has no entry Jest's react-native condition can resolve.)
jest.mock(
  'react-native-stroeer-sdk',
  () => {
    const { View } = require('react-native');
    const loadable = () => ({
      isLoading: false,
      load: jest.fn(() => Promise.resolve()),
      show: jest.fn(() => Promise.resolve()),
    });
    return {
      StroeerSDK: {
        enableDebugMode: jest.fn(),
        enableInspectionMode: jest.fn(),
        setApplicationName: jest.fn(() => Promise.resolve()),
        setGlobalCustomTargeting: jest.fn(),
        setContentUrl: jest.fn(),
      },
      StroeerConsentModule: { isAvailable: jest.fn(() => Promise.resolve(false)) },
      StroeerBannerAd: View,
      useStroeerInterstitial: jest.fn(loadable),
      useStroeerRewarded: jest.fn(loadable),
      formatNativeError: String,
    };
  },
  { virtual: true },
);

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
