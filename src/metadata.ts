import type { PlannedAsset, WebManifest } from './types.js';

export function assetUrl(base: string, filename: string): string {
  return `${base.replace(/\/+$/, '')}/${filename}`;
}
export function createManifest(
  images: PlannedAsset[],
  base = '/pwa/',
  existing: WebManifest = {},
): WebManifest {
  const icons = images
    .filter((i) => i.kind === 'icon' || i.kind === 'maskable')
    .map((i) => ({
      src: assetUrl(base, i.filename),
      sizes: `${i.width}x${i.height}`,
      type: 'image/png',
      purpose: i.kind === 'maskable' ? 'maskable' : 'any',
    }));
  const generated = new Set(icons.map((i) => i.src));
  return {
    display: 'standalone',
    start_url: '/',
    ...existing,
    icons: [
      ...(existing.icons ?? []).filter(
        (i) => !(typeof i === 'object' && i !== null && 'src' in i && generated.has(String(i.src))),
      ),
      ...icons,
    ],
  };
}
function escape(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}
export function createHtml(images: PlannedAsset[], base = '/pwa/', manifest = true): string {
  const links: string[] = [];
  if (manifest)
    links.push(`<link rel="manifest" href="${escape(assetUrl(base, 'manifest.webmanifest'))}">`);
  for (const image of images) {
    const href = escape(assetUrl(base, image.filename));
    if (image.kind === 'apple')
      links.push(
        `<link rel="apple-touch-icon" sizes="${image.width}x${image.height}" href="${href}">`,
      );
    if (image.kind === 'favicon')
      links.push(
        `<link rel="icon" type="image/png" sizes="${image.width}x${image.height}" href="${href}">`,
      );
    if (image.kind === 'ico') links.push(`<link rel="icon" type="image/x-icon" href="${href}">`);
    if (image.kind === 'splash')
      links.push(
        `<link rel="apple-touch-startup-image" media="${escape(image.media!)}" href="${href}">`,
      );
  }
  return links.join('\n') + '\n';
}

/** A small HTML document for consumers who explicitly request one. */
export function createHtmlDocument(
  images: PlannedAsset[],
  base = '/pwa/',
  manifest: WebManifest | null = null,
): string {
  const title = typeof manifest?.name === 'string' ? manifest.name : 'PWA';
  const links = createHtml(images, base, manifest !== null)
    .trimEnd()
    .split('\n')
    .filter(Boolean)
    .map((link) => `    ${link}`)
    .join('\n');

  return [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="utf-8">',
    '    <meta name="viewport" content="width=device-width, initial-scale=1">',
    `    <title>${escape(title)}</title>`,
    links,
    '  </head>',
    '  <body></body>',
    '</html>',
    '',
  ]
    .filter((line, index, lines) => line !== '' || index === lines.length - 1)
    .join('\n');
}
