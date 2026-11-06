import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

const npmCli = process.env.npm_execpath;
assert.ok(npmCli, 'Run with npm run test:package');
const root = resolve('.');
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const packageSpecifier = JSON.stringify(pkg.name);
const cache = join(root, '.tmp/npm-cache');
await mkdir(join(root, '.tmp'), { recursive: true });
function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  assert.equal(result.status, 0, `${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
const packed = JSON.parse(
  run(process.execPath, [
    npmCli,
    'pack',
    '--ignore-scripts',
    '--json',
    '--pack-destination',
    '.tmp',
    '--cache',
    cache,
  ]),
);
const tarball = join(root, '.tmp', packed[0].filename);
assert.ok(
  packed[0].files.every(
    (file) =>
      !file.path.startsWith('.tmp/') &&
      !file.path.startsWith('test/') &&
      !file.path.startsWith('node_modules/'),
  ),
);
const consumer = await mkdtemp(join(root, '.tmp/package-consumer-'));
await writeFile(
  join(consumer, 'package.json'),
  JSON.stringify({ name: 'pwa-package-consumer', private: true, type: 'module' }),
);
run(
  process.execPath,
  [npmCli, 'install', tarball, '--no-audit', '--no-fund', '--cache', cache],
  consumer,
);
await writeFile(
  join(consumer, 'smoke.mjs'),
  `
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { generateAssets, writeAssets } from ${packageSpecifier};
const require = createRequire(import.meta.url);
assert.equal(typeof require(${packageSpecifier}).generateAssets, 'function');
const input = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="red"/></svg>');
const result = await generateAssets({ input, splash: false, manifest: true, html: true });
assert.equal(result.assets.length, 17);
await writeAssets(result, { outDir: './output' });
console.log('Installed ESM/CommonJS generation passed');
`,
);
console.log(run(process.execPath, ['smoke.mjs'], consumer).trim());
for (const ext of ['mts', 'cts'])
  await writeFile(
    join(consumer, `types.${ext}`),
    `
import { generateAssets, type GenerateResult } from ${packageSpecifier};
const result: Promise<GenerateResult> = generateAssets({ input: Buffer.from('test'), icons: { sizes: [192] } });
// @ts-expect-error sizes must be numeric
generateAssets({ input: 'test.svg', icons: { sizes: ['192'] } });
void result;
`,
  );
await writeFile(
  join(consumer, 'tsconfig.json'),
  JSON.stringify({
    compilerOptions: {
      noEmit: true,
      strict: true,
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      target: 'ES2022',
    },
    include: ['types.mts', 'types.cts'],
  }),
);
run(
  process.execPath,
  [join(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'],
  consumer,
);
assert.match(
  run(process.execPath, [npmCli, 'exec', '--offline', '--', 'pwa', '--help'], consumer),
  /Usage:/,
);
const version = pkg.version;
assert.equal(
  run(process.execPath, [npmCli, 'exec', '--offline', '--', 'pwa', '--version'], consumer).trim(),
  version,
);
console.log(
  `Package exports, declarations, CLI bin and archive contents passed.\nArchive: ${tarball}`,
);
