import { parseArgs } from 'node:util';

export const HELP = `pwa — PWA assets powered by Sharp

Usage: pwa [generate|icons|splash] [input] [options]

  --config <file>          JSON config; input/outDir relative to config file
  --out-dir <directory>   Output directory (default: ./pwa-assets)
  --public-path <url>     Asset URL prefix (default: /pwa/)
  --background <color>    Canvas / manifest background (default: #ffffff)
  --sizes <192,512>       Override regular PWA icon sizes
  --padding <0..0.45>     Icon padding fraction per side
  --splash                Include iOS startup images
  --no-splash             Disable startup images
  --no-icons              Disable icons
  --no-maskable           Disable maskable icons
  --no-apple              Disable Apple touch icons
  --no-favicons           Disable PNG favicons
  --favicons              Include optional PNG favicons
  --ico                   Include multi-resolution favicon.ico
  --landscape              Splash landscape only
  --portrait               Splash portrait only
  --dark-background <css>  Add dark-mode splash variants
  --logo-scale <0.01..1>  Splash logo scale (default: 0.25)
  --no-manifest           Disable manifest output
  --manifest              Generate manifest.webmanifest (default: disabled)
  --html                  Generate index.html (default: disabled)
  --no-html               Disable index.html output
  --concurrency <1..16>   Concurrent renders (default: 2)
  --dry-run               Print plan; no image decode or file writes
  --overwrite             Replace existing regular output files
  --json                  Machine-readable success / error output
  --help, -h              Show help
  --version, -v           Show version

CLI flags override config values. No config file is loaded implicitly.
generate defaults to icons, apple-touch-icons and splash directories (55 PNGs).
Exit codes: 0 success, 1 input/generation/write error, 2 invalid options.
`;

export function parseCliArgs(args: string[]) {
  return parseArgs({
    args,
    allowPositionals: true,
    strict: true,
    options: {
      config: { type: 'string' },
      'out-dir': { type: 'string' },
      'public-path': { type: 'string' },
      background: { type: 'string' },
      sizes: { type: 'string' },
      padding: { type: 'string' },
      splash: { type: 'boolean' },
      'no-splash': { type: 'boolean' },
      'no-icons': { type: 'boolean' },
      'no-maskable': { type: 'boolean' },
      'no-apple': { type: 'boolean' },
      'no-favicons': { type: 'boolean' },
      favicons: { type: 'boolean' },
      ico: { type: 'boolean' },
      landscape: { type: 'boolean' },
      portrait: { type: 'boolean' },
      'dark-background': { type: 'string' },
      'logo-scale': { type: 'string' },
      manifest: { type: 'boolean' },
      html: { type: 'boolean' },
      'no-manifest': { type: 'boolean' },
      'no-html': { type: 'boolean' },
      concurrency: { type: 'string' },
      'dry-run': { type: 'boolean' },
      overwrite: { type: 'boolean' },
      json: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
      version: { type: 'boolean', short: 'v' },
    },
  });
}
export type CliValues = ReturnType<typeof parseCliArgs>['values'];
