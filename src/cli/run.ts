import { generateAssets, planAssets, writeAssets } from '../index.js';
import { PwaError } from '../errors.js';
import { parseCliArgs, HELP } from './arguments.js';
import { resolveCliConfig } from './config.js';

export async function runCli(args: string[], version: string): Promise<void> {
  const { values, positionals } = parseCliArgs(args);
  if (values.help) {
    console.log(HELP);
    return;
  }
  if (values.version) {
    console.log(version);
    return;
  }
  const { options, outDir, overwrite } = await resolveCliConfig(values, positionals);
  if (values['dry-run']) {
    const plan = planAssets(options);
    console.log(JSON.stringify({ dryRun: true, outDir, ...plan }, null, 2));
    return;
  }
  const result = await generateAssets(options);
  const files = await writeAssets(result, { outDir, overwrite });
  if (values.json)
    console.log(
      JSON.stringify({ files, warnings: result.warnings, manifest: result.manifest }, null, 2),
    );
  else {
    console.log(`Generated ${files.length} files in ${outDir}`);
    for (const warning of result.warnings) console.error(`Warning: ${warning}`);
  }
}

export function reportCliError(error: unknown): void {
  const argumentError =
    error instanceof Error && 'code' in error && String(error.code).startsWith('ERR_PARSE_ARGS');
  const code = error instanceof PwaError ? error.code : argumentError ? 'INVALID_OPTIONS' : 'ERROR';
  const message = error instanceof Error ? error.message : String(error);
  if (process.argv.includes('--json')) console.error(JSON.stringify({ error: { code, message } }));
  else console.error(`pwa: ${message}`);
  process.exitCode = code === 'INVALID_OPTIONS' ? 2 : 1;
}
