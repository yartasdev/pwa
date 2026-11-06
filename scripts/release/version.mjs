import semver from 'semver';

export const PACKAGE_NAME = '@yartasdev/pwa';
export const REGISTRY_URL = 'https://registry.npmjs.org/';

function stableVersion(version) {
  return semver.valid(version) === version && semver.prerelease(version) === null;
}

/** Prefer an intentional major/minor bump; otherwise advance the latest stable patch. */
export function selectReleaseVersion(baseVersion, registryPackage, commit) {
  if (!stableVersion(baseVersion)) {
    throw new Error('Automatic releases require a stable package.json version.');
  }

  const versions = Object.entries(registryPackage?.versions ?? {});
  const previousRelease = versions
    .filter(([version, metadata]) => stableVersion(version) && metadata.gitHead === commit)
    .sort(([left], [right]) => semver.rcompare(left, right))[0];

  if (previousRelease) {
    return { version: previousRelease[0], shouldPublish: false };
  }

  const latestStable = versions
    .map(([version]) => version)
    .filter(stableVersion)
    .sort(semver.rcompare)[0];

  const version =
    !latestStable || semver.gt(baseVersion, latestStable)
      ? baseVersion
      : semver.inc(latestStable, 'patch');

  if (!version) {
    throw new Error('Could not calculate the next patch version.');
  }

  return { version, shouldPublish: true };
}

export async function readRegistryPackage(fetchImpl = fetch) {
  const response = await fetchImpl(`${REGISTRY_URL}${encodeURIComponent(PACKAGE_NAME)}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Cannot read npm package metadata (HTTP ${response.status}).`);
  }

  const metadata = await response.json();

  if (
    !metadata ||
    metadata.name !== PACKAGE_NAME ||
    !metadata.versions ||
    typeof metadata.versions !== 'object' ||
    Array.isArray(metadata.versions) ||
    Object.values(metadata.versions).some(
      (version) => !version || typeof version !== 'object' || Array.isArray(version),
    )
  ) {
    throw new Error('The npm registry returned invalid package metadata.');
  }

  return metadata;
}
