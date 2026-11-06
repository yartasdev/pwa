import { invalid } from '../errors.js';
import type { AssetKind, PlannedAsset } from '../types.js';
import { integer } from './validation.js';

export function createAsset(
  kind: AssetKind,
  width: number,
  height: number,
  background: string,
  padding: number,
  name: string,
  media?: string,
): PlannedAsset {
  integer(width, 'output width');
  integer(height, 'output height');

  if (width * height > 40_000_000) {
    invalid('An output image cannot exceed 40 million pixels.');
  }

  const directory = kind === 'apple' ? 'apple-touch-icons' : kind === 'splash' ? 'splash' : 'icons';

  return {
    kind,
    width,
    height,
    background,
    padding,
    filename: `${directory}/${name}`,
    ...(media ? { media } : {}),
  };
}
