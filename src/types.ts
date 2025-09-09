// Types shared between scrape script and web app

export interface Asset {
  downloadUrl: string;
  downloadCount: number;
  architecture: string;
}

export interface Release {
  version: string;
  publishedAt: string;
  // each jaspVersionRange can have own latest release
  jaspVersionRange?: string;
  assets: Asset[];
}

export interface Repository {
  name: string;
  shortDescriptionHTML: string;
  homepageUrl?: string;
  releases: Release[];
  preReleases: Release[];
  // Parent organization from which repo was forked to https://github.com/jasp-stats-modules/
  organization: string;
  // repo (nameWithOwner format) in https://github.com/jasp-stats-modules/modules-registry
  // where submodule is pointing to
  releaseSource: string;
  // directories in which the submodule are located
  channels: string[];
}
