import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PACKAGE_NAME, readRegistryPackage, selectReleaseVersion } from './release/version.mjs';

function validateContext(env) {
  if (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('Release preparation is only allowed in GitHub Actions on main.');
  }

  if (!['push', 'workflow_dispatch'].includes(env.GITHUB_EVENT_NAME)) {
    throw new Error('Unsupported event for release preparation.');
  }

  if (!/^[a-f\d]{40}$/i.test(env.GITHUB_SHA ?? '')) {
    throw new Error('A full source commit SHA is required.');
  }

  if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY ?? '')) {
    throw new Error('A valid GitHub owner/repository is required.');
  }

  if (env.GITHUB_SERVER_URL && env.GITHUB_SERVER_URL !== 'https://github.com') {
    throw new Error('This trusted publishing workflow targets github.com repositories.');
  }
}

/** Prepare an ephemeral runner checkout. This function never publishes or commits. */
export async function prepareRelease({
  root = process.cwd(),
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  validateContext(env);

  const packagePath = resolve(root, 'package.json');
  const lockPath = resolve(root, 'package-lock.json');
  const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
  const lock = JSON.parse(await readFile(lockPath, 'utf8'));

  if (pkg.name !== PACKAGE_NAME || lock.name !== PACKAGE_NAME) {
    throw new Error(`Expected package and lockfile name to be ${PACKAGE_NAME}.`);
  }

  if (!lock.packages?.[''] || lock.packages[''].version !== pkg.version) {
    throw new Error('The lockfile root must match package.json before preparing a release.');
  }

  const registryPackage = await readRegistryPackage(fetchImpl);
  const release = selectReleaseVersion(pkg.version, registryPackage, env.GITHUB_SHA);

  if (release.shouldPublish) {
    const repositoryUrl = `https://github.com/${env.GITHUB_REPOSITORY}`;

    pkg.version = release.version;
    pkg.gitHead = env.GITHUB_SHA;
    pkg.repository = { type: 'git', url: `git+${repositoryUrl}.git` };
    pkg.homepage = `${repositoryUrl}#readme`;
    pkg.bugs = { url: `${repositoryUrl}/issues` };

    lock.version = release.version;
    lock.packages[''].version = release.version;

    await writeFile(packagePath, JSON.stringify(pkg, null, 2) + '\n');
    await writeFile(lockPath, JSON.stringify(lock, null, 2) + '\n');
  }

  if (env.GITHUB_OUTPUT) {
    await appendFile(
      env.GITHUB_OUTPUT,
      `version=${release.version}\nshould_publish=${release.shouldPublish}\n`,
    );
  }

  return release;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  prepareRelease()
    .then(({ version, shouldPublish }) => {
      console.log(
        `${shouldPublish ? 'Prepared' : 'Already published'}: ${PACKAGE_NAME}@${version}`,
      );
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
