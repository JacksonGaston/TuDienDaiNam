#!/usr/bin/env node

/**
 * Generates PWA icons from assets/icon.png using node-canvas.
 * Outputs to pwa/icons/:
 *   icon-192-v2.png, icon-512-v2.png        (purpose: any)
 *   maskable-192-v2.png, maskable-512-v2.png (purpose: maskable, safe-zone padded)
 *   apple-touch-icon-v2.png               (180x180, opaque)
 *
 * Run once: npm run icons  (outputs are committed)
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

const root = path.resolve(__dirname, '..');
const sourceIcon = path.join(root, 'assets', 'icon.png');
const outDir = path.join(root, 'pwa', 'icons');

async function render(size, { maskable = false, background = null } = {}) {
  const img = await loadImage(sourceIcon);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
  }

  if (maskable) {
    // Keep artwork within the 80% safe zone required by maskable icons.
    const scale = size * 0.72;
    ctx.drawImage(img, (size - scale) / 2, (size - scale) / 2, scale, scale);
  } else {
    ctx.drawImage(img, 0, 0, size, size);
  }

  return canvas.toBuffer('image/png');
}

(async () => {
  if (!fs.existsSync(sourceIcon)) {
    console.error(`Source icon not found: ${sourceIcon}`);
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });

  const targets = [
    { file: 'icon-192-v2.png', size: 192 },
    { file: 'icon-512-v2.png', size: 512 },
    { file: 'maskable-192-v2.png', size: 192, opts: { maskable: true } },
    { file: 'maskable-512-v2.png', size: 512, opts: { maskable: true } },
    {
      file: 'apple-touch-icon-v2.png',
      size: 180,
      opts: { background: '#ffffff' },
    },
  ];

  for (const target of targets) {
    const buffer = await render(target.size, target.opts || {});
    fs.writeFileSync(path.join(outDir, target.file), buffer);
    console.log(`Wrote pwa/icons/${target.file} (${target.size}x${target.size})`);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
