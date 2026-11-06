# Limitations and errors

- Still PNG, JPEG, WebP, SVG, AVIF, TIFF, GIF and HEIF input is accepted; codec availability depends on the Sharp installation. Animated and multi-page inputs are rejected.
- Raster upscaling produces a warning. SVG is rasterized for target rendering; use self-contained SVG and make any required fonts available in the build environment.
- Each output is limited to 40 million pixels; a run is limited to 256 images. Results retain all output buffers in memory.
- This package generates assets and metadata, not service workers or offline caching. Chromium splash screens use manifest metadata; Apple startup images use generated HTML links. Test startup behavior on target physical devices and Safari versions. Presets do not cover every device or display zoom setting.
- ICO output uses PNG-compressed frames; legacy BMP-only ICO readers are not a target.
- `PwaError.code`: `INVALID_OPTIONS`, `INVALID_INPUT`, `GENERATION_FAILED`, `OUTPUT_EXISTS`, `WRITE_FAILED`.
