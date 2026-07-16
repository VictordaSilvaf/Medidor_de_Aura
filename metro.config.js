const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');
const { withRozenite } = require('@rozenite/metro');

const config = getDefaultConfig(__dirname);

module.exports = withRozenite(withNativewind(config), {
  enabled: process.env.WITH_ROZENITE === 'true',
  include: [
    '@rozenite/network-activity-plugin',
    '@rozenite/performance-monitor-plugin',
    '@rozenite/react-navigation-plugin',
    '@rozenite/redux-devtools-plugin',
    '@rozenite/storage-plugin',
  ],
});
