#!/usr/bin/env node
/**
 * Post-deploy smoke test for the TuDienDaiNam PWA.
 *
 * Cloudflare Pages serves index.html (HTTP 200) for ANY missing file, so a
 * silently-dropped asset (e.g. wrangler's hardcoded node_modules exclusion)
 * looks "successful" but returns HTML. The browser then tries to load that
 * HTML as the SQLite WASM / database and fails with
 * "expected application/wasm, found <!DO". This script fetches the live WASM
 * and DB and asserts both the content-type and the binary magic bytes, so a
 * bad deploy is caught immediately instead of by end users.
 *
 * Usage:
 *   node scripts/verify-deploy.js https://tudiendainam.pages.dev
 *   DEPLOY_URL=https://tudiendainam.pages.dev node scripts/verify-deploy.js
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

const base = process.argv[2] || process.env.DEPLOY_URL;
if (!base) {
  console.error('Usage: node scripts/verify-deploy.js <deploy-url>');
  console.error('   or set the DEPLOY_URL environment variable.');
  process.exit(2);
}

function walk(dir, baseDir = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath, baseDir, out);
    else out.push(path.relative(baseDir, fullPath).split(path.sep).join('/'));
  }
  return out;
}

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('❌ dist/index.html not found. Run `npm run build:web` first.');
  process.exit(2);
}

const files = walk(dist);
const wasm = files.find((f) => f.endsWith('.wasm'));
const db = files.find((f) => f.endsWith('.db'));

if (!wasm || !db) {
  console.error('❌ dist/ is missing the WASM or DB asset. Run `npm run build:web` first.');
  process.exit(2);
}

const WASM_MAGIC = [0x00, 0x61, 0x73, 0x6d];
const DB_MAGIC = 'SQLite format 3'.split('').map((c) => c.charCodeAt(0));

const checks = [
  {
    name: 'WASM',
    rel: wasm,
    expectedCt: 'application/wasm',
    magic: WASM_MAGIC,
  },
  {
    name: 'DB',
    rel: db,
    expectedCt: 'application/octet-stream',
    magic: DB_MAGIC,
  },
];

const baseUrl = base.replace(/\/+$/, '');

function magicOk(buf, magic) {
  if (!buf || buf.length < magic.length) return false;
  return magic.every((b, i) => buf[i] === b);
}

(async () => {
  let failed = false;
  for (const c of checks) {
    const url = `${baseUrl}/${c.rel}`;
    try {
      const res = await fetch(url);
      const buf = Buffer.from(await res.arrayBuffer());
      const ct = (res.headers.get('content-type') || '').split(';')[0].trim();
      const okCt = ct === c.expectedCt;
      const okMagic = magicOk(buf, c.magic);
      if (res.status !== 200) {
        console.error(`❌ ${c.name}: HTTP ${res.status} for ${url}`);
        failed = true;
      } else if (!okCt) {
        console.error(
          `❌ ${c.name}: wrong content-type "${ct}" (expected "${c.expectedCt}") ` +
            `for ${url}. Likely an HTML fallback — the asset is missing from the deploy.`
        );
        failed = true;
      } else if (!okMagic) {
        console.error(
          `❌ ${c.name}: payload is not a valid ${c.name} (bad magic bytes). ` +
            `Got an HTML error page at ${url}?`
        );
        failed = true;
      } else {
        console.log(`✅ ${c.name}: OK (${ct}, ${buf.length} bytes) — ${url}`);
      }
    } catch (e) {
      console.error(`❌ ${c.name}: fetch failed for ${url}: ${e.message}`);
      failed = true;
    }
  }

  if (failed) {
    console.error(
      '\nDeploy verification FAILED. Browsers will show a "database error".\n' +
        'Re-run `npm run build:web` then `wrangler pages deploy dist --project-name tudiendainam --branch main`.'
    );
    process.exit(1);
  }
  console.log('\n✅ Deploy verification passed: WASM and DB are served correctly.');
})();
