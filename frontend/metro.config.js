const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Ensure binary files are handled properly
config.resolver.assetExts.push('db');
config.resolver.assetExts.push('wasm');

// On web, expo-sqlite's SQLite Worker unconditionally instantiates the
// OPFS-backed AccessHandlePoolVFS even for ':memory:' databases. Its
// per-origin exclusive OPFS file locks make the 2nd+ simultaneously-open tab
// fail to start its worker, surfacing as "Database Error". This app only uses
// ':memory:' databases on web, so redirect AccessHandlePoolVFS to an
// in-memory implementation (see src/web/accessHandlePoolVfsShim.js).
const accessHandlePoolVfsShim = path.resolve(
  __dirname,
  'src/web/accessHandlePoolVfsShim.js'
);
// expo-sqlite's package.json "exports" map does not expose web/wa-sqlite/*
// paths, so resolve the shim's MemoryVFS import to the physical file
// (bypassing package-exports enforcement) rather than relying on node_modules
// layout via relative paths.
const memoryVfsPath = path.join(
  __dirname,
  'node_modules/expo-sqlite/web/wa-sqlite/MemoryVFS.js'
);

// Resolve expo-sqlite's wasm-based web implementation correctly.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (moduleName.endsWith('wa-sqlite/AccessHandlePoolVFS')) {
      return { type: 'sourceFile', filePath: accessHandlePoolVfsShim };
    }
    if (moduleName === 'expo-sqlite/web/wa-sqlite/MemoryVFS') {
      return { type: 'sourceFile', filePath: memoryVfsPath };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
