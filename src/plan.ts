import { invalid } from './errors.js';
import { createHtmlDocument, createManifest } from './metadata.js';
import { planIcons } from './planning/icons.js';
import { planSplash } from './planning/splash.js';
import { object, integer, boolean, color } from './planning/validation.js';
import type { AssetPlan, GenerateOptions } from './types.js';

const OPTION_KEYS = [
  'input',
  'icons',
  'splash',
  'manifest',
  'html',
  'publicPath',
  'background',
  'concurrency',
  'limitInputPixels',
];

function validateOptions(options: GenerateOptions): void {
  object(options, 'generation', OPTION_KEYS);

  const hasPath = typeof options.input === 'string' && options.input.trim();
  const hasBuffer = Buffer.isBuffer(options.input) && options.input.length > 0;

  if (!hasPath && !hasBuffer) {
    invalid('input must be a nonempty file path or Buffer.');
  }

  integer(options.concurrency ?? 2, 'concurrency', 16);
  integer(options.limitInputPixels ?? 40_000_000, 'limitInputPixels', 268_402_689);
  boolean(options.html, 'html');
  color(options.background ?? '#ffffff', 'background');

  const base = options.publicPath ?? '/pwa/';
  const hasUnsupportedScheme = /^[a-z][a-z\d+.-]*:/i.test(base) && !/^https?:\/\//i.test(base);

  if (typeof base !== 'string' || !base || /[\\?#\s]/.test(base) || hasUnsupportedScheme) {
    invalid(
      'publicPath must be a URL path or HTTP(S) URL without query, hash, whitespace or backslashes.',
    );
  }

  if (options.manifest !== undefined && typeof options.manifest !== 'boolean') {
    object(options.manifest, 'manifest');

    if (options.manifest.icons !== undefined && !Array.isArray(options.manifest.icons)) {
      invalid('manifest.icons must be an array.');
    }
  }
}

export function planAssets(options: GenerateOptions): AssetPlan {
  validateOptions(options);

  const images = [...planIcons(options), ...planSplash(options)];
  const names = images.map((image) => image.filename);

  if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) {
    invalid('Device definitions produce duplicate output filenames.');
  }
  if (images.length === 0) {
    invalid('Enable at least one image output.');
  }
  if (images.length > 256) {
    invalid('A generation run is limited to 256 images.');
  }

  const background = options.background ?? '#ffffff';
  const base = options.publicPath ?? '/pwa/';
  const manifestEnabled = options.manifest !== undefined && options.manifest !== false;
  const manifest = manifestEnabled
    ? createManifest(images, base, {
        background_color: background,
        theme_color: background,
        ...(typeof options.manifest === 'object' ? options.manifest : {}),
      })
    : null;

  try {
    JSON.stringify(manifest);
  } catch {
    invalid('manifest must be JSON serializable.');
  }

  const html = options.html === true ? createHtmlDocument(images, base, manifest) : '';

  return {
    images,
    manifest,
    html,
    files: [
      ...names,
      ...(manifest ? ['manifest.webmanifest'] : []),
      ...(html ? ['index.html'] : []),
    ],
  };
}
