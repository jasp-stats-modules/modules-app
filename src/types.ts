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

export type Lang = string; // ISO 639-1 code, e.g. 'en', 'fr', 'de', etc.
export interface Translation {
  name: string;
  description: string;
}
export type Translations = Record<Lang, Translation>;

export interface Repository {
  translations: Translations;
  id: string; // GitHub repo name
  name: string; // Human readable name from Description.qml
  description: string; // description from Description.qml
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

export interface Submodule {
  git_url: string;
  path: string;
  name: string;
  description: string;
  translations: Translations;
}
