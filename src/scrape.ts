import { Octokit } from "@octokit/core";
import { paginateGraphQL, type PageInfoForward } from "@octokit/plugin-paginate-graphql";
import fs from 'fs/promises';
import type { ChanelledSubModule, Releases, RepoReleaseAssets, Release, Repos } from "./types";


const MyOctokit = Octokit.plugin(paginateGraphQL);
const octokit = new MyOctokit({ auth: process.env.GITHUB_TOKEN });

async function downloadSubmodules(owner: string = 'jasp-stats-modules', repo: string = 'modules-registry'): Promise<ChanelledSubModule[]> {
  interface GqlSubModule {
    name: string
    gitUrl: string
    path: string
}

interface Gql {
  repository: {
    submodules: {
      nodes: GqlSubModule[]
      pageInfo: PageInfoForward
    }
  }
}
    const result = await octokit.graphql.paginate<Gql>(`
query paginate($owner: String!, $repo: String!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    submodules(first: 100, after: $cursor) {
      nodes {
        gitUrl
        path
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
    `, {
        owner,
        repo,
    })
    //  {
    //         "name": "beta-modules/recapJaspModule",
    //         "gitUrl": "https://github.com/jasp-stats-modules/recapJaspModule.git",
    //         "path": "beta-modules/recapJaspModule"
    //       },
    // To:
    // {
    //     channel: 'beta-modules',
    //     name: 'recapJaspModule',
    //     owner: 'jasp-stats-modules',
    //     repo: 'recapJaspModule'
    // }
    const gitUrlMustStartWith = `https://github.com/${owner}/`;
    const filteredResult = result.repository.submodules.nodes.filter((sm) => sm.gitUrl.startsWith(gitUrlMustStartWith))
    if (filteredResult.length !== result.repository.submodules.nodes.length) {
        console.warn(`Not all submodules in ${owner}/${repo} start with ${gitUrlMustStartWith}. This is unexpected and may lead to issues.`);
    }
    return filteredResult.map((sm) => ({
        channel: sm.path.split('/')[0],
        owner: sm.gitUrl.split('/')[3],
        repo: sm.gitUrl.split('/')[4].replace('.git', ''),
        nameWithOwner: `${sm.gitUrl.split('/')[3]}/${sm.gitUrl.split('/')[4].replace('.git', '')}`,
    }))
}

/*
{
  "owner": "jasp-stats",
  "repo": "jasp-desktop"
}

query subModulesPage($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    releases(first:10) {
      nodes {
        tagName
        name
        isLatest
        isPrerelease
        isDraft
        publishedAt
        # description
        releaseAssets(first: 100) {
          nodes {
            downloadUrl
            name
            downloadCount
          }
        }
      }
    }
  }
}

  */

async function releaseAssets(repos: ChanelledSubModule[]): Promise<Releases> {
    // deduplicate repos by owner and repo name
    const ownerRepos = repos.reduce((acc, repo) => {
        if (!acc.find(r => r.owner === repo.owner && r.repo === repo.repo)) {
            acc.push({
                owner: repo.owner,
                repo: repo.repo,
            })
        }
        return acc
    }, []as {owner: string, repo: string}[]);
    const queries = ownerRepos.map((repo, i) => `
repo${i}: repository(owner: "${repo.owner}", name: "${repo.repo}") {
  nameWithOwner
  shortDescriptionHTML
  releases(first: 10) {
    nodes {
      tagName
      name
      isLatest
      isPrerelease
      isDraft
      publishedAt
      # description
      releaseAssets(first: 100) {
        nodes {
          downloadUrl
          name
          downloadCount
        }
      }
    }
  }
}
`).join('\n');

    const fullQuery = `query {\n${queries}\n}`;

    const result = await octokit.graphql<RepoReleaseAssets>(fullQuery)

    const releases = Object.values(result).reduce((acc, repo, i) => {
        const key = repo.nameWithOwner
        const releases = result[`repo${i}`]?.releases?.nodes ?? [];
        const filteredReleases = releases.filter(release => !release.isPrerelease && !release.isDraft);
        for (const release of filteredReleases) {
            release.releaseAssets.nodes.filter(a => a.downloadUrl.endsWith('.jaspModule'))
            // TODO parse architecture and append to asset object
        }
        return {
            ...acc,
            [key]: {
                shortDescriptionHTML: repo.shortDescriptionHTML,
                releases: filteredReleases
            }
        }
    }, {} as Record<string, {shortDescriptionHTML: string, releases: Release[]}>);

    // TODO remove example once a module has a release with assets
    releases['jasp-stats-modules/jaspTTests'].releases.push({
        tagName: 'v1.0.0',
        name: 'jaspTTests',
        isLatest: true,
        isPrerelease: false,
        isDraft: false,
        publishedAt: '2025-08-05T00:00:00Z',
        releaseAssets: {
            nodes: [{
                downloadUrl: 'https://example.com/jaspTTests-x64.jaspModule',
                name: 'jaspTTests-x64.jaspModule',
                downloadCount: 100
            }]
        }
    })
    return releases
}

async function scrape(owner: string = 'jasp-stats-modules', repo: string = 'modules-registry', output: string = 'src/index.json') {
    console.info('Fetching submodules from', `${owner}/${repo}`);
    const repos = await downloadSubmodules(owner, repo);
    console.info('Found', repos.length, 'submodules');
    console.info('Fetching release assets');
    const assets = await releaseAssets(repos);
    console.info('Found', Object.keys(assets).length, 'repositories with release assets');
    const channels = repos.reduce((acc, repo) => {
      if (!acc[repo.channel]) {
        acc[repo.channel] = [];
      }
      acc[repo.channel].push({
        owner: repo.owner,
        repo: repo.repo,
        nameWithOwner: repo.nameWithOwner
      });
      return acc;
    }, {} as Repos);
    console.info('Grouping repos by channel', Object.keys(channels));
    const body = JSON.stringify({channels, assets}, null, 2)
    await fs.writeFile(output, body);
}

// Allow running as a script
if (import.meta.url === `file://${process.argv[1]}`) {
    scrape();
}

