import { PwaError } from './errors.js';
import { planAssets } from './plan.js';
import { encodeIco } from './images/ico.js';
import { loadSource } from './images/source.js';
import { createRenderer } from './images/render.js';
import type { GenerateOptions, GenerateResult, GeneratedAsset } from './types.js';

export async function generateAssets(options: GenerateOptions): Promise<GenerateResult> {
  const plan = planAssets(options);
  const loaded = await loadSource(options);
  const { render, warnings } = createRenderer(options, plan, loaded);
  const assets: GeneratedAsset[] = new Array(plan.images.length);
  let next = 0;

  try {
    await Promise.all(
      Array.from({ length: Math.min(options.concurrency ?? 2, plan.images.length) }, async () => {
        while (next < plan.images.length) {
          const index = next++;
          const image = plan.images[index]!;
          const data =
            image.kind === 'ico'
              ? encodeIco(await Promise.all([16, 32, 48].map((size) => render(image, size, size))))
              : await render(image);
          assets[index] = {
            filename: image.filename,
            kind: image.kind,
            width: image.width,
            height: image.height,
            mimeType: image.kind === 'ico' ? 'image/x-icon' : 'image/png',
            data,
          };
        }
      }),
    );
  } catch (cause) {
    throw new PwaError(
      'GENERATION_FAILED',
      `Image generation failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
  }

  if (plan.manifest) {
    assets.push({
      filename: 'manifest.webmanifest',
      mimeType: 'application/manifest+json',
      data: Buffer.from(JSON.stringify(plan.manifest, null, 2) + '\n'),
    });
  }

  if (plan.html) {
    assets.push({ filename: 'index.html', mimeType: 'text/html', data: Buffer.from(plan.html) });
  }

  return { ...plan, assets, warnings };
}
