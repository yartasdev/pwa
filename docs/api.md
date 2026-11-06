# API

### `generateAssets(options)`

Generates buffers in memory without writing files. Returns a `Promise<GenerateResult>` containing `assets`, `images`, `files`, `manifest`, `html` and `warnings`.

Each asset includes `filename`, `mimeType` and `data: Buffer`. Image assets also include `kind`, `width` and `height`. `filename` is a forward-slash path relative to the output directory, such as `icons/icon-192x192.png`.

### `planAssets(options)` and metadata helpers

`planAssets` returns `images`, `files`, `manifest` and `html` without decoding the source or writing files. It validates options, not the existence or decodability of the source.

Additional exports: `createManifest(images, publicPath?, existing?)`, `createHtml(images, publicPath?, includeManifest?)`, `createHtmlDocument(images, publicPath?, manifest?)`, `assetUrl(base, filename)`, `IOS_DEVICES`, `PwaError` and all public types. Use `planAssets().images` as the image input to metadata helpers.
