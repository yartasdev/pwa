import sharp from 'sharp';
import { PwaError } from '../errors.js';
import type { GenerateOptions } from '../types.js';

export async function loadSource(options: GenerateOptions) {
  const limitInputPixels = options.limitInputPixels ?? 40_000_000;
  let source: Buffer;
  let sourceWidth: number;
  let sourceHeight: number;
  let vector = false;
  try {
    const input = sharp(options.input, { limitInputPixels, failOn: 'warning' });
    const metadata = await input.metadata();
    if (
      !['png', 'jpeg', 'webp', 'svg', 'avif', 'tiff', 'gif', 'heif'].includes(metadata.format ?? '')
    )
      throw new Error('Unsupported image format.');
    if ((metadata.pages ?? 1) > 1)
      throw new Error(
        'Animated and multi-page images are not supported; supply a single still image.',
      );
    vector = metadata.format === 'svg';
    const normalized = await input.rotate().png().toBuffer({ resolveWithObject: true });
    source = normalized.data;
    sourceWidth = normalized.info.width;
    sourceHeight = normalized.info.height;
  } catch (cause) {
    throw new PwaError(
      'INVALID_INPUT',
      `Cannot read input image: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
  }

  return { source, sourceWidth, sourceHeight, vector, limitInputPixels };
}
export type LoadedSource = Awaited<ReturnType<typeof loadSource>>;
