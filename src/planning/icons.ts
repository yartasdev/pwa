import { invalid } from '../errors.js';
import { object, boolean, fraction, color, sizes } from './validation.js';
import type { GenerateOptions, PlannedAsset } from '../types.js';
import { createAsset } from './assets.js';

export function planIcons(options: GenerateOptions): PlannedAsset[] {
  if (options.icons === false) {
    return [];
  }

  const images: PlannedAsset[] = [];
  const background = options.background ?? '#ffffff';
  const add = (...args: Parameters<typeof createAsset>) => images.push(createAsset(...args));
  const icon = options.icons ?? {};

  object(icon, 'icons', [
    'preset',
    'sizes',
    'maskable',
    'maskableSizes',
    'apple',
    'appleSizes',
    'favicons',
    'faviconSizes',
    'ico',
    'padding',
    'background',
    'maskableBackground',
  ]);
  if (icon.preset !== undefined && icon.preset !== 'pwa') {
    invalid('Unknown icon preset.');
  }

  for (const key of ['maskable', 'apple', 'favicons', 'ico'] as const) {
    boolean(icon[key], `icons.${key}`);
  }

  const padding = icon.padding ?? 0;
  fraction(padding, 'icons.padding', 0, 0.45);

  const bg = icon.background ?? 'transparent';
  const maskBg = icon.maskableBackground ?? background;
  color(bg, 'icons.background');
  color(maskBg, 'icons.maskableBackground');

  for (const size of sizes(icon.sizes, [72, 96, 128, 144, 152, 192, 384, 512], 'icons.sizes')) {
    add('icon', size, size, bg, padding, `icon-${size}x${size}.png`);
  }

  if (icon.maskable !== false) {
    for (const size of sizes(icon.maskableSizes, [192, 384, 512], 'icons.maskableSizes')) {
      // A square inscribed in the 80%-diameter safe circle has side 0.8 / sqrt(2).
      add(
        'maskable',
        size,
        size,
        maskBg,
        Math.max(padding, (1 - 0.8 / Math.SQRT2) / 2),
        `maskable-icon-${size}x${size}.png`,
      );
    }
  }

  if (icon.apple !== false) {
    for (const size of sizes(icon.appleSizes, [120, 152, 167, 180], 'icons.appleSizes')) {
      add('apple', size, size, background, padding, `apple-touch-icon-${size}x${size}.png`);
    }
  }

  if (icon.favicons === true) {
    for (const size of sizes(icon.faviconSizes, [16, 32, 48], 'icons.faviconSizes')) {
      add('favicon', size, size, bg, padding, `favicon-${size}x${size}.png`);
    }
  }

  if (icon.ico === true) {
    add('ico', 48, 48, bg, padding, 'favicon.ico');
  }

  return images;
}
