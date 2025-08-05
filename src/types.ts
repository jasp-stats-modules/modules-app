

export interface SubModule {
  owner: string;
  repo: string;
  nameWithOwner: string;
}
export interface ChanelledSubModule extends SubModule {
  channel: string;
}

export type Repos = Record<string, SubModule[]>;
interface ReleaseAsset {
  downloadUrl: string;
  name: string;
  downloadCount: number;
}

export interface Release {
  tagName: string;
  name: string;
  isLatest: boolean;
  isPrerelease: boolean;
  isDraft: boolean;
  publishedAt: string;
  releaseAssets: {
    nodes: ReleaseAsset[];
  };
}

export interface Repository {
  nameWithOwner: string;
  shortDescriptionHTML: string;
  releases: {
    nodes: Release[];
  };
}

export interface RepoReleaseAssets {
  [key: string]: Repository;
}

export type Releases = Record<string, {
  shortDescriptionHTML: string;
  releases: Release[];
}>;
