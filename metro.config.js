// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.alias = {
    '@react-native-async-storage/async-storage': require.resolve(
        '@react-native-async-storage/async-storage/src/AsyncStorage.native.ts'
    ),
}

module.exports = config;
