#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { runCli, reportCliError } from './cli/run.js';

async function main(): Promise<void> {
  const metadata = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  );
  await runCli(process.argv.slice(2), metadata.version);
}

main().catch(reportCliError);
