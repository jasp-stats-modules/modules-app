# Contributing guidelines

We welcome any kind of contributions to our software, from [simple
comment or question](https://jasp-stats.org/2018/03/29/request-feature-report-bug-jasp/) to a full fledged [pull
request](https://help.github.com/articles/about-pull-requests/). 

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## You want to make a release

This section is for maintainers of the package.

1. Make sure the `src/index.json` file is up to date with the latest JASP modules and their release assets.
   - You can do this by running the `pnpm scrape` command.
2. Update the version in `package.json` file
   - Follow [Semantic Versioning](https://semver.org/) guidelines.
3. Check author information in `CITATION.cff` file
   - Make sure the author information is correct and up to date.
4. Commit the changes and push to the main branch.
5. Create a new release on GitHub:
   - Go to the [Releases page](https://github.com/jasp-stats-modules/modules-app/releases).
   - Click on "Draft a new release".
   - Use the version number as the tag name (e.g., `v0.1.0`).
   - Fill in the release title and description.
   - Make sure to include the changes made in this release.
   - Click on "Publish release".
6. Check that Zenodo has created a new DOI for the release.

## You want to develop web app inside JASP stats

To develop/test the Qt WebChannel integration, you must run the web app inside JASP stats desktop application.

1. Start development server with `pnpm dev --host 0.0.0.0`.
2. Compile JASP using instructions at https://github.com/jasp-escience/jasp-desktop/blob/webchannel-test/Docs/development/jasp-build-guide-linux.md#build--run-inside-the-container .
3. Start JASP desktop application.
4. In Preferences > Advanced, set **Module library URL** to url that is accessable by JASP desktop. For example "http://172.17.0.1:3000"
5. Open the module menu. You should see your web app loading inside JASP with [HMR](https://vite.dev/guide/features.html#hot-module-replacement).

<!-- TODO adjust build instructions url to main repo and branch when merged. -->

## Technology Stack

The web application is a [single page application (SPA)](https://en.wikipedia.org/wiki/Single-page_application) that is built
with [React](https://reactjs.org/) and [TypeScript](https://www.typescriptlang.org/) and uses:

- [Vite](https://vitejs.dev/) as the build tool
- [pnpm](https://pnpm.io/) as the package manager
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [nuqs](https://nuqs.dev/) for URL query string parsing
- [Qt WebChannel](https://doc.qt.io/qt-6/qtwebchannel-index.html) for communication between the web app and the JASP desktop app
- [biome](https://biomejs.dev/) for linting and formatting
- [intlayer](https://intlayer.org/) for multi language support. Unique texts of modules themselves are not translated.
- [Vitest](https://vitest.dev/) for testing both unit and browser tests
- [Base UI](https://base-ui.com/) for accessible unstyled UI components

The [scrape script](./src/scrape.ts) is a Node.js script that:

- Fetches data from the [GitHub GraphQL API](https://docs.github.com/en/graphql) to get available JASP modules and their release assets

## Building For Production

To build run:

```bash
pnpm scrape
pnpm build
```

The built files will be in the `dist` folder, can be hosted on any static file server like GitHub Pages or use `pnpm serve` to host locally.

## Testing

You can run the unit tests with:

```bash
pnpm test
```

You can run the [browser tests](https://vitest.dev/guide/browser/) with:

```bash
# Run once to install browser binaries
pnpm exec playwright install chromium
# Then run the browser tests interactively
pnpm test:browser
# Or run tests once with
pnpm test:browser run
```

To get code coverage report run:

```bash
pnpm test run --coverage --coverage.reportsDirectory=./coverage/unit
pnpm test:browser run --coverage --coverage.reportsDirectory=./coverage/browser
```

To keep track of code coverage over time the [.github/badges/](.github/badges/) directory is updated on each run on the main branch in the [GitHub Actions test workflow](.github/workflows/test.yml).

The browser tests use a [public/test.json](public/test.json) as catalog file which can also be used in browser with
[http://localhost:3000/?c=test.json](http://localhost:3000/?c=test.json&a=MacOS_arm64).

## Linting and Formatting

Can be typechecked with:

```bash
pnpm typecheck
```

Can be formatted and linted with:

```bash
pnpm check
```

## Multi language Support

The `./intlayer.config.ts` file contains list of supported locales.
Translations are stored in `src/**/*.content.tsx` files.

The linting is done with TypeScript.
Types for translations can be generated with:

- `pnpm dev` or
- `pnpm typecheck` or
- `pnpx intlayer build` or
- [VS code extension](https://intlayer.org/doc/vs-code-extension)

## AI Disclaimer

The documentation/software code in this repository has been partly generated and/or refined using
GitHub CoPilot. All AI-output has been verified for correctness,
accuracy and completeness, adapted where needed, and approved by the author.
