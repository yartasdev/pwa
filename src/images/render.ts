import sharp from 'sharp';
import type { GenerateOptions, AssetPlan, PlannedAsset } from '../types.js';
import type { LoadedSource } from './source.js';

export function createRenderer(options: GenerateOptions, plan: AssetPlan, loaded: LoadedSource) {
  const { source, sourceWidth, sourceHeight, vector, limitInputPixels } = loaded;
  const warnings: string[] = [];
  if (
    !vector &&
    plan.images.some((image) => {
      const box = Math.max(
        1,
        Math.floor(Math.min(image.width, image.height) * (1 - 2 * image.padding)),
      );
      return Math.min(box / sourceWidth, box / sourceHeight) > 1;
    })
  )
    warnings.push(
      'The source is smaller than at least one target logo; upscaling may reduce image quality.',
    );
  // Re-render vectors at each target resolution rather than upscaling the normalized raster.
  const render = async (
    image: PlannedAsset,
    width = image.width,
    height = image.height,
  ): Promise<Buffer> => {
    const box = Math.max(1, Math.floor(Math.min(width, height) * (1 - 2 * image.padding)));
    const logo = await sharp(vector ? options.input : source, {
      limitInputPixels,
      ...(vector
        ? {
            density: Math.min(2400, Math.max(72, (72 * box) / Math.max(sourceWidth, sourceHeight))),
          }
        : {}),
    })
      .resize(box, box, { fit: 'inside' })
      .png()
      .toBuffer();
    const opaque = ['maskable', 'apple', 'splash'].includes(image.kind);
    return sharp({ create: { width, height, channels: 4, background: image.background } })
      .composite([{ input: logo, gravity: 'centre' }])
      .flatten(
        opaque
          ? { background: image.background === 'transparent' ? '#ffffff' : image.background }
          : false,
      )
      .png()
      .toBuffer();
  };

  return { render, warnings };
}
