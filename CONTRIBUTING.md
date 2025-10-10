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

To develop/test the qt webchannel integration, you must run the web app inside JASP stats desktop application.

1. Start development server with `pnpm dev --host 0.0.0.0`.
2. In ../jasp-desktop/Desktop/components/JASP/Widgets/ModulesMenu.qml file in WebEngineView section, set **url** to url that is accessable by JASP desktop and comment out the production url. For example "http://172.17.0.1:3000"
5. Follow JASP compile and run instructions at https://github.com/jasp-escience/jasp-desktop/blob/webchannel-test/Docs/development/jasp-build-guide-linux.md#build--run-inside-the-container .
6. Open the module menu. You should see your web app loading inside JASP with [HMR](https://vite.dev/guide/features.html#hot-module-replacement).

<!-- TODO adjust build instructions url to main branch when merged. -->
