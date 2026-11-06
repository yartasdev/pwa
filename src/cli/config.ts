import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { PwaError, invalid } from '../errors.js';
import { object } from '../planning/validation.js';
import type { GenerateOptions, IconOptions, SplashOptions } from '../types.js';
import type { CliValues } from './arguments.js';

export async function resolveCliConfig(values: CliValues, positionals: string[]) {
  const args = [...positionals];
  const command = ['generate', 'icons', 'splash'].includes(args[0] ?? '')
    ? args.shift()!
    : 'generate';
  if (args.length > 1) invalid('Expected one input path. Use --help for usage.');
  if (values.landscape && values.portrait) invalid('Choose either --portrait or --landscape.');
  if (values.splash && values['no-splash']) invalid('--splash conflicts with --no-splash.');

  let config: Record<string, unknown> = {};
  let configDir = process.cwd();

  if (values.config) {
    const path = resolve(values.config);
    configDir = dirname(path);
    try {
      config = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
    } catch (cause) {
      throw new PwaError('INVALID_OPTIONS', `Cannot read JSON config: ${values.config}`, { cause });
    }
    object(config, 'config', [
      'input',
      'outDir',
      'overwrite',
      'icons',
      'splash',
      'manifest',
      'html',
      'publicPath',
      'background',
      'concurrency',
      'limitInputPixels',
    ]);
  }

  const { outDir: configOutDir, overwrite: configOverwrite, ...generation } = config;

  if (config.input !== undefined && typeof config.input !== 'string')
    invalid('Config input must be a file path.');
  if (configOutDir !== undefined && typeof configOutDir !== 'string')
    invalid('Config outDir must be a path.');
  if (configOverwrite !== undefined && typeof configOverwrite !== 'boolean')
    invalid('Config overwrite must be boolean.');

  const input = args[0]
    ? resolve(args[0])
    : typeof config.input === 'string'
      ? resolve(configDir, config.input)
      : '';

  const options = { ...generation, input } as GenerateOptions;

  if (values['public-path'] !== undefined) options.publicPath = values['public-path'];
  if (values.background !== undefined) options.background = values.background;
  if (values.concurrency !== undefined) options.concurrency = Number(values.concurrency);
  if (values.manifest) options.manifest = options.manifest || true;
  if (values.html) options.html = true;
  if (values['no-manifest']) options.manifest = false;
  if (values['no-html']) options.html = false;

  const iconFlags =
    values.sizes !== undefined ||
    values.padding !== undefined ||
    values.ico ||
    values['no-maskable'] ||
    values['no-apple'] ||
    values.favicons ||
    values['no-favicons'];

  if (iconFlags) {
    if (options.icons !== undefined && options.icons !== false) object(options.icons, 'icons');
    const icons: IconOptions = { ...(options.icons || {}) };
    if (values.sizes !== undefined) icons.sizes = values.sizes.split(',').map(Number);
    if (values.padding !== undefined) icons.padding = Number(values.padding);
    if (values.ico) icons.ico = true;
    if (values['no-maskable']) icons.maskable = false;
    if (values['no-apple']) icons.apple = false;
    if (values.favicons) icons.favicons = true;
    if (values['no-favicons']) icons.favicons = false;
    options.icons = icons;
  }

  const splashFlags =
    values.splash ||
    values.landscape ||
    values.portrait ||
    values['dark-background'] !== undefined ||
    values['logo-scale'] !== undefined;

  if (splashFlags || command === 'splash') {
    if (options.splash !== undefined && options.splash !== false) object(options.splash, 'splash');
    const splash: SplashOptions = { ...(options.splash || {}) };
    if (values.landscape) splash.orientations = ['landscape'];
    if (values.portrait) splash.orientations = ['portrait'];
    if (values['dark-background'] !== undefined) splash.darkBackground = values['dark-background'];
    if (values['logo-scale'] !== undefined) splash.logoScale = Number(values['logo-scale']);
    options.splash = splash;
  }

  if (command === 'icons' || values['no-splash']) options.splash = false;
  if (command === 'splash' || values['no-icons']) options.icons = false;

  const outDir =
    values['out-dir'] !== undefined
      ? resolve(values['out-dir'])
      : configOutDir !== undefined
        ? resolve(configDir, configOutDir as string)
        : resolve('pwa-assets');

  return {
    options,
    outDir,
    overwrite: values.overwrite ?? (configOverwrite as boolean | undefined) ?? false,
  };
}
