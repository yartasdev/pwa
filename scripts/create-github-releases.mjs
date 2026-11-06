import { execFileSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
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

/** Push a tag that already points at a commit on main. The token stays out of the command line. */
export function pushTagWithGit(tag, sha, token) {
  const gitEnv = { ...process.env };
  if (token) {
    gitEnv.GIT_CONFIG_COUNT = '1';
    gitEnv.GIT_CONFIG_KEY_0 = 'http.extraheader';
    gitEnv.GIT_CONFIG_VALUE_0 = `AUTHORIZATION: bearer ${token}`;
  }

  const git = (args) => execFileSync('git', args, { encoding: 'utf8', env: gitEnv });

  try {
    git(['tag', tag, sha]);
  } catch (error) {
    const stderr = `${error.stderr ?? ''}`;
    if (!/already exists/i.test(stderr)) {
      throw new Error(`Cannot tag ${tag}: ${stderr || 'git tag failed'}`);
    }
  }

  try {
    git(['push', 'origin', `refs/tags/${tag}`]);
  } catch (error) {
    const stderr = `${error.stderr ?? ''}`;
    throw new Error(`Cannot push ${tag}: ${stderr || 'git push failed'}`);
  }
}

/**
 * Create the tag before the release. The releases API returns 403 for GITHUB_TOKEN when it
 * has to create a tag whose commit differs under .github/workflows from main. Pushing that
 * tag with git, then creating the release against the existing tag, avoids that check.
 */
async function ensureTag(repository, tag, sha, fetchImpl, headers, pushTag) {
  const response = await fetchImpl(`https://api.github.com/repos/${repository}/git/refs`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/tags/${tag}`, sha }),
  });

  if (response.ok) return;

  const detail = await errorDetail(response);
  if (response.status === 422 && /already exists/i.test(detail)) return;

  console.log(`Tag API could not create ${tag} (HTTP ${response.status}): ${detail}`);
  pushTag(tag, sha);
}

/** Create a GitHub release for every stable npm version that does not have one yet. */
export async function createMissingGitHubReleases({
  env = process.env,
  fetchImpl = fetch,
  pushTag = (tag, sha) => pushTagWithGit(tag, sha, env.GH_TOKEN),
} = {}) {
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
  const failures = [];

  for (const [version, sha] of candidates) {
    const tag = `v${version}`;
    try {
      const didCreate = await createReleaseForVersion({
        version,
        sha,
        tag,
        latest,
        repository,
        headers,
        fetchImpl,
        pushTag,
      });
      if (didCreate) created.push(version);
    } catch (error) {
      const message = `${tag}: ${error.message}`;
      failures.push(message);
      console.log(`::error::${message}`);
    }
  }

  if (failures.length > 0) {
    if (env.GITHUB_STEP_SUMMARY) {
      await appendFile(
        env.GITHUB_STEP_SUMMARY,
        failures.map((failure) => `- ${failure}`).join('\n') + '\n',
      );
    }
    throw new Error(failures.join('\n'));
  }

  if (created.length === 0)
    console.log('GitHub releases already exist for every published version.');
  return created;
}

async function createReleaseForVersion({
  version,
  sha,
  tag,
  latest,
  repository,
  headers,
  fetchImpl,
  pushTag,
}) {
  const existing = await fetchImpl(
    `https://api.github.com/repos/${repository}/releases/tags/${tag}`,
    { headers },
  );

  if (existing.ok) return false;
  if (existing.status !== 404) {
    throw new Error(
      `Cannot read GitHub release ${tag} (HTTP ${existing.status}): ${await errorDetail(existing)}`,
    );
  }

  await ensureTag(repository, tag, sha, fetchImpl, headers, pushTag);

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

  console.log(`Created GitHub release ${PACKAGE_NAME}@${version}`);
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  createMissingGitHubReleases().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
