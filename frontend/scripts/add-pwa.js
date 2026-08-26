#!/usr/bin/env node

/**
 * Post-export step that turns the Expo web export in dist/ into a full PWA.
 *
 * 1. Walks dist/ and builds the service-worker precache manifest.
 * 2. Generates dist/sw.js from pwa/sw-source.js (cache name is a content hash,
 *    so every deploy invalidates the old cache).
 * 3. Copies pwa/manifest.webmanifest, pwa/icons/, pwa/_headers into dist/.
 * 4. Injects manifest link, theme-color, iOS meta tags and the SW
 *    registration snippet into dist/index.html (idempotent via markers).
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const pwaDir = path.join(root, 'pwa');

const INJECT_START = '<!-- PWA-INJECT -->';
const INJECT_END = '<!-- /PWA-INJECT -->';

function walk(dir, baseDir = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, baseDir, out);
    } else {
      out.push(path.relative(baseDir, fullPath).split(path.sep).join('/'));
    }
  }
  return out;
}

function buildInjectBlock() {
  return [
    INJECT_START,
    '<link rel="manifest" href="/manifest.webmanifest" />',
    '<meta name="theme-color" content="#007AFF" />',
    '<meta name="mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
    '<meta name="apple-mobile-web-app-title" content="Tu Dien Dai Nam" />',
    '<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />',
    '<script>',
    "if ('serviceWorker' in navigator) {",
    "  window.addEventListener('load', function () {",
    "    navigator.serviceWorker.register('/sw.js').catch(function () {});",
    '  });',
    '}',
    '</script>',
    INJECT_END,
  ].join('\n');
}

function injectIntoIndexHtml(html) {
  const block = buildInjectBlock();
  const startIdx = html.indexOf(INJECT_START);
  if (startIdx !== -1) {
    const endIdx = html.indexOf(INJECT_END, startIdx);
    if (endIdx !== -1) {
      return (
        html.slice(0, startIdx) +
        block +
        html.slice(endIdx + INJECT_END.length)
      );
    }
  }
  const headIdx = html.indexOf('<head>');
  if (headIdx === -1) {
    throw new Error('dist/index.html has no <head> tag to inject into');
  }
  return html.slice(0, headIdx + '<head>'.length) + '\n' + block + html.slice(headIdx + '<head>'.length);
}

function main() {
  const indexHtmlPath = path.join(dist, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    console.error(
      `dist/index.html not found. Run the web export first:\n` +
        `  npx expo export --platform web`
    );
    process.exit(1);
  }

  // Copy static PWA files BEFORE walking dist/, so icons end up precached too.
  fs.copyFileSync(
    path.join(pwaDir, 'manifest.webmanifest'),
    path.join(dist, 'manifest.webmanifest')
  );
  fs.copyFileSync(path.join(pwaDir, '_headers'), path.join(dist, '_headers'));
  fs.cpSync(path.join(pwaDir, 'icons'), path.join(dist, 'icons'), { recursive: true });

  // Collect precache URLs from everything currently in dist/ except runtime files.
  const files = walk(dist).filter(
    (rel) => rel !== 'sw.js' && rel !== '_headers' && rel !== 'manifest.webmanifest'
  );
  files.sort();
  const precacheUrls = ['/', ...files.map((rel) => '/' + rel)];

  const cacheName =
    'tuidiendainam-' +
    crypto
      .createHash('sha256')
      .update(files.join('\n'))
      .digest('hex')
      .slice(0, 12);

  // Generate dist/sw.js
  const swSource = fs.readFileSync(path.join(pwaDir, 'sw-source.js'), 'utf8');
  const swOut = swSource
    .replace('__CACHE_NAME__', cacheName)
    .replace('__PRECACHE_URLS__', JSON.stringify(precacheUrls));
  fs.writeFileSync(path.join(dist, 'sw.js'), swOut);

  // Inject PWA tags into index.html
  const html = fs.readFileSync(indexHtmlPath, 'utf8');
  fs.writeFileSync(indexHtmlPath, injectIntoIndexHtml(html));

  const dbEntry = files.find((f) => f.endsWith('.db'));
  const totalBytes = files.reduce((sum, rel) => {
    try {
      return sum + fs.statSync(path.join(dist, rel)).size;
    } catch {
      return sum;
    }
  }, 0);
  console.log(`PWA injected. Cache: ${cacheName}`);
  console.log(`Precached ${precacheUrls.length} URLs (~${(totalBytes / 1024 / 1024).toFixed(1)} MB)`);
  if (dbEntry) console.log(`Dictionary asset cached: /${dbEntry}`);
  else console.warn('WARNING: no .db asset found in dist — check metro config');
}

main();
