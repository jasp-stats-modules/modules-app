export interface SubModule {
  owner: string;
  repo: string;
  nameWithOwner: string;
}
export interface ChanelledSubModule extends SubModule {
  channel: string;
}

export type Repos = Record<string, SubModule[]>;

export interface ReleaseAsset {
  downloadUrl: string;
  downloadCount: number;
  architecture: string;
}

export interface Release {
  tagName: string;
  publishedAt: string;
  jaspVersionRange?: string;
  assets: ReleaseAsset[];
}

export interface Repository {
  name: string;
  shortDescriptionHTML: string;
  // each jaspVersionRange can have own latest release
  latest: Release[];
  preRelease: Release[];
  organization: string;
}

export interface RepoReleaseAssets {
  [key: string]: Repository;
}

export type Releases = Record<
  string,
  {
    shortDescriptionHTML: string;
    releases: Release[];
  }
>;
