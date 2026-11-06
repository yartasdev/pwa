import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import semver from 'semver';
import { PACKAGE_NAME, readRegistryPackage } from './release/version.mjs';

function stableVersion(version) {
  return semver.valid(version) === version && semver.prerelease(version) === null;
}

function validateContext(env) {
  if (env.GITHUB_ACTIONS !== 'true' || env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('GitHub releases are only created in GitHub Actions on main.');
  }

  if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY ?? '')) {
    throw new Error('A valid GitHub owner/repository is required.');
  }

  if (!env.GH_TOKEN) {
    throw new Error('GH_TOKEN is required to create GitHub releases.');
  }
}

/** GitHub error bodies explain permission and validation failures; keep them in the job log. */
async function errorDetail(response) {
  const text = await response.text().catch(() => '');
  try {
    const body = JSON.parse(text);
    const details = Array.isArray(body.errors) ? ` ${JSON.stringify(body.errors)}` : '';
    return `${body.message ?? 'no message'}${details}`;
  } catch {
    return text.slice(0, 500) || 'empty response';
  }
}

function releaseCandidates(registryPackage, env) {
  const candidates = new Map();

  for (const [version, metadata] of Object.entries(registryPackage?.versions ?? {})) {
    if (stableVersion(version) && /^[a-f\d]{40}$/i.test(metadata?.gitHead ?? '')) {
      candidates.set(version, metadata.gitHead);
    }
  }

  if (
    env.SHOULD_PUBLISH === 'true' &&
    stableVersion(env.RELEASE_VERSION) &&
    /^[a-f\d]{40}$/i.test(env.GITHUB_SHA ?? '')
  ) {
    candidates.set(env.RELEASE_VERSION, env.GITHUB_SHA);
  }

  return [...candidates.entries()].sort(([left], [right]) => semver.compare(left, right));
}

/**
 * Create the tag before the release. The releases API rejects GITHUB_TOKEN with HTTP 403
 * when target_commitish changes files under .github/workflows compared with main, because
 * that token cannot be granted workflows:write. A tag that already exists is reused.
 */
async function ensureTag(repository, tag, sha, fetchImpl, headers) {
  const response = await fetchImpl(`https://api.github.com/repos/${repository}/git/refs`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/tags/${tag}`, sha }),
  });

  if (response.ok) return;

  const detail = await errorDetail(response);
  if (response.status === 422 && /already exists/i.test(detail)) return;

  if (response.status !== 403) {
    throw new Error(`Cannot create tag ${tag} (HTTP ${response.status}): ${detail}`);
  }

  console.log(`Tag API denied ${tag}; creating it with git instead.`);
  execFileSync('git', ['tag', tag, sha], { stdio: 'inherit' });
  execFileSync('git', ['push', 'origin', `refs/tags/${tag}`], { stdio: 'inherit' });
}

/** Create a GitHub release for every stable npm version that does not have one yet. */
export async function createMissingGitHubReleases({ env = process.env, fetchImpl = fetch } = {}) {
  validateContext(env);

  const headers = {
    Authorization: `Bearer ${env.GH_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const repository = env.GITHUB_REPOSITORY;
  const candidates = releaseCandidates(await readRegistryPackage(fetchImpl), env);
  const latest = candidates.at(-1)?.[0];
  const created = [];

  for (const [version, sha] of candidates) {
    const tag = `v${version}`;
    const existing = await fetchImpl(
      `https://api.github.com/repos/${repository}/releases/tags/${tag}`,
      { headers },
    );

    if (existing.ok) continue;
    if (existing.status !== 404) {
      throw new Error(
        `Cannot read GitHub release ${tag} (HTTP ${existing.status}): ${await errorDetail(existing)}`,
      );
    }

    await ensureTag(repository, tag, sha, fetchImpl, headers);

    const response = await fetchImpl(`https://api.github.com/repos/${repository}/releases`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag_name: tag,
        name: `${PACKAGE_NAME}@${version}`,
        body: `Published [\`${PACKAGE_NAME}@${version}\`](https://www.npmjs.com/package/${PACKAGE_NAME}/v/${version}).\n\nSource commit: ${sha}`,
        make_latest: version === latest ? 'true' : 'false',
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Cannot create GitHub release ${tag} (HTTP ${response.status}): ${await errorDetail(response)}`,
      );
    }

    created.push(version);
    console.log(`Created GitHub release ${PACKAGE_NAME}@${version}`);
  }

  if (created.length === 0)
    console.log('GitHub releases already exist for every published version.');
  return created;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  createMissingGitHubReleases().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
