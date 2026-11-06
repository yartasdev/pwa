import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parse } from 'yaml';
import { prepareRelease } from '../scripts/prepare-release.mjs';
import {
  PACKAGE_NAME,
  readRegistryPackage,
  selectReleaseVersion,
} from '../scripts/release/version.mjs';

const sourceCommit = 'a'.repeat(40);
const otherCommit = 'b'.repeat(40);
const registry = (versions) => ({ name: PACKAGE_NAME, versions });
const response = (metadata, status = 200) => new Response(JSON.stringify(metadata), { status });

test('first release uses the checked-in stable version', () => {
  assert.deepEqual(selectReleaseVersion('0.1.0', null, sourceCommit), {
    version: '0.1.0',
    shouldPublish: true,
  });
});

test('automatic patch versions use the highest stable registry version', () => {
  const metadata = registry({
    '0.1.9': {},
    '0.1.10': {},
    '0.1.2': {},
    '1.0.0-beta.1': {},
  });

  assert.equal(selectReleaseVersion('0.1.0', metadata, sourceCommit).version, '0.1.11');
  assert.equal(selectReleaseVersion('0.1.10', metadata, sourceCommit).version, '0.1.11');
  assert.equal(selectReleaseVersion('0.2.0', metadata, sourceCommit).version, '0.2.0');
  assert.equal(selectReleaseVersion('1.0.0', metadata, sourceCommit).version, '1.0.0');
});

test('a published commit is skipped even after newer commits have been released', () => {
  const metadata = registry({
    '0.1.1': { gitHead: sourceCommit },
    '0.1.2': { gitHead: otherCommit },
  });

  assert.deepEqual(selectReleaseVersion('0.1.0', metadata, sourceCommit), {
    version: '0.1.1',
    shouldPublish: false,
  });
});

test('automatic releases reject non-stable or invalid baseline versions', () => {
  for (const version of ['invalid', 'v1.2.3', '1.0.0-beta.1', '1.0']) {
    assert.throws(() => selectReleaseVersion(version, null, sourceCommit), /stable/);
  }
});

test('registry reads request complete metadata and treat only 404 as a new package', async () => {
  const metadata = registry({ '0.1.0': {} });
  const result = await readRegistryPackage(async (url, options) => {
    assert.equal(url, 'https://registry.npmjs.org/%40yartasdev%2Fpwa');
    assert.equal(options.headers.Accept, 'application/json');
    assert.equal(options.headers.Authorization, undefined);
    assert.ok(options.signal instanceof AbortSignal);
    return response(metadata);
  });

  assert.deepEqual(result, metadata);
  assert.equal(await readRegistryPackage(async () => response({ error: 'not found' }, 404)), null);

  for (const status of [401, 403, 429, 500, 503]) {
    await assert.rejects(
      readRegistryPackage(async () => response({ error: 'unavailable' }, status)),
      new RegExp(`HTTP ${status}`),
    );
  }

  await assert.rejects(
    readRegistryPackage(async () => {
      throw new Error('Network failure');
    }),
    /Network failure/,
  );
});

test('malformed registry responses stop release preparation', async () => {
  for (const metadata of [
    null,
    {},
    { name: 'another-package', versions: {} },
    { name: PACKAGE_NAME, versions: [] },
    { name: PACKAGE_NAME, versions: { '0.1.0': null } },
  ]) {
    await assert.rejects(
      readRegistryPackage(async () => response(metadata)),
      /invalid package/,
    );
  }
});

async function withCheckout(run) {
  const root = await mkdtemp(join(tmpdir(), 'pwa-release-test-'));
  const pkg = { name: PACKAGE_NAME, version: '0.1.0', dependencies: { sharp: '^0.35.5' } };
  const lock = {
    name: PACKAGE_NAME,
    version: '0.1.0',
    lockfileVersion: 3,
    packages: { '': { ...pkg }, 'node_modules/sharp': { version: '0.35.5' } },
  };
  const env = {
    GITHUB_ACTIONS: 'true',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_EVENT_NAME: 'push',
    GITHUB_SHA: sourceCommit,
    GITHUB_REPOSITORY: 'example-owner/example-repo',
    GITHUB_SERVER_URL: 'https://github.com',
    GITHUB_OUTPUT: join(root, 'outputs'),
  };

  await writeFile(join(root, 'package.json'), JSON.stringify(pkg));
  await writeFile(join(root, 'package-lock.json'), JSON.stringify(lock));

  try {
    await run({ root, env, pkg, lock });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('preparation updates only runner metadata and keeps package and lockfile in sync', async () => {
  await withCheckout(async ({ root, env, lock }) => {
    const result = await prepareRelease({
      root,
      env,
      fetchImpl: async () => response(registry({ '0.1.8': { gitHead: otherCommit } })),
    });

    assert.deepEqual(result, { version: '0.1.9', shouldPublish: true });
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    const updatedLock = JSON.parse(await readFile(join(root, 'package-lock.json'), 'utf8'));

    assert.equal(pkg.version, '0.1.9');
    assert.equal(pkg.gitHead, sourceCommit);
    assert.equal(pkg.repository.url, 'git+https://github.com/example-owner/example-repo.git');
    assert.equal(pkg.homepage, 'https://github.com/example-owner/example-repo#readme');
    assert.equal(pkg.bugs.url, 'https://github.com/example-owner/example-repo/issues');
    assert.equal(updatedLock.version, pkg.version);
    assert.equal(updatedLock.packages[''].version, pkg.version);
    assert.deepEqual(
      updatedLock.packages['node_modules/sharp'],
      lock.packages['node_modules/sharp'],
    );
    assert.equal(await readFile(env.GITHUB_OUTPUT, 'utf8'), 'version=0.1.9\nshould_publish=true\n');
  });
});

test('rerunning a published commit does not change the checkout', async () => {
  await withCheckout(async ({ root, env }) => {
    const original = await readFile(join(root, 'package.json'), 'utf8');
    const result = await prepareRelease({
      root,
      env,
      fetchImpl: async () => response(registry({ '0.1.1': { gitHead: sourceCommit } })),
    });

    assert.equal(result.shouldPublish, false);
    assert.equal(await readFile(join(root, 'package.json'), 'utf8'), original);
    assert.equal(
      await readFile(env.GITHUB_OUTPUT, 'utf8'),
      'version=0.1.1\nshould_publish=false\n',
    );
  });
});

test('local, pull request and non-main contexts are rejected before registry access', async () => {
  await withCheckout(async ({ root, env }) => {
    const overrides = [
      { GITHUB_ACTIONS: 'false' },
      { GITHUB_REF: 'refs/heads/feature' },
      { GITHUB_EVENT_NAME: 'pull_request' },
      { GITHUB_SHA: 'bad' },
      { GITHUB_REPOSITORY: '../bad' },
    ];

    for (const override of overrides) {
      await assert.rejects(
        prepareRelease({
          root,
          env: { ...env, ...override },
          fetchImpl: () => assert.fail('Registry must not be contacted.'),
        }),
      );
    }
  });
});

test('release workflow runs on main, waits for the full matrix and serializes publishing', async () => {
  const workflow = parse(await readFile('.github/workflows/release.yml', 'utf8'));

  assert.deepEqual(workflow.on.push.branches, ['main']);
  assert.equal(workflow.concurrency['cancel-in-progress'], false);
  assert.equal(workflow.concurrency.queue, 'max');
  assert.equal(workflow.jobs.publish.needs, 'validate');
  assert.deepEqual(workflow.jobs.validate.strategy.matrix.node, [22, 24]);
  assert.deepEqual(workflow.jobs.validate.strategy.matrix.os, ['ubuntu-latest', 'windows-latest']);
  assert.equal(workflow.jobs.publish.permissions['id-token'], 'write');
  assert.equal(workflow.jobs.publish.permissions.contents, 'read');
  assert.equal(workflow.jobs.publish.environment, 'npm');
  assert.ok(!JSON.stringify(workflow).includes('NPM_PUBLISH_ENABLED'));

  const publish = workflow.jobs.publish.steps.find(
    (step) => step.run === 'npm publish --access public',
  );
  assert.equal(publish.if, "steps.release.outputs.should_publish == 'true'");
  const ci = parse(await readFile('.github/workflows/ci.yml', 'utf8'));
  assert.deepEqual(ci.on.push['branches-ignore'], ['main']);
  assert.deepEqual(ci.on.pull_request.branches, ['main']);
});
