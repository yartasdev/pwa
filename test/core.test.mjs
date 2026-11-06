import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdtemp, readFile, writeFile, rm, readdir, mkdir, symlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  generateAssets,
  planAssets,
  writeAssets,
  createHtml,
  PwaError,
  IOS_DEVICES,
} from '../dist/esm/index.js';

const svg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><path fill="red" d="M0 0h100v50H0z"/></svg>',
);
const tinyDevice = { name: 'test-phone', width: 100, height: 200, pixelRatio: 2 };
const packageMetadata = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
);
const temp = async (fn) => {
  const dir = await mkdtemp(join(tmpdir(), 'pwa-test-'));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

test('defaults, custom sizes, URL paths and deterministic order', async () => {
  const opts = {
    input: svg,
    splash: false,
    manifest: true,
    html: true,
    publicPath: 'https://cdn.example.com/assets/',
    icons: { sizes: [128, 64, 64], ico: true },
  };
  const first = await generateAssets(opts);
  const second = await generateAssets({ ...opts, concurrency: 4 });
  assert.deepEqual(first.files, second.files);
  assert.deepEqual(
    first.assets.map((a) => a.data),
    second.assets.map((a) => a.data),
  );
  for (const asset of first.assets.filter((a) => a.mimeType === 'image/png')) {
    const metadata = await sharp(asset.data).metadata();
    assert.equal(metadata.width, asset.width);
    assert.equal(metadata.height, asset.height);
  }
  assert.equal(first.manifest.icons[0].src, 'https://cdn.example.com/assets/icons/icon-64x64.png');
  assert.ok(first.html.includes('apple-touch-icon'));
  assert.ok(first.html.includes('image/x-icon'));
});

test('regular icon preserves aspect and alpha; maskable square fits safe circle', async () => {
  const square = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><path fill="red" d="M0 0h64v64H0z"/></svg>',
  );
  const result = await generateAssets({
    input: square,
    splash: false,
    icons: { sizes: [100], maskableSizes: [100], apple: false, favicons: false },
    background: '#0000ff',
  });
  const mask = result.assets.find((a) => a.kind === 'maskable');
  const { data, info } = await sharp(mask.data)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const red = [];
  for (let y = 0; y < 100; y++)
    for (let x = 0; x < 100; x++) {
      const p = (y * 100 + x) * info.channels;
      assert.equal(data[p + 3], 255);
      if (data[p] > 200 && data[p + 2] < 50) red.push(Math.hypot(x + 0.5 - 50, y + 0.5 - 50));
    }
  assert.ok(red.length > 0);
  assert.ok(Math.max(...red) <= 40);
  const rectangle = await generateAssets({
    input: svg,
    splash: false,
    icons: { sizes: [100], maskable: false, apple: false, favicons: false },
  });
  const raw = await sharp(rectangle.assets[0].data).ensureAlpha().raw().toBuffer();
  assert.equal(raw[3], 0);
  assert.equal(raw[(50 * 100 + 50) * 4 + 3], 255);
});

test('splash orientation, density, dark media queries and opaque backgrounds', async () => {
  const result = await generateAssets({
    input: svg,
    icons: false,
    splash: { devices: [tinyDevice], darkBackground: '#000000' },
    manifest: false,
    html: true,
  });
  assert.deepEqual(
    result.images.map((i) => [i.width, i.height]),
    [
      [200, 400],
      [200, 400],
      [400, 200],
      [400, 200],
    ],
  );
  assert.equal(result.manifest, null);
  assert.ok(result.html.includes('(prefers-color-scheme: dark)'));
  assert.ok(!result.html.includes('rel="manifest"'));
  const pixels = await sharp(result.assets[1].data).ensureAlpha().raw().toBuffer();
  assert.deepEqual([...pixels.subarray(0, 4)], [0, 0, 0, 255]);
  const full = planAssets({ input: 'not-read.svg', icons: false, splash: {} });
  assert.equal(full.images.length, IOS_DEVICES.length * 2);
});

test('manifest preserves unrelated fields and icons, HTML escapes attributes', () => {
  const plan = planAssets({
    input: svg,
    html: true,
    publicPath: '/a&"b/',
    manifest: {
      name: 'Demo',
      custom: { x: 1 },
      icons: [{ src: '/old.png' }, { src: '/a&"b/icons/icon-192x192.png', sizes: '1x1' }],
    },
  });
  assert.equal(plan.manifest.name, 'Demo');
  assert.deepEqual(plan.manifest.custom, { x: 1 });
  assert.equal(
    plan.manifest.icons.filter((i) => i.src === '/a&"b/icons/icon-192x192.png').length,
    1,
  );
  assert.ok(plan.html.includes('/a&amp;&quot;b/'));
  assert.ok(createHtml([], '/', true).includes('href="/manifest.webmanifest"'));
});

test('ICO directory contains decodable 16,32,48 pixel PNG frames', async () => {
  const result = await generateAssets({ input: svg, splash: false, icons: { ico: true } });
  const data = result.assets.find((a) => a.kind === 'ico').data;
  assert.equal(data.readUInt16LE(0), 0);
  assert.equal(data.readUInt16LE(2), 1);
  assert.equal(data.readUInt16LE(4), 3);
  for (let index = 0; index < 3; index++) {
    const entry = 6 + index * 16;
    const frame = data.subarray(
      data.readUInt32LE(entry + 12),
      data.readUInt32LE(entry + 12) + data.readUInt32LE(entry + 8),
    );
    assert.equal((await sharp(frame).metadata()).width, [16, 32, 48][index]);
  }
});

test('invalid options and unreadable / oversized input produce typed errors', async () => {
  for (const options of [
    { input: '' },
    { input: svg, concurrency: 0 },
    { input: svg, icons: { sizes: [-1] } },
    { input: svg, icons: { padding: NaN } },
    { input: svg, background: 'not-a-color' },
    { input: svg, publicPath: 'javascript:bad' },
    { input: svg, icons: false, splash: false },
    { input: svg, splash: { devices: [tinyDevice, tinyDevice] } },
    { input: svg, splash: { devices: [{ ...tinyDevice, name: '../bad' }] } },
    { input: svg, splash: { devices: [{ ...tinyDevice, width: 8000, height: 8000 }] } },
    { input: svg, icons: { typo: true } },
    { input: svg, manifest: { icons: {} } },
  ])
    assert.throws(
      () => planAssets(options),
      (e) => e instanceof PwaError && e.code === 'INVALID_OPTIONS',
    );
  await assert.rejects(
    generateAssets({ input: Buffer.from('broken') }),
    (e) => e.code === 'INVALID_INPUT',
  );
  await assert.rejects(
    generateAssets({ input: svg, limitInputPixels: 10 }),
    (e) => e.code === 'INVALID_INPUT',
  );
  await assert.rejects(
    generateAssets({ input: '/missing/input.png' }),
    (e) => e.code === 'INVALID_INPUT',
  );
});

test('low resolution raster warning and no vector upscaling warning', async () => {
  const raster = await sharp({ create: { width: 8, height: 8, channels: 4, background: 'red' } })
    .png()
    .toBuffer();
  assert.equal((await generateAssets({ input: raster, splash: false })).warnings.length, 1);
  assert.equal((await generateAssets({ input: svg, splash: false })).warnings.length, 0);
});

test('write preflights collisions, preserves existing content and rejects traversal', async () =>
  temp(async (dir) => {
    const result = await generateAssets({ input: svg, splash: false });
    await mkdir(join(dir, 'icons'));
    await writeFile(join(dir, 'icons/maskable-icon-192x192.png'), 'existing');
    await assert.rejects(writeAssets(result, { outDir: dir }), (e) => e.code === 'OUTPUT_EXISTS');
    assert.deepEqual(await readdir(dir), ['icons']);
    assert.deepEqual(await readdir(join(dir, 'icons')), ['maskable-icon-192x192.png']);
    assert.equal(await readFile(join(dir, 'icons/maskable-icon-192x192.png'), 'utf8'), 'existing');
    const paths = await writeAssets(result, { outDir: dir, overwrite: true });
    assert.equal(paths.length, result.assets.length);
    for (const filename of [
      '../escape.png',
      '..\\escape.png',
      'CON.png',
      'icons/../../escape.png',
      '/absolute.png',
      'icons//bad.png',
      'icons/CON.png',
    ])
      await assert.rejects(
        writeAssets({ assets: [{ filename, data: svg }] }, { outDir: dir }),
        (e) => e.code === 'INVALID_OPTIONS',
      );
  }));

const cli = resolve('dist/esm/cli.js');
function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
}
test('CLI help, version, dry run and JSON error exit codes', () => {
  assert.match(run(['--help']).stdout, /Usage:/);
  assert.equal(run(['--version']).stdout.trim(), packageMetadata.version);
  const dry = run(['generate', 'does-not-exist.svg', '--dry-run', '--json']);
  assert.equal(dry.status, 0, dry.stderr);
  assert.equal(JSON.parse(dry.stdout).dryRun, true);
  assert.equal(JSON.parse(dry.stdout).images.length, 55);
  const invalid = run(['--wat', '--json']);
  assert.equal(invalid.status, 2);
  assert.equal(JSON.parse(invalid.stderr).error.code, 'INVALID_OPTIONS');
  assert.equal(run(['bad.png', '--json']).status, 1);
});

test('CLI config relative paths, overrides, collision and API equivalence', async () =>
  temp(async (dir) => {
    await writeFile(join(dir, 'logo.svg'), svg);
    const config = {
      input: './logo.svg',
      outDir: './output',
      splash: false,
      publicPath: '/assets/',
      icons: { sizes: [64], maskable: false, apple: false, favicons: false },
    };
    await writeFile(join(dir, 'pwa.json'), JSON.stringify(config));
    const args = ['--config', join(dir, 'pwa.json'), '--sizes', '96', '--json'];
    const generated = run(args);
    assert.equal(generated.status, 0, generated.stderr);
    const api = await generateAssets({
      input: svg,
      splash: false,
      publicPath: '/assets/',
      icons: { ...config.icons, sizes: [96] },
    });
    for (const asset of api.assets)
      assert.deepEqual(await readFile(join(dir, 'output', asset.filename)), asset.data);
    assert.equal(run(args).status, 1);
    assert.equal(run([...args, '--overwrite']).status, 0);
  }));

test('CommonJS require entry exports same API', async () => {
  const require = createRequire(import.meta.url);
  const cjs = require('../dist/cjs/index.js');
  assert.deepEqual(cjs.planAssets({ input: svg }).files, planAssets({ input: svg }).files);
  assert.equal((await cjs.generateAssets({ input: svg, splash: false })).assets.length, 15);
});

test('default output exactly matches all 55 requested images with correct paths and dimensions', async () =>
  temp(async (dir) => {
    const regular = [72, 96, 128, 144, 152, 192, 384, 512].map(
      (size) => `icons/icon-${size}x${size}.png`,
    );
    const maskable = [192, 384, 512].map((size) => `icons/maskable-icon-${size}x${size}.png`);
    const apple = [180, 167, 152, 120].map(
      (size) => `apple-touch-icons/apple-touch-icon-${size}x${size}.png`,
    );
    const portrait = [
      '1320x2868',
      '1206x2622',
      '1290x2796',
      '1179x2556',
      '1284x2778',
      '1170x2532',
      '1080x2340',
      '1242x2688',
      '1125x2436',
      '828x1792',
      '1242x2208',
      '750x1334',
      '2064x2752',
      '1668x2420',
      '2048x2732',
      '1668x2388',
      '1640x2360',
      '1620x2160',
      '1488x2266',
      '1536x2048',
    ];
    const splash = portrait.flatMap((size) => [
      `splash/apple-splash-${size}.png`,
      `splash/apple-splash-${size.split('x').reverse().join('x')}.png`,
    ]);
    const expected = [...regular, ...maskable, ...apple, ...splash].sort();
    const result = await generateAssets({ input: svg });
    assert.deepEqual(result.images.map((image) => image.filename).sort(), expected);
    assert.equal(result.assets.length, 55);
    await writeAssets(result, { outDir: dir });
    assert.deepEqual((await readdir(dir)).sort(), ['apple-touch-icons', 'icons', 'splash']);
    for (const filename of expected) {
      const metadata = await sharp(await readFile(join(dir, filename))).metadata();
      const [width, height] = filename
        .match(/(\d+)x(\d+)\.png$/)
        .slice(1)
        .map(Number);
      assert.equal(metadata.width, width, filename);
      assert.equal(metadata.height, height, filename);
    }
    assert.equal(result.manifest, null);
    assert.equal(result.html, '');
    const metadata = planAssets({ input: svg, manifest: true, html: true });
    assert.equal(metadata.manifest.icons.length, 11);
    assert.ok(metadata.manifest.icons.every((icon) => icon.src.startsWith('/pwa/icons/')));
    for (const filename of [...apple, ...splash])
      assert.ok(metadata.html.includes(`/pwa/${filename}`), filename);
  }));

test('manifest and index.html are independent opt-in outputs', async () =>
  temp(async (dir) => {
    const base = {
      input: svg,
      splash: false,
      icons: { sizes: [32], maskable: false, apple: false },
    };

    for (const manifest of [false, true]) {
      for (const html of [false, true]) {
        const result = await generateAssets({ ...base, manifest, html });
        const outDir = join(dir, `${manifest}-${html}`);
        await writeAssets(result, { outDir });
        const files = await readdir(outDir);
        assert.equal(files.includes('manifest.webmanifest'), manifest);
        assert.equal(files.includes('index.html'), html);
        assert.equal(result.files.includes('pwa-head.html'), false);
        if (html) {
          const document = await readFile(join(outDir, 'index.html'), 'utf8');
          assert.ok(document.startsWith('<!doctype html>'));
          assert.equal(document.includes('rel="manifest"'), manifest);
        }
      }
    }

    const named = planAssets({ ...base, manifest: { name: '<App & "Name">' }, html: true });
    assert.ok(named.html.includes('<title>&lt;App &amp; &quot;Name&quot;&gt;</title>'));
  }));

test('CLI config and flags control optional metadata files', async () =>
  temp(async (dir) => {
    await writeFile(
      join(dir, 'pwa.json'),
      JSON.stringify({ input: './missing.svg', manifest: { name: 'Configured' }, html: true }),
    );
    const args = ['--config', join(dir, 'pwa.json'), '--dry-run'];
    const configured = run(args);
    assert.equal(configured.status, 0, configured.stderr);
    assert.ok(JSON.parse(configured.stdout).files.includes('index.html'));
    const disabled = run([...args, '--no-manifest', '--no-html']);
    assert.equal(disabled.status, 0, disabled.stderr);
    assert.equal(JSON.parse(disabled.stdout).files.includes('index.html'), false);
    assert.equal(JSON.parse(disabled.stdout).manifest, null);
    const enabled = run(['./missing.svg', '--dry-run', '--manifest', '--html']);
    assert.equal(enabled.status, 0, enabled.stderr);
    assert.ok(JSON.parse(enabled.stdout).files.includes('manifest.webmanifest'));
    assert.ok(JSON.parse(enabled.stdout).files.includes('index.html'));
  }));

test('nested output rejects symlink directories and conflicting file/directory paths', async () =>
  temp(async (dir) => {
    const root = join(dir, 'output');
    const outside = join(dir, 'outside');
    await mkdir(root);
    await mkdir(outside);
    await symlink(outside, join(root, 'icons'), process.platform === 'win32' ? 'junction' : 'dir');
    await assert.rejects(
      writeAssets(
        { assets: [{ filename: 'icons/test.png', data: svg }] },
        { outDir: root, overwrite: true },
      ),
      (e) => e.code === 'OUTPUT_EXISTS',
    );
    assert.deepEqual(await readdir(outside), []);
    await assert.rejects(
      writeAssets(
        {
          assets: [
            { filename: 'other', data: svg },
            { filename: 'other/test.png', data: svg },
          ],
        },
        { outDir: root },
      ),
      (e) => e.code === 'INVALID_OPTIONS',
    );
  }));
