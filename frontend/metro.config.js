const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure binary files are handled properly
config.resolver.assetExts.push('db');
config.resolver.assetExts.push('wasm');

// Resolve expo-sqlite's wasm-based web implementation correctly.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
