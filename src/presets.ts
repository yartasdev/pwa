import type { DevicePreset } from './types.js';

/** Screen geometry groups, not an exhaustive list of device marketing names. */
export const IOS_DEVICES: readonly Readonly<DevicePreset>[] = Object.freeze(
  [
    { name: 'iphone-compact', width: 375, height: 667, pixelRatio: 2 },
    { name: 'iphone-plus', width: 414, height: 736, pixelRatio: 3 },
    { name: 'iphone-notch', width: 375, height: 812, pixelRatio: 3 },
    { name: 'iphone-mini', width: 360, height: 780, pixelRatio: 3 },
    { name: 'iphone-xr', width: 414, height: 896, pixelRatio: 2 },
    { name: 'iphone-max', width: 414, height: 896, pixelRatio: 3 },
    { name: 'iphone-390', width: 390, height: 844, pixelRatio: 3 },
    { name: 'iphone-428', width: 428, height: 926, pixelRatio: 3 },
    { name: 'iphone-393', width: 393, height: 852, pixelRatio: 3 },
    { name: 'iphone-430', width: 430, height: 932, pixelRatio: 3 },
    { name: 'iphone-402', width: 402, height: 874, pixelRatio: 3 },
    { name: 'iphone-440', width: 440, height: 956, pixelRatio: 3 },
    { name: 'ipad-mini', width: 768, height: 1024, pixelRatio: 2 },
    { name: 'ipad-mini-6', width: 744, height: 1133, pixelRatio: 2 },
    { name: 'ipad-810', width: 810, height: 1080, pixelRatio: 2 },
    { name: 'ipad-air', width: 820, height: 1180, pixelRatio: 2 },
    { name: 'ipad-834', width: 834, height: 1194, pixelRatio: 2 },
    { name: 'ipad-pro-11', width: 834, height: 1210, pixelRatio: 2 },
    { name: 'ipad-pro-13', width: 1032, height: 1376, pixelRatio: 2 },
    { name: 'ipad-pro-12', width: 1024, height: 1366, pixelRatio: 2 },
  ].map((device) => Object.freeze(device)),
);
