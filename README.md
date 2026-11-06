# @yartasdev/pwa

[Documentation](https://yartasdev.github.io/pwa/)

Generate PWA icons, Apple touch icons and iOS splash screens from a single image. Built with TypeScript and [Sharp](https://sharp.pixelplumbing.com/), with a shared programmatic API and CLI.

- **55 PNG assets by default:** 11 regular/maskable icons, four Apple touch icons and 40 portrait/landscape splash images.
- Separate `icons/`, `apple-touch-icons/` and `splash/` directories.
- Manifest generation, HTML link snippets and preservation of existing manifest fields.
- Custom sizes, padding, backgrounds, dark splash variants and device presets.
- Optional PNG favicons and multi-resolution ICO output.
- ESM, CommonJS, TypeScript declarations, JSON config and dry runs.

Requires **Node.js 22+**. This is a Node.js/build-time library. Sharp uses native binaries; browser bundling is not supported.

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

## Options

`generateAssets` and `planAssets` take `GenerateOptions`. A JSON config file accepts those same fields plus `outDir` and `overwrite`. Unknown keys are rejected. CLI flags override config values, then the defaults below apply. A `Buffer` input is API-only; config and the CLI require a file path.

### Generation

| Option             | Type                     | Default           | CLI                             | Behavior                                                                                                                                                                                           |
| ------------------ | ------------------------ | ----------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `input`            | `string \| Buffer`       | Required          | positional path                 | Nonempty file path or nonempty `Buffer`. Config paths are relative to the config file. CLI paths are relative to the working directory.                                                            |
| `icons`            | `false \| IconOptions`   | `{}`              | `--no-icons`, `icons`, `splash` | Icon group. `false`, `--no-icons`, or the `splash` command disables every icon output, including Apple, favicon and ICO files.                                                                     |
| `splash`           | `false \| SplashOptions` | iOS preset (`{}`) | `--splash`, `--no-splash`       | Startup images. `false`, `--no-splash`, or the `icons` command disables them. `--splash` conflicts with `--no-splash`.                                                                             |
| `manifest`         | `boolean \| WebManifest` | `false`           | `--manifest`, `--no-manifest`   | `false` or omitted skips `manifest.webmanifest`. `true` writes the defaults below. An object keeps your fields. `--manifest` keeps an existing object; `--no-manifest` forces `false`.             |
| `html`             | `boolean`                | `false`           | `--html`, `--no-html`           | `true` writes `index.html`. `--no-html` forces `false`.                                                                                                                                            |
| `publicPath`       | `string`                 | `/pwa/`           | `--public-path <url>`           | URL prefix for `src` and `href` values. A path or an `http`/`https` URL. Query strings, hashes, whitespace, backslashes and other schemes are rejected. Trailing slashes are removed when joining. |
| `background`       | `string`                 | `#ffffff`         | `--background <color>`          | CSS color. Apple icons, the default maskable and splash canvases, and the default manifest `background_color` and `theme_color` use it.                                                            |
| `concurrency`      | `number`                 | `2`               | `--concurrency <1..16>`         | Integer from 1 to 16. Concurrent Sharp renders.                                                                                                                                                    |
| `limitInputPixels` | `number`                 | `40000000`        | config and API only             | Integer from 1 to 268402689. Sharp refuses to decode an input above this pixel count.                                                                                                              |

At least one image must be enabled, and one run can plan at most 256 images. Each output image can contain at most 40 million pixels.

### Icon options

Set these on `icons`. Size lists replace the preset, contain 1–64 integers, and each integer is from 1 to 8192. Duplicates are removed and the list is sorted ascending.

| Option               | Type       | Default                                  | CLI                           | Behavior                                                                                                                                                                        |
| -------------------- | ---------- | ---------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `preset`             | `'pwa'`    | `'pwa'`                                  | —                             | The only accepted preset.                                                                                                                                                       |
| `sizes`              | `number[]` | `[72, 96, 128, 144, 152, 192, 384, 512]` | `--sizes <192,512>`           | Regular icons, `icons/icon-{size}x{size}.png`. Transparency is preserved.                                                                                                       |
| `maskable`           | `boolean`  | `true`                                   | `--no-maskable`               | `false` skips maskable icons. They are enabled when the field is omitted.                                                                                                       |
| `maskableSizes`      | `number[]` | `[192, 384, 512]`                        | config and API only           | `icons/maskable-icon-{size}x{size}.png`.                                                                                                                                        |
| `apple`              | `boolean`  | `true`                                   | `--no-apple`                  | `false` skips Apple touch icons. They are enabled when the field is omitted.                                                                                                    |
| `appleSizes`         | `number[]` | `[120, 152, 167, 180]`                   | config and API only           | `apple-touch-icons/apple-touch-icon-{size}x{size}.png`. These canvases use the top-level `background`.                                                                          |
| `favicons`           | `boolean`  | `false`                                  | `--favicons`, `--no-favicons` | `true` writes PNG favicons. `--no-favicons` forces `false`.                                                                                                                     |
| `faviconSizes`       | `number[]` | `[16, 32, 48]`                           | config and API only           | `icons/favicon-{size}x{size}.png`.                                                                                                                                              |
| `ico`                | `boolean`  | `false`                                  | `--ico`                       | `true` writes `icons/favicon.ico` with 16, 32 and 48 PNG frames.                                                                                                                |
| `padding`            | `number`   | `0`                                      | `--padding <0..0.45>`         | Fraction of the canvas reserved on each side. Maskable icons use at least enough padding for the logo box to fit the [40% safe circle](https://web.dev/articles/maskable-icon). |
| `background`         | `string`   | `transparent`                            | config and API only           | CSS color for regular icons, PNG favicons and the ICO. This is separate from the top-level `--background`.                                                                      |
| `maskableBackground` | `string`   | top-level `background`                   | config and API only           | CSS color behind the maskable logo.                                                                                                                                             |

Apple, maskable and splash images are flattened onto their background. Use an opaque CSS color when the installed icon must stay opaque. Source whitespace is preserved, so an already padded source can look smaller after maskable padding is applied.

### Splash options

Set these on `splash`. Passing `devices` replaces `IOS_DEVICES` for that run.

| Option           | Type                            | Default                     | CLI                         | Behavior                                                                                                                 |
| ---------------- | ------------------------------- | --------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `preset`         | `'ios'`                         | `'ios'`                     | —                           | The only accepted preset.                                                                                                |
| `devices`        | `DevicePreset[]`                | `IOS_DEVICES` (20 devices)  | config and API only         | 1–64 devices. See the device fields below.                                                                               |
| `orientations`   | `('portrait' \| 'landscape')[]` | `['portrait', 'landscape']` | `--portrait`, `--landscape` | One or both values. The two flags cannot be combined; each selects a single orientation. Duplicate values are collapsed. |
| `logoScale`      | `number`                        | `0.25`                      | `--logo-scale <0.01..1>`    | Logo box as a fraction of the shorter screen edge.                                                                       |
| `background`     | `string`                        | top-level `background`      | config and API only         | CSS color for the light startup image.                                                                                   |
| `darkBackground` | `string`                        | omitted                     | `--dark-background <css>`   | CSS color. When set, each splash also gets a `-dark.png` file and a `prefers-color-scheme` media query.                  |

Device fields:

| Field        | Type     | Rules                                                                                                              |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `name`       | `string` | 1–64 characters. Letters, digits and hyphens, starting with a letter or digit. It does not appear in the filename. |
| `width`      | `number` | Portrait CSS pixels. Integer from 1 to 8192, and less than or equal to `height`.                                   |
| `height`     | `number` | Portrait CSS pixels. Integer from 1 to 8192.                                                                       |
| `pixelRatio` | `number` | From 1 to 4. Output pixels are `Math.round(cssPixels * pixelRatio)`.                                               |

Filenames are `splash/apple-splash-{width}x{height}.png`. Dark variants insert `-dark` before the extension. Duplicate filenames, including names that differ only by case, are rejected. The HTML media query matches device width, device height, `-webkit-device-pixel-ratio`, orientation, and color scheme when a dark variant exists.

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

### Manifest fields

Any JSON-serializable field is kept. Generated `icon` and `maskable` images replace existing `icons` entries with the same `src`; other icons stay. Apple, favicon, ICO and splash images are linked from HTML and are omitted from `icons`.

| Field              | Default when `manifest` is `true` | Behavior                                                                                  |
| ------------------ | --------------------------------- | ----------------------------------------------------------------------------------------- |
| `name`             | omitted                           | Copied through. When `html` is enabled, a string `name` becomes the document title.       |
| `short_name`       | omitted                           | Copied through.                                                                           |
| `start_url`        | `/`                               | Your value replaces the default.                                                          |
| `display`          | `standalone`                      | Your value replaces the default.                                                          |
| `background_color` | top-level `background`            | Your value replaces the default.                                                          |
| `theme_color`      | top-level `background`            | Your value replaces the default.                                                          |
| `icons`            | generated PNG icons               | Must be an array when present. Matching `src` values are replaced by the generated icons. |
| other fields       | preserved                         | Included in `manifest.webmanifest` unchanged.                                             |

### Output options

`writeAssets(result, options)` creates the category directories and writes every buffer. It returns absolute paths. Every path is checked before the first write. A later I/O failure can still leave a partial directory, because the write is not transactional.

| Option      | Type      | Default        | CLI                     | Behavior                                                                                                                  |
| ----------- | --------- | -------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `outDir`    | `string`  | `./pwa-assets` | `--out-dir <directory>` | Nonempty output directory. Config paths are relative to the config file. CLI paths are relative to the working directory. |
| `overwrite` | `boolean` | `false`        | `--overwrite`           | `true` replaces an existing regular file. Symlinks, directories and file/directory collisions are rejected either way.    |

### CLI-only flags

| Flag              | Behavior                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `generate`        | Default command. Enables the icon group and the iOS splash preset: 55 PNGs.               |
| `icons`           | Disables splash output.                                                                   |
| `splash`          | Disables every icon output.                                                               |
| `--config <file>` | Read one JSON config. Nothing is loaded implicitly. The file must contain an object.      |
| `--dry-run`       | Print the JSON plan. The source image is neither decoded nor written.                     |
| `--json`          | Success JSON goes to stdout. Error JSON goes to stderr as `{ error: { code, message } }`. |
| `--help`, `-h`    | Print usage and exit 0.                                                                   |
| `--version`, `-v` | Print the package version and exit 0.                                                     |

One positional input is accepted. Exit codes are `0` for success, `1` for an input, generation or write failure, and `2` for invalid options.

```sh
pwa generate ./logo.svg --out-dir ./public/pwa --public-path /pwa/
pwa icons ./logo.png --sizes 192,512 --padding 0.05
pwa splash ./logo.svg --portrait --dark-background '#111827' --no-manifest
pwa generate --config ./pwa.config.json --dry-run --json
pwa --help
```

```json
{
  "input": "./logo.svg",
  "outDir": "./public/pwa",
  "overwrite": false,
  "publicPath": "/pwa/",
  "background": "#ffffff",
  "concurrency": 2,
  "limitInputPixels": 40000000,
  "html": true,
  "icons": {
    "sizes": [192, 512],
    "maskable": true,
    "maskableSizes": [192, 512],
    "apple": true,
    "padding": 0.05,
    "background": "transparent",
    "favicons": true,
    "ico": true
  },
  "splash": {
    "preset": "ios",
    "orientations": ["portrait", "landscape"],
    "logoScale": 0.25,
    "background": "#ffffff",
    "darkBackground": "#0f172a"
  },
  "manifest": {
    "name": "My App",
    "short_name": "My App",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#2563eb"
  }
}
```

## API

### `generateAssets(options)`

Generates buffers in memory without writing files. Returns a `Promise<GenerateResult>` containing `assets`, `images`, `files`, `manifest`, `html` and `warnings`.

Each asset includes `filename`, `mimeType` and `data: Buffer`. Image assets also include `kind`, `width` and `height`. `filename` is a forward-slash path relative to the output directory, such as `icons/icon-192x192.png`.

### `planAssets(options)` and metadata helpers

`planAssets` returns `images`, `files`, `manifest` and `html` without decoding the source or writing files. It validates options, not the existence or decodability of the source.

Additional exports: `createManifest(images, publicPath?, existing?)`, `createHtml(images, publicPath?, includeManifest?)`, `createHtmlDocument(images, publicPath?, manifest?)`, `assetUrl(base, filename)`, `IOS_DEVICES`, `PwaError` and all public types. Use `planAssets().images` as the image input to metadata helpers.

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
npm run docs:dev
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
