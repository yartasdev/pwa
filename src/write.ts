import { lstat, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { PwaError, invalid } from './errors.js';
import type { GenerateResult, WriteOptions } from './types.js';

/** Preflight all names and collisions before writing. Existing files require explicit overwrite. */
export async function writeAssets(
  result: Pick<GenerateResult, 'assets'>,
  options: WriteOptions,
): Promise<string[]> {
  if (typeof options.outDir !== 'string' || !options.outDir.trim())
    invalid('outDir must be a nonempty path.');
  if (options.overwrite !== undefined && typeof options.overwrite !== 'boolean')
    invalid('overwrite must be boolean.');
  const root = resolve(options.outDir);
  const names = new Set<string>();
  const paths: string[] = [];
  for (const asset of result.assets) {
    if (
      typeof asset.filename !== 'string' ||
      asset.filename
        .split('/')
        .some(
          (part) =>
            !part ||
            /[\\:<>"|?*\x00-\x1f]/.test(part) ||
            part === '.' ||
            part === '..' ||
            /[. ]$/.test(part) ||
            /^(con|prn|aux|nul|com\d|lpt\d)(\.|$)/i.test(part),
        )
    )
      invalid('Asset filenames must be safe relative paths using forward slashes.');
    const key = asset.filename.toLowerCase();
    if (names.has(key)) invalid('Duplicate output filenames.');
    names.add(key);
    paths.push(resolve(root, asset.filename));
  }
  for (const name of names) {
    const parts = name.split('/');
    for (let i = 1; i < parts.length; i++)
      if (names.has(parts.slice(0, i).join('/')))
        invalid('An output file cannot also be an output directory.');
  }
  try {
    const parents = new Set<string>([root]);
    for (const path of paths) {
      let parent = dirname(path);
      while (parent !== root) {
        if (relative(root, parent).startsWith('..'))
          invalid('Output path must stay within outDir.');
        parents.add(parent);
        parent = dirname(parent);
      }
    }
    for (const parent of parents) {
      const existing = await lstat(parent).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return null;
        throw error;
      });
      if (existing && (existing.isSymbolicLink() || !existing.isDirectory()))
        throw new PwaError(
          'OUTPUT_EXISTS',
          `Output directory is not a regular directory: ${parent}`,
        );
    }
    for (const path of paths) {
      const existing = await lstat(path).catch((error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return null;
        throw error;
      });
      if (existing && (!options.overwrite || !existing.isFile() || existing.isSymbolicLink()))
        throw new PwaError(
          'OUTPUT_EXISTS',
          `Output already exists or is not a regular file: ${path}`,
        );
    }
    await mkdir(root, { recursive: true });
    for (const parent of parents) await mkdir(parent, { recursive: true });
    for (let i = 0; i < paths.length; i++)
      await writeFile(paths[i]!, result.assets[i]!.data, { flag: options.overwrite ? 'w' : 'wx' });
    return paths;
  } catch (cause) {
    if (cause instanceof PwaError) throw cause;
    throw new PwaError(
      'WRITE_FAILED',
      `Cannot write assets: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
  }
}
