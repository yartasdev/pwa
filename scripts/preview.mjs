import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { generateAssets, writeAssets } from '../dist/esm/index.js';
const result = await generateAssets({
  input: './examples/logo.svg',
  background: '#f1f5f9',
  icons: { ico: true, padding: 0.05 },
  splash: { darkBackground: '#0f172a' },
  manifest: { name: 'Example PWA' },
  html: true,
});
await writeAssets(result, { outDir: './.tmp/preview/assets', overwrite: true });
const names = [
  'icons/icon-512x512.png',
  'icons/maskable-icon-512x512.png',
  'apple-touch-icons/apple-touch-icon-180x180.png',
  'splash/apple-splash-1170x2532.png',
  'splash/apple-splash-1170x2532-dark.png',
  'splash/apple-splash-2360x1640.png',
];
const composites = [];
for (let i = 0; i < names.length; i++) {
  const asset = result.assets.find((a) => a.filename === names[i]);
  const panel = await sharp(asset.data)
    .resize(280, 300, { fit: 'contain', background: '#d1d5db' })
    .png()
    .toBuffer();
  const left = (i % 3) * 320 + 20;
  const top = Math.floor(i / 3) * 360 + 20;
  composites.push({ input: panel, left, top });
  composites.push({
    input: Buffer.from(
      `<svg width="300" height="32"><text x="0" y="21" font-size="12" font-family="sans-serif" fill="#0f172a">${names[i].split('/').pop()}</text></svg>`,
    ),
    left,
    top: top + 306,
  });
}
await mkdir('.tmp/preview', { recursive: true });
await writeFile(
  '.tmp/preview/contact-sheet.png',
  await sharp({ create: { width: 960, height: 720, channels: 3, background: '#ffffff' } })
    .composite(composites)
    .png()
    .toBuffer(),
);
console.log(`Rendered ${result.images.length} images; preview: .tmp/preview/contact-sheet.png`);
