import { invalid } from '../errors.js';
import { IOS_DEVICES } from '../presets.js';
import { object, integer, fraction, color } from './validation.js';
import type { GenerateOptions, PlannedAsset } from '../types.js';
import { createAsset } from './assets.js';

export function planSplash(options: GenerateOptions): PlannedAsset[] {
  if (options.splash === false) return [];
  const images: PlannedAsset[] = [];
  const background = options.background ?? '#ffffff';
  const add = (...args: Parameters<typeof createAsset>) => images.push(createAsset(...args));
  const splash = options.splash ?? {};
  object(splash, 'splash', [
    'preset',
    'devices',
    'orientations',
    'logoScale',
    'background',
    'darkBackground',
  ]);
  if (splash.preset !== undefined && splash.preset !== 'ios') invalid('Unknown splash preset.');
  const devices = splash.devices ?? IOS_DEVICES;
  if (!Array.isArray(devices) || devices.length === 0 || devices.length > 64)
    invalid('splash.devices must contain 1–64 devices.');
  const orientations = splash.orientations ?? ['portrait', 'landscape'];
  if (
    !Array.isArray(orientations) ||
    orientations.length === 0 ||
    orientations.some((o) => o !== 'portrait' && o !== 'landscape')
  )
    invalid('Invalid splash orientations.');
  const scale = splash.logoScale ?? 0.25;
  fraction(scale, 'splash.logoScale', 0.01, 1);
  const bg = splash.background ?? background;
  color(bg, 'splash.background');
  if (splash.darkBackground !== undefined) color(splash.darkBackground, 'splash.darkBackground');
  for (const device of devices) {
    object(device, 'device', ['name', 'width', 'height', 'pixelRatio']);
    if (typeof device.name !== 'string' || !/^[a-z\d][a-z\d-]{0,63}$/i.test(device.name))
      invalid('Device name must contain letters, digits or hyphens.');
    integer(device.width, 'device.width');
    integer(device.height, 'device.height');
    if (device.width > device.height) invalid('Device dimensions must be in portrait orientation.');
    fraction(device.pixelRatio, 'device.pixelRatio', 1, 4);
    for (const orientation of new Set(orientations)) {
      const width = Math.round(
        (orientation === 'portrait' ? device.width : device.height) * device.pixelRatio,
      );
      const height = Math.round(
        (orientation === 'portrait' ? device.height : device.width) * device.pixelRatio,
      );
      const query = `(device-width: ${device.width}px) and (device-height: ${device.height}px) and (-webkit-device-pixel-ratio: ${device.pixelRatio}) and (orientation: ${orientation})`;
      for (const theme of splash.darkBackground === undefined ? ['light'] : ['light', 'dark']) {
        const media = `${query}${splash.darkBackground === undefined ? '' : ` and (prefers-color-scheme: ${theme})`}`;
        add(
          'splash',
          width,
          height,
          theme === 'dark' ? splash.darkBackground! : bg,
          (1 - scale) / 2,
          `apple-splash-${width}x${height}${theme === 'dark' ? '-dark' : ''}.png`,
          media,
        );
      }
    }
  }

  return images;
}
