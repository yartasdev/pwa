# @yartasdev/pwa

English · [Publishing guide](./PUBLISHING.md)

Generate PWA icons, Apple touch icons and iOS splash screens from a single image. Built with TypeScript and [Sharp](https://sharp.pixelplumbing.com/), with a shared programmatic API and CLI.

- **55 PNG assets by default:** 11 regular/maskable icons, four Apple touch icons and 40 portrait/landscape splash images.
- Separate `icons/`, `apple-touch-icons/` and `splash/` directories.
- Manifest generation, HTML link snippets and preservation of existing manifest fields.
- Custom sizes, padding, backgrounds, dark splash variants and device presets.
- Optional PNG favicons and multi-resolution ICO output.
- ESM, CommonJS, TypeScript declarations, JSON config and dry runs.

Requires **Node.js 22+**. This is a Node.js/build-time library. Sharp uses native binaries; browser bundling is not supported.

## Installation

The package name is **`@yartasdev/pwa`**. The first release is being prepared and has **not been published**. After publishing, install it with `npm install @yartasdev/pwa`. Until then, use a locally packed build.

To install a locally packed build into another project:

```sh
# In this repository:
npm ci
npm pack

# In your consuming project, use the actual archive path:
npm install /path/to/yartasdev-pwa-0.1.0.tgz
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

## Output

```text
public/pwa/
  icons/
    icon-72x72.png
    icon-96x96.png
    icon-128x128.png
    icon-144x144.png
    icon-152x152.png
    icon-192x192.png
    icon-384x384.png
    icon-512x512.png
    maskable-icon-192x192.png
    maskable-icon-384x384.png
    maskable-icon-512x512.png
  apple-touch-icons/
    apple-touch-icon-120x120.png
    apple-touch-icon-152x152.png
    apple-touch-icon-167x167.png
    apple-touch-icon-180x180.png
  splash/
    apple-splash-1320x2868.png
    apple-splash-2868x1320.png
    ...
  manifest.webmanifest  # optional: manifest enabled
  index.html            # optional: html enabled
```

Default portrait splash dimensions are listed below. Each also produces a landscape image with swapped dimensions, for 40 splash files in total.

```text
1320x2868  1206x2622  1290x2796  1179x2556  1284x2778
1170x2532  1080x2340  1242x2688  1125x2436   828x1792
1242x2208   750x1334  2064x2752  1668x2420  2048x2732
1668x2388  1640x2360  1620x2160  1488x2266  1536x2048
```

## API

### `generateAssets(options)`

Generates buffers in memory without writing files. Returns a `Promise<GenerateResult>` containing `assets`, `images`, `files`, `manifest`, `html` and `warnings`.

Each asset includes `filename`, `mimeType` and `data: Buffer`; image assets also include `kind`, `width` and `height`. `filename` is a forward-slash path relative to the output directory, such as `icons/icon-192x192.png`.

| Option             | Default    | Description                                                            |
| ------------------ | ---------- | ---------------------------------------------------------------------- |
| `input`            | Required   | File path or `Buffer`                                                  |
| `icons`            | `{}`       | Icon options; `false` disables all icon outputs, including Apple icons |
| `splash`           | iOS preset | Splash options; `false` disables startup images                        |
| `manifest`         | `false`    | Opt in with `true` or an object containing existing manifest fields    |
| `html`             | `false`    | Set `true` to generate `index.html`                                    |
| `publicPath`       | `/pwa/`    | Asset URL prefix, independent of the filesystem output directory       |
| `background`       | `#ffffff`  | Base Apple/maskable/splash and manifest background                     |
| `concurrency`      | `2`        | Concurrent rendering jobs, from 1 to 16                                |
| `limitInputPixels` | `40000000` | Sharp input pixel limit, up to 268402689                               |

Existing manifest fields are preserved. Generated icons replace existing entries with the same `src`; unrelated icons remain. Default manifest fields include `display: 'standalone'` and `start_url: '/'`. Add your own app identity and metadata.

### Icon options

| Option                       | Default                                                    |
| ---------------------------- | ---------------------------------------------------------- |
| `preset`                     | `'pwa'`                                                    |
| `sizes`                      | `[72, 96, 128, 144, 152, 192, 384, 512]`                   |
| `maskable` / `maskableSizes` | `true` / `[192, 384, 512]`                                 |
| `apple` / `appleSizes`       | `true` / `[120, 152, 167, 180]`                            |
| `favicons` / `faviconSizes`  | `false` / `[16, 32, 48]`                                   |
| `ico`                        | `false`; enables 16/32/48px PNG frames in an ICO container |
| `padding`                    | `0`; fraction per side, from 0 to 0.45                     |
| `background`                 | `'transparent'`; regular icons and favicons                |
| `maskableBackground`         | Top-level `background`                                     |

Size arrays replace preset values. Sizes must be integers from 1 to 8192. Regular icons preserve transparency. Apple, maskable and splash images are flattened; use an opaque CSS background color for predictable results.

The entire maskable logo bounding box fits within the [40%-radius safe circle](https://web.dev/articles/maskable-icon). Source whitespace is preserved, so an already padded source may appear smaller.

### Splash options

| Option           | Default                                                                       |
| ---------------- | ----------------------------------------------------------------------------- |
| `preset`         | `'ios'`                                                                       |
| `devices`        | Exported `IOS_DEVICES`; a custom array replaces the preset                    |
| `orientations`   | `['portrait', 'landscape']`                                                   |
| `logoScale`      | `0.25`; logo bounding box relative to the shorter screen edge, from 0.01 to 1 |
| `background`     | Top-level `background`                                                        |
| `darkBackground` | Disabled; adds `-dark.png` variants when specified                            |

```ts
const result = await generateAssets({
  input: './logo.svg',
  icons: false,
  manifest: false,
  splash: {
    devices: [{ name: 'custom-phone', width: 390, height: 844, pixelRatio: 3 }],
    orientations: ['portrait'],
    background: '#ffffff',
    darkBackground: '#111827',
    logoScale: 0.3,
  },
});
```

Device dimensions are portrait CSS pixels; image dimensions are CSS dimensions multiplied by `pixelRatio` (1–4). Device names identify presets; filenames use the resulting pixel dimensions. Duplicate output filenames are rejected. Theme variants use matching `prefers-color-scheme` media queries.

### `writeAssets(result, { outDir, overwrite? })`

Writes buffers and creates category directories. Existing files are protected unless `overwrite: true` is passed. Unsafe relative paths, symlink targets and file/directory conflicts are rejected. All paths are checked before writing; I/O failures can still leave partial output because writing multiple files is not transactional. Returns absolute output paths.

### `planAssets(options)` and metadata helpers

`planAssets` returns `images`, `files`, `manifest` and `html` without decoding the source or writing files. It validates options, not the existence or decodability of the source.

Additional exports: `createManifest(images, publicPath?, existing?)`, `createHtml(images, publicPath?, includeManifest?)`, `createHtmlDocument(images, publicPath?, manifest?)`, `assetUrl(base, filename)`, `IOS_DEVICES`, `PwaError` and all public types. Use `planAssets().images` as the image input to metadata helpers.

## CLI and configuration

```sh
pwa generate ./logo.svg --out-dir ./public/pwa --public-path /pwa/
pwa icons ./logo.png --sizes 192,512 --padding 0.05
pwa splash ./logo.svg --portrait --dark-background '#111827' --no-manifest
pwa generate --config ./pwa.config.json --dry-run --json
pwa --help
```

`generate` includes all three categories. `icons` disables splash output; `splash` disables all icon outputs. Use `--favicons` or `--ico` for optional favicon output and `--no-splash` to disable startup images.

Config is loaded only when `--config` is passed. JSON config accepts `GenerateOptions` plus `outDir` and `overwrite`; `input` must be a path. Config paths are relative to the config file; CLI paths are relative to the working directory. CLI flags override config values, then defaults apply. Subcommands and `--no-icons`/`--no-splash` determine the final enabled categories.

```json
{
  "input": "./logo.svg",
  "outDir": "./public/pwa",
  "publicPath": "/pwa/",
  "background": "#ffffff",
  "html": true,
  "manifest": {
    "name": "My App",
    "short_name": "My App",
    "theme_color": "#2563eb"
  }
}
```

`--dry-run` prints a JSON plan without reading images or writing files. `--json` prints success data to stdout and errors to stderr. Exit codes: `0` success, `1` input/generation/write error, `2` invalid options.

## Limitations and errors

- Still PNG, JPEG, WebP, SVG, AVIF, TIFF, GIF and HEIF input is accepted; codec availability depends on the Sharp installation. Animated and multi-page inputs are rejected.
- Raster upscaling produces a warning. SVG is rasterized for target rendering; use self-contained SVG and make any required fonts available in the build environment.
- Each output is limited to 40 million pixels; a run is limited to 256 images. Results retain all output buffers in memory.
- This package generates assets and metadata, not service workers or offline caching. Chromium splash screens use manifest metadata; Apple startup images use generated HTML links. Test startup behavior on target physical devices and Safari versions. Presets do not cover every device or display zoom setting.
- ICO output uses PNG-compressed frames; legacy BMP-only ICO readers are not a target.
- `PwaError.code`: `INVALID_OPTIONS`, `INVALID_INPUT`, `GENERATION_FAILED`, `OUTPUT_EXISTS`, `WRITE_FAILED`.

## Development and releases

```sh
npm ci
npm run format
npm run check
npm run test:package
npm run pack:check
npm run release:check
```

`release:check` runs source/image and release-version tests, checks package contents and installs the packed archive in a consumer project to verify ESM, CommonJS, declarations and the CLI. It does not publish locally.

Every push to `main` starts the release workflow. Its Node.js 22/24 Windows/Linux matrix must pass before the publish job runs. The first release uses `package.json.version`; subsequent releases advance the highest stable npm version by one patch unless the checked-in version is already higher. Re-running a published source commit skips publishing. Repository metadata and the source commit SHA are added to the runner's package, and version changes are not committed back to `main`.

The release workflow publishes with the repository secret `NPM_TOKEN` after the GitHub repository and `npm` environment are configured. There is no `NPM_PUBLISH_ENABLED` switch. Pull requests and other branches run validation without publishing. See the publishing guide for the one-time setup.

See [PUBLISHING.md](./PUBLISHING.md) for package identity, registry configuration and release setup. See [CHANGELOG.md](./CHANGELOG.md) for release notes.

## License

[ISC](./LICENSE).
