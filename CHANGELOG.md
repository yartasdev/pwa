# Changelog

Changes are documented here before each release. This file does not indicate that a version has been published.

## 0.1.0 — Unreleased

### Added

- TypeScript library with ESM, CommonJS and declaration exports, targeting Node.js 22+.
- Sharp-based programmatic API and `pwa` command-line interface.
- Default set of 55 PNG assets: 11 PWA/maskable icons, four Apple touch icons and 40 iOS startup images.
- Separate `icons/`, `apple-touch-icons/` and `splash/` output directories.
- Manifest generation, preservation of existing fields and HTML link snippets.
- Custom sizes, device presets, portrait/landscape output, padding and dark splash variants.
- Optional PNG favicons and a PNG-frame ICO container.
- JSON configuration, dry runs, JSON output and explicit overwrite support.
- Input limits, bounded rendering concurrency, typed errors and output path validation.
- Image, CLI, package installation and declaration-resolution tests.
- Scoped package identity `@yartasdev/pwa` and English documentation.
- Independent opt-in config for `manifest.webmanifest` and `index.html` output.
- Separate planning, validation, image processing and CLI modules.
- Shared Prettier/EditorConfig formatting and a Windows/Linux CI matrix.
- Automatic patch releases on successful main pushes, commit-based rerun detection and queued publishing with `NPM_TOKEN`.
- A GitHub release tagged `v<version>` for each published version.
