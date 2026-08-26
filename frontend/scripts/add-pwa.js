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

// Bump when the service worker logic changes so that every deploy produces a
// new cache name, forcing old (possibly poisoned) caches to be discarded.
const SW_VERSION = 2;

const INJECT_START = '<!-- PWA-INJECT -->';
const INJECT_END = '<!-- /PWA-INJECT -->';

// Wrangler Pages has a hardcoded `**/node_modules` exclusion in its file
// walker that cannot be overridden via .gitignore.  Metro places assets
// under dist/assets/node_modules/**, which means they silently vanish from
// the deployment.  Fix: physically relocate these files to dist/assets/ext/
// and rewrite every JS reference before the precache walk runs.

function flattenNodeModulesAssets() {
  const srcDir = path.join(dist, 'assets', 'node_modules');
  const destDir = path.join(dist, 'assets', 'ext');
  if (!fs.existsSync(srcDir)) return { count: 0, destDir: null, srcDir: null };

  const files = walk(srcDir);
  fs.mkdirSync(destDir, { recursive: true });
  for (const rel of files) {
    const destPath = path.join(destDir, rel);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.renameSync(path.join(srcDir, rel), destPath);
  }
  fs.rmSync(srcDir, { recursive: true, force: true });

  // Patch every JS/JSON asset in dist to replace the old paths.
  const bundles = walk(dist).filter(
    (rel) => rel.endsWith('.js') || rel.endsWith('.json')
  );
  let patchedCount = 0;
  for (const rel of bundles) {
    const fp = path.join(dist, rel);
    let content = fs.readFileSync(fp, 'utf8');
    if (content.includes('/assets/node_modules/')) {
      content = content.replaceAll('/assets/node_modules/', '/assets/ext/');
      fs.writeFileSync(fp, content);
      patchedCount++;
    }
  }

  console.log(
    `Flattened ${files.length} node_modules assets to dist/assets/ext/ ` +
    `(patched ${patchedCount} bundles)`
  );
  return { count: files.length, destDir, srcDir };
}

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

// Guard against shipping a broken PWA. wrangler Pages has a hardcoded
// `**/node_modules` exclusion, so if the flatten step did not run the WASM /
// DB assets are silently dropped — and Cloudflare then serves index.html
// (HTTP 200) for those paths. That HTML ends up cached as the "WASM", which is
// exactly the "expected application/wasm, found <!DO" database error. Fail the
// build loudly so a broken dist never reaches production.
function assertCriticalAssets() {
  const files = walk(dist);
  const wasm = files.find((f) => f.endsWith('.wasm'));
  const db = files.find((f) => f.endsWith('.db'));

  const problems = [];

  if (!wasm) {
    problems.push('No .wasm asset found in dist/ (wa-sqlite WASM missing).');
  } else if (wasm.includes('node_modules')) {
    problems.push(
      `WASM still lives under a node_modules path (/${wasm}). wrangler's ` +
        'hardcoded **/node_modules exclusion will drop it on deploy — the ' +
        'flatten step did not run.'
    );
  } else {
    const buf = fs.readFileSync(path.join(dist, wasm));
    if (
      buf.length < 4 ||
      buf[0] !== 0x00 ||
      buf[1] !== 0x61 ||
      buf[2] !== 0x73 ||
      buf[3] !== 0x6d
    ) {
      problems.push(
        `WASM asset /${wasm} is not a valid WebAssembly module (bad magic ` +
          'bytes). It may be an HTML error page captured during export.'
      );
    }
  }

  if (!db) {
    problems.push('No .db asset found in dist/ (dictionary database missing).');
  } else if (db.includes('node_modules')) {
    problems.push(
      `DB still lives under a node_modules path (/${db}). wrangler will drop ` +
        'it on deploy — the flatten step did not run.'
    );
  } else {
    const buf = fs.readFileSync(path.join(dist, db));
    const header = buf.subarray(0, 15).toString('latin1');
    if (header !== 'SQLite format 3') {
      problems.push(
        `DB asset /${db} is not a valid SQLite file (expected "SQLite format 3", ` +
          `got "${header}"). It may be an HTML error page.`
      );
    }
  }

  if (problems.length) {
    console.error('\n❌ PWA build aborted — critical assets are invalid/missing:');
    for (const p of problems) console.error('  • ' + p);
    console.error(
      '\nFix: ensure `node scripts/add-pwa.js` runs AFTER `expo export` ' +
        '(npm run build:web does this), then re-run the build and deploy.\n'
    );
    process.exit(1);
  }

  console.log(`Critical asset check passed: /${wasm} (valid WASM), /${db}`);
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

  // Move node_modules assets out of the excluded path before building precache.
  flattenNodeModulesAssets();

  // Fail the build if the critical binary assets are missing or invalid so we
  // never deploy an app that fails to load its database.
  assertCriticalAssets();

  // Collect precache URLs from everything currently in dist/ except runtime files.
  const files = walk(dist).filter(
    (rel) => rel !== 'sw.js' && rel !== '_headers' && rel !== 'manifest.webmanifest'
  );
  files.sort();
  const precacheUrls = ['/', ...files.map((rel) => '/' + rel)];

  const cacheName =
    'tuidiendainam-v' +
    SW_VERSION +
    '-' +
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
