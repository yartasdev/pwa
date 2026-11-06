import { rm, mkdir, writeFile, cp } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await rm(new URL('../dist', import.meta.url), { recursive: true, force: true });
await rm(new URL('../.tmp/cjs-src', import.meta.url), { recursive: true, force: true });
await cp(new URL('../src', import.meta.url), new URL('../.tmp/cjs-src', import.meta.url), {
  recursive: true,
  filter: (path) => !String(path).endsWith('cli.ts'),
});
await writeFile(new URL('../.tmp/cjs-src/package.json', import.meta.url), '{"type":"commonjs"}\n');
for (const project of ['tsconfig.json', 'tsconfig.cjs.json']) {
  const result = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', project], {
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
await mkdir(new URL('../dist/cjs', import.meta.url), { recursive: true });
await writeFile(new URL('../dist/cjs/package.json', import.meta.url), '{"type":"commonjs"}\n');
