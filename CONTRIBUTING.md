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
