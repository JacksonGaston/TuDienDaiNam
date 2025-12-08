const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure binary files are handled properly
config.resolver.assetExts.push('db');

module.exports = config;