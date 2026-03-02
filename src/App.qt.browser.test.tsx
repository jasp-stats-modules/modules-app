// Tests for app like it would run inside Qt using mocking
import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { RenderResult } from 'vitest-browser-react';
import { render } from 'vitest-browser-react';
import type { Info } from './useJaspQtObject';
import { NuqslessWrapper, queryClient } from './Wrapper';

const qtMockState = vi.hoisted(() => {
  const baseInfo: Info = {
    version: '0.95.1',
    arch: 'MacOS_arm64',
    theme: 'system',
    developerMode: false,
    font: null,
    language: 'en',
    installedModules: {},
    uninstallableModules: [],
  };

  return {
    info: baseInfo,
    uninstall: vi.fn(async (_module: string) => {}),
    installMany: vi.fn(async (_assetUrls: string[]) => {}),
    connect: vi.fn((_callback: (data: Info) => void) => {}),
    disconnect: vi.fn((_callback: (data: Info) => void) => {}),
  };
});

vi.mock('./useJaspQtObject', () => ({
  insideQt: true,
  useJaspQtObject: () => ({
    data: {
      info: () => Promise.resolve(qtMockState.info),
      uninstall: qtMockState.uninstall,
      installMany: qtMockState.installMany,
      environmentInfoChanged: {
        connect: qtMockState.connect,
        disconnect: qtMockState.disconnect,
      },
    },
    isFetched: true,
    error: null,
  }),
}));

import { App } from './App';

function makeInfo(overrides: Partial<Info>): Info {
  return {
    version: '0.95.1',
    arch: 'MacOS_arm64',
    theme: 'system',
    developerMode: false,
    font: null,
    language: 'en',
    installedModules: {},
    uninstallableModules: [],
    ...overrides,
  };
}

async function renderQtApp(): Promise<RenderResult> {
  return render(
    <NuqslessWrapper>
      <App />
    </NuqslessWrapper>,
    {
      wrapper: withNuqsTestingAdapter({
        searchParams: { c: 'test.json' },
      }),
    },
  );
}

describe('App component (Qt mocked browser)', () => {
  beforeEach(() => {
    queryClient.clear();
    qtMockState.info = makeInfo({});
    qtMockState.uninstall.mockClear();
    qtMockState.installMany.mockClear();
    qtMockState.connect.mockClear();
    qtMockState.disconnect.mockClear();
  });

  test('renders and calls main Uninstall button', async () => {
    qtMockState.info = makeInfo({
      installedModules: { jaspAnova: '0.95.5-release.0' },
      uninstallableModules: ['jaspAnova'],
    });

    const screen = await renderQtApp();
    const jaspAnovaCard = screen.getByRole('listitem', { name: 'jaspAnova' });
    await expect.element(jaspAnovaCard).toBeInTheDocument();

    const uninstallButton = jaspAnovaCard.getByRole('button', {
      name: 'Uninstall',
    });
    await expect.element(uninstallButton).toBeInTheDocument();

    await uninstallButton.click();
    expect(qtMockState.uninstall).toHaveBeenCalledWith('jaspAnova');
  });

  test('renders uninstall action in ActionMenuItem and calls uninstall', async () => {
    qtMockState.info = makeInfo({
      installedModules: { jaspAnova: '0.95.4-release.0' },
      uninstallableModules: ['jaspAnova'],
    });

    const screen = await renderQtApp();
    const jaspAnovaCard = screen.getByRole('listitem', { name: 'jaspAnova' });
    await expect.element(jaspAnovaCard).toBeInTheDocument();

    const moreActionsButton = jaspAnovaCard.getByRole('button', {
      name: 'More actions',
    });
    await moreActionsButton.click();

    const uninstallMenuItem = screen.getByRole('menuitem', {
      name: 'Uninstall',
    });
    await expect.element(uninstallMenuItem).toBeInTheDocument();

    await uninstallMenuItem.click();
    expect(qtMockState.uninstall).toHaveBeenCalledWith('jaspAnova');
  });

  test('renders uninstall pre-release in ActionMenuItem and calls uninstall', async () => {
    qtMockState.info = makeInfo({
      developerMode: true,
      installedModules: { jaspAnova: '0.96.0-beta.0' },
      uninstallableModules: ['jaspAnova'],
    });

    const screen = await renderQtApp();
    const jaspAnovaCard = screen.getByRole('listitem', { name: 'jaspAnova' });
    await expect.element(jaspAnovaCard).toBeInTheDocument();

    const moreActionsButton = jaspAnovaCard.getByRole('button', {
      name: 'More actions',
    });
    await moreActionsButton.click();

    const uninstallPreReleaseMenuItem = screen.getByRole('menuitem', {
      name: /Uninstall\s+Beta/i,
    });
    await expect.element(uninstallPreReleaseMenuItem).toBeInTheDocument();

    await uninstallPreReleaseMenuItem.click();
    expect(qtMockState.uninstall).toHaveBeenCalledWith('jaspAnova');
  });

  test('shows and triggers Update all button inside Qt', async () => {
    qtMockState.info = makeInfo({
      installedModules: {
        jaspAnova: '0.95.4-release.0',
        jaspBayesian: '0.95.4-release.0',
      },
    });

    const screen = await renderQtApp();
    const updateAllButton = screen.getByRole('button', {
      name: /Update all\s*\(2\)/i,
    });
    await expect.element(updateAllButton).toBeInTheDocument();

    await updateAllButton.click();
    expect(qtMockState.installMany).toHaveBeenCalledTimes(1);
    expect(qtMockState.installMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        'https://github.com/test/test/releases/download/v0.95.5-release.0/test1_MacOS_arm64.JASPModule',
        'https://github.com/test/test/releases/download/v0.95.5-release.0/test2_MacOS_arm64.JASPModule',
      ]),
    );
  });
});
