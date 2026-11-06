import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const pkg = JSON.parse(await readFile('package.json', 'utf8'));
assert.ok(process.env.npm_execpath, 'Run using an npm script.');
assert.equal(pkg.publishConfig?.registry, 'https://registry.npmjs.org/');
assert.equal(pkg.publishConfig?.access, 'public');
assert.equal(pkg.license, 'ISC');
assert.notEqual(pkg.private, true, 'A private package cannot be published.');
assert.match(pkg.name, /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/);
assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/);
const packed = spawnSync(
  process.execPath,
  [
    process.env.npm_execpath,
    'pack',
    '--dry-run',
    '--ignore-scripts',
    '--json',
    '--cache',
    resolve('.tmp/npm-cache'),
  ],
  { encoding: 'utf8' },
);
assert.equal(packed.status, 0, packed.stderr);
const [archive] = JSON.parse(packed.stdout);
const files = new Set(archive.files.map((file) => file.path));
const allowedRoots = new Set(['dist', 'src', 'examples']);
const allowedFiles = new Set([
  'package.json',
  'README.md',
  'PUBLISHING.md',
  'CHANGELOG.md',
  'LICENSE',
]);
for (const path of files) {
  assert.ok(
    allowedFiles.has(path) || allowedRoots.has(path.split('/')[0]),
    `Unexpected archive entry: ${path}`,
  );
  assert.ok(
    !/(^|\/)(\.env(?:\..*)?|\.npmrc|node_modules|\.git|\.tmp)(\/|$)/.test(path),
    `Unwanted archive entry: ${path}`,
  );
}
for (const path of allowedFiles) assert.ok(files.has(path), `Missing package document: ${path}`);
const entryPoints = [pkg.main, pkg.module, pkg.types, pkg.bin.pwa];
for (const branch of [pkg.exports['.'].import, pkg.exports['.'].require])
  entryPoints.push(branch.types, branch.default);
for (const entry of entryPoints)
  assert.ok(files.has(entry.replace(/^\.\//, '')), `Missing entry point: ${entry}`);
assert.equal(JSON.parse(await readFile('dist/cjs/package.json', 'utf8')).type, 'commonjs');
assert.ok(
  (await readFile(pkg.bin.pwa, 'utf8')).startsWith('#!/usr/bin/env node\n'),
  'CLI must have a Node shebang.',
);
assert.ok(files.has('examples/logo.svg') && files.has('examples/pwa.config.json'));
console.log(
  `Archive check passed: ${archive.name}@${archive.version}, ${files.size} files, ${archive.size} bytes packed.`,
);
if (!pkg.repository?.url)
  console.warn(
    'Repository metadata is pending until the GitHub repository is created; see PUBLISHING.md.',
  );
