# npm Publishing Guide

The package ID is **`@yartasdev/pwa`**, the CLI command is **`pwa`**, and the first version is **`0.1.0`**. No release was published during this preparation.

## Local checks

```sh
npm ci
npm run format:check
npm run release:check
npm run pack:dry-run
```

`release:check` validates the source formatting and types, runs the visual/CLI tests, inspects the archive contents, and installs the archive into a separate consumer project. It checks ESM, CommonJS, type resolution, and the installed CLI. These commands do not publish anything; the test install may read the registry to download dependencies.

To create a real local archive, run `npm pack`. You can install the resulting `yartasdev-pwa-0.1.0.tgz` file into another project:

```sh
npm install /real/path/to/yartasdev-pwa-0.1.0.tgz
```

`pack:check` is a technical package validation; it does not check whether your npm account has permission for the scope. You must publish with an account or organization that owns the `@yartasdev` scope.

## Package settings

- `publishConfig.registry`: `https://registry.npmjs.org/`.
- `publishConfig.access`: `public`.
- `publishConfig.tag`: `latest`. For pre-releases, deliberately choose a separate tag such as `next`.
- `files`: compiled ESM/CommonJS, `src` for source maps, examples, README, changelog, license, and this guide.
- `.npmrc`: registry and lockfile settings; contains no tokens.
- `prepublishOnly`: runs `release:check` first when a publish starts.
- License: ISC, copyright holder `yartasdev`.

Because the `files` allow-list is used, no separate `.npmignore` is kept. The package check verifies that development and credential files such as `.env`, `.npmrc`, `.tmp`, `.github`, tests, and `node_modules` do not end up in the archive.

The manifest and HTML are application outputs and are independent of the npm metadata. By default, generation produces only the 55 images. If `manifest: true` or a manifest object is set in the config, or `html: true` is added, `manifest.webmanifest` and `index.html` are also generated. The example config enables both explicitly.

## When the GitHub repository is created

Since there was no repository yet, no placeholder URLs were written into the `repository`, `homepage`, and `bugs` fields. Once the repository exists, replace `YOUR_REPOSITORY` and, if necessary, the account part below with the real values:

```sh
npm pkg set "repository.type=git" "repository.url=git+https://github.com/yartasdev/YOUR_REPOSITORY.git"
npm pkg set "homepage=https://github.com/yartasdev/YOUR_REPOSITORY#readme"
npm pkg set "bugs.url=https://github.com/yartasdev/YOUR_REPOSITORY/issues"
npm install --package-lock-only
npm run format
```

If the GitHub username differs from the npm scope, use the real GitHub account in the repository URL. The release preparation in CI automatically adds these fields to the published package from the real `GITHUB_REPOSITORY` value. You may still complete the metadata above to keep the links in the source repository up to date. Creating the Git repository, adding a remote, and pushing were not performed as part of this preparation.

## CI

`.github/workflows/ci.yml` runs `release:check` on Node.js 22 and 24 across a Windows/Linux matrix, for branch pushes other than `main`, for pull requests targeting `main`, and for manual runs. It contains no publish step. Pushes to `main` run the same checks inside `.github/workflows/release.yml`, so the same CI matrix is not duplicated.

Formatting is defined by `.prettierrc.json` and `.editorconfig`:

```sh
npm run format
npm run format:check
```

## Manual local publishing

When you are ready, use your own account to check the account and versions with `npm login`, `npm whoami`, and `npm view @yartasdev/pwa versions --json`. A 404 may be returned for a new package; do not interpret network or permission errors as the name being available. Complete whichever 2FA method the npm account requires for publishing, and do not add tokens to the repository.

Update the `Unreleased` heading in `CHANGELOG.md` with the release date. The same name/version pair cannot be published twice; for later releases, update the version number and the lockfile together. `npm version patch` can also create a commit and tag in the Git repository; choose that according to your own release flow.

**The command below performs a real publish; it is not run during preparation:**

```sh
npm publish --access public
```

## Automatic CI/CD on main

`.github/workflows/release.yml` runs automatically on every push to the `main` branch. You can also restart it manually from `main` with `workflow_dispatch`. A manual run does not take a version input. The former `NPM_PUBLISH_ENABLED` gate has been removed; no variable needs to be enabled for publishing.

Flow:

1. The pushed commit is validated on Node.js 22/24 across the Windows/Linux matrix. If even one check fails, the publish job does not run.
2. The publish job reads the existing versions and source commit SHAs from the npm registry.
3. If the same commit was already published, the publish is skipped. Registry access, permission, or data errors are not treated as a new package; the process stops.
4. On the first release, `package.json.version` is used. For later releases, the patch value of the highest stable version on npm is incremented: `0.1.0 → 0.1.1 → 0.1.2`.
5. If the version in the source is higher, for example `0.2.0`, that value is used. This is how you deliberately choose a major/minor bump. The automatic flow does not accept prerelease versions as the baseline.
6. The `package.json` and lockfile on the runner are updated together. The package carries the real GitHub repository URL and the `gitHead` source SHA.
7. `npm publish` first runs the `prepublishOnly` checks against the updated version, then publishes to npm with the `NPM_TOKEN` repository secret.

The version change is made only in the temporary runner checkout; no bot commit or Git tag is written to the `main` branch. Because of this, the source version may stay the same after each patch release; the version in the registry is the base for the next release. Publish jobs are queued through a concurrency queue; a running job is not cancelled, and at most 100 pending runs are kept. If a single push contains multiple commits, one version is produced for the latest commit in the push.

If a concurrent manual publish is made outside the workflow, npm may reject the version conflict. In that case, re-run the workflow; previously successful publishes are skipped by the SHA check. A failed npm publish is not automatically retried with a different version.

## One-time setup on GitHub and npm

1. Create the GitHub repository, upload these files, and use `main` as the working branch.
2. In GitHub Settings → Environments, create an environment named `npm` and restrict its deployment branches to `main`. If you want fully automatic publishing, do not add required reviewers or wait timers.
3. Add an npm automation token as the repository secret `NPM_TOKEN`. The publish job passes it to npm as `NODE_AUTH_TOKEN`. The token needs publish access to the `@yartasdev` scope, and it must not be committed.
4. For subsequent pushes to `main`, versioning and publishing are managed automatically. You can also restart a failed run from `main`.

The workflow uses npm 11. You can configure branch protection and required PR checks for `main` on GitHub; the local YAML cannot create account or repository settings by itself. Provenance was not enabled for this token-based publish.

Official sources: [package.json](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/), [npm pack](https://docs.npmjs.com/cli/commands/npm-pack/), [npm publish](https://docs.npmjs.com/cli/commands/npm-publish/), [scoped public packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/), [access tokens](https://docs.npmjs.com/creating-and-viewing-access-tokens).
