# Getting started

Generate PWA icons, Apple touch icons and iOS splash screens from a single image. Built with TypeScript and [Sharp](https://sharp.pixelplumbing.com/), with a shared programmatic API and CLI.

Requires **Node.js 22+**. This is a Node.js build-time library. Sharp uses native binaries, so browser bundling is not supported.

## Installation

```sh
npm install @yartasdev/pwa
```

After installation, the CLI command is `pwa` and the API import is `@yartasdev/pwa`.

## Quick start

```sh
npx --no-install pwa generate ./logo.svg --out-dir ./public/pwa --public-path /pwa/
```

This produces all **55 PNGs**. `manifest.webmanifest` and `index.html` are independent opt-in outputs: set `manifest: true` (or an object with app metadata) and `html: true` in config, or pass `--manifest --html`. The generated index is a minimal HTML document; copy its head links into an existing application when integrating assets.

```ts
import { generateAssets, writeAssets } from '@yartasdev/pwa';

const result = await generateAssets({
  input: './logo.svg', // A Buffer is also accepted.
  publicPath: '/pwa/',
  background: '#ffffff',
  html: true,
  manifest: {
    name: 'My App',
    short_name: 'My App',
    start_url: '/',
    theme_color: '#2563eb',
  },
});

await writeAssets(result, { outDir: './public/pwa' });
console.log(result.warnings);
```

CommonJS is also supported:

```js
const { generateAssets, writeAssets } = require('@yartasdev/pwa');
```
