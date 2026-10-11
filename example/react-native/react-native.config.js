// Workaround for react-native-stroeer-sdk 1.0.0: its package.json "exports" field is invalid, so
// React Native's iOS codegen cannot resolve the package and skips it. The banner component
// (StroeerBannerView) is then not registered on iOS and never loads. Pointing codegen at the
// package directory here makes it read the package directly. Remove once the SDK is fixed.
const path = require('path');

module.exports = {
  dependencies: {
    'react-native-stroeer-sdk': {
      root: path.join(__dirname, 'node_modules/react-native-stroeer-sdk'),
    },
  },
};
