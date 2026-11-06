# Development and releases

```sh
npm ci
npm run docs:dev
npm run format
npm run check
npm run test:package
npm run pack:check
npm run release:check
```

`release:check` runs source/image and release-version tests, checks package contents and installs the packed archive in a consumer project to verify ESM, CommonJS, declarations and the CLI. It does not publish locally.

Every push to `main` starts the release workflow. Its Node.js 22/24 Windows/Linux matrix must pass before the publish job runs. The first release uses `package.json.version`; subsequent releases advance the highest stable npm version by one patch unless the checked-in version is already higher. Re-running a published source commit skips publishing. Repository metadata and the source commit SHA are added to the runner's package, and version changes are not committed back to `main`.

The release workflow publishes with the repository secret `NPM_TOKEN` after the GitHub repository and `npm` environment are configured. There is no `NPM_PUBLISH_ENABLED` switch. Pull requests and other branches run validation without publishing.

See [CHANGELOG.md](https://github.com/yartasdev/pwa/blob/main/CHANGELOG.md) for release notes.

## License

[ISC](https://github.com/yartasdev/pwa/blob/main/LICENSE).
