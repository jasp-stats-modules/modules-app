import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { beforeEach, describe, expect, test } from 'vitest';
import type { Locator } from 'vitest/browser';
import { type RenderResult, render } from 'vitest-browser-react';
import { App } from './App';
import { NuqslessWrapper } from './Wrapper';

describe('App component', () => {
  let screen: RenderResult;
  describe('Given test catalog', () => {
    beforeEach(async () => {
      screen = await render(
        <NuqslessWrapper>
          <App />
        </NuqslessWrapper>,
        {
          wrapper: withNuqsTestingAdapter({
            searchParams: { c: 'test.json', a: 'MacOS_arm64' },
          }),
        },
      );
    });

    test('renders search label', async () => {
      await expect
        .element(screen.getByText('Search for a module'))
        .toBeInTheDocument();
    });

    test('Many (>3) install buttons are rendered', async () => {
      const buttons = screen.getByText('Install', { exact: true });
      const buttonElements = await buttons.all();
      expect(buttonElements.length).toBeGreaterThan(3);
    });

    describe('Search for existing modules', () => {
      beforeEach(async () => {
        const input = screen.getByLabelText('Search for a module');
        await input.fill('Test Module 1');
      });

      test('renders the jaspAnova module', async () => {
        await expect.element(screen.getByText('jaspAnova')).toBeInTheDocument();
      });
    });

    describe('Search for non existent modules', () => {
      beforeEach(async () => {
        const input = screen.getByLabelText('Search for a module');
        await input.fill('nonexistentmodule');
      });

      test('shows no modules found text', async () => {
        await expect
          .element(screen.getByText('No modules found'))
          .toBeInTheDocument();
      });
    });

    describe('when test-modules channel is selected', () => {
      let card: Locator;
      beforeEach(async () => {
        const testChannelCheckbox = screen.getByLabelText('test-modules');
        await testChannelCheckbox.click();
        card = screen.getByRole('listitem', { name: 'jaspRapid' });
      });

      test('shows jaspRapid card', async () => {
        await expect.element(card).toBeInTheDocument();
      });

      test('renders nlesc as maintainer in jaspRapid card', async () => {
        await expect.element(card.getByText(/by\s+nlesc/i)).toBeInTheDocument();
      });

      test('renders test-modules as channel in jaspRapid card', async () => {
        await expect
          .element(card.getByText('test-modules'))
          .toBeInTheDocument();
      });

      test('renders homepage link in jaspRapid card', async () => {
        const link = card.getByTitle('Go to home page of module');
        await expect.element(link).toBeInTheDocument();
        await expect
          .element(link)
          .toHaveAttribute('href', 'https://github.com/nlesc/jaspRapid');
      });
    });

    describe('Show pre-releases checkbox', () => {
      test('displays pre-release text when checkbox is checked', async () => {
        // Check the "Show pre-releases" checkbox
        const checkbox = screen.getByLabelText('Show Betas');
        await checkbox.click();

        // Search for jaspAnova to filter results
        const input = screen.getByLabelText('Search for a module');
        await input.fill('jaspAnova');

        // Assert that the pre-release text appears
        await expect
          .element(screen.getByText('Beta', { exact: true }))
          .toBeInTheDocument();
      });
    });
  });

  describe('Given test catalog and when a module is already installed', () => {
    beforeEach(async () => {
      screen = await render(
        <NuqslessWrapper>
          <App />
        </NuqslessWrapper>,
        {
          wrapper: withNuqsTestingAdapter({
            searchParams: {
              c: 'test.json',
              a: 'MacOS_arm64',
              i: '{"jaspAnova":"0.95.4"}',
            },
          }),
        },
      );
    });

    test('shows Update button and release stats for older installed version', async () => {
      const input = screen.getByLabelText('Search for a module');
      await input.fill('jaspAnova');

      await expect.element(screen.getByText('Update')).toBeInTheDocument();
      await expect
        .element(screen.getByText(/Installed 0\.95\.4, latest 0\.95\.5/i))
        .toBeInTheDocument();
    });
  });

  describe('Given test catalog and when the latest module version is installed', () => {
    beforeEach(async () => {
      screen = await render(
        <NuqslessWrapper>
          <App />
        </NuqslessWrapper>,
        {
          wrapper: withNuqsTestingAdapter({
            searchParams: {
              c: 'test.json',
              a: 'MacOS_arm64',
              i: '{"jaspAnova":"0.95.5"}',
            },
          }),
        },
      );
    });

    test('shows installed release stats and no action buttons', async () => {
      const jaspAnovaCard = screen.getByRole('listitem', { name: 'jaspAnova' });
      await expect.element(jaspAnovaCard).toBeInTheDocument();

      const releaseStats = jaspAnovaCard.getByText(
        /Installed 0\.95\.5, latest 0\.95\.5 on .* with 10 downloads/i,
      );
      await expect.element(releaseStats).toBeInTheDocument();

      const installedStatus = jaspAnovaCard.getByTitle(
        /latest version is installed/i,
      );
      await expect.element(installedStatus).toBeInTheDocument();

      const installedText = jaspAnovaCard.getByText('Installed', {
        exact: true,
      });
      await expect.element(installedText).toBeInTheDocument();

      // Verify action buttons/links don't render when latest version is installed
      // Instead, the "Installed" status label replaces them
      await expect
        .element(jaspAnovaCard.getByRole('button'))
        .not.toBeInTheDocument();
      await expect
        .element(jaspAnovaCard.getByRole('link', { name: 'Install' }))
        .not.toBeInTheDocument();
      await expect
        .element(jaspAnovaCard.getByRole('link', { name: 'Update' }))
        .not.toBeInTheDocument();
    });
  });

  describe('Given test catalog and module is removable and unchecked betas checkbox and when beta is installed', () => {
    beforeEach(async () => {
      screen = await render(
        <NuqslessWrapper>
          <App />
        </NuqslessWrapper>,
        {
          wrapper: withNuqsTestingAdapter({
            searchParams: {
              c: 'test.json',
              a: 'MacOS_arm64',
              i: '{"jaspAnova":"0.96.0-beta.1"}',
              p: 'false',
              u: '["jaspAnova"]',
            },
          }),
        },
      );
    });

    test('Should not show update button', async () => {
      const jaspAnovaCard = screen.getByRole('listitem', { name: 'jaspAnova' });
      await expect.element(jaspAnovaCard).toBeInTheDocument();

      await expect
        .element(jaspAnovaCard.getByRole('link', { name: 'Update' }))
        .not.toBeInTheDocument();
    });

    test('Should not show uninstall button', async () => {
      const jaspAnovaCard = screen.getByRole('listitem', { name: 'jaspAnova' });
      await expect.element(jaspAnovaCard).toBeInTheDocument();

      await expect
        .element(jaspAnovaCard.getByRole('link', { name: 'Uninstall' }))
        .not.toBeInTheDocument();
    });

    test('Should not say installed', async () => {
      // When uninstall button is show, the "Installed" text is repetitive
      const jaspAnovaCard = screen.getByRole('listitem', { name: 'jaspAnova' });
      await expect.element(jaspAnovaCard).toBeInTheDocument();

      await expect
        .element(jaspAnovaCard.getByText('Installed', { exact: true }))
        .not.toBeInTheDocument();
    });

    test('Should show downgrade button with link to latest stable', async () => {
      const jaspAnovaCard = screen.getByRole('listitem', { name: 'jaspAnova' });
      await expect.element(jaspAnovaCard).toBeInTheDocument();

      const downgradeButton = jaspAnovaCard.getByRole('link', {
        name: 'Downgrade',
      });
      await expect.element(downgradeButton).toBeInTheDocument();
      await expect
        .element(downgradeButton)
        .toHaveAttribute(
          'href',
          'https://github.com/test/test/releases/download/v0.95.5/test1_MacOS_arm64.JASPModule',
        );
    });
  });

  describe('Given theme search param', () => {
    beforeEach(() => {
      document.documentElement.className = '';
    });

    test('applies dark theme when t=dark', async () => {
      screen = await render(
        <NuqslessWrapper>
          <App />
        </NuqslessWrapper>,
        {
          wrapper: withNuqsTestingAdapter({
            searchParams: { c: 'test.json', a: 'MacOS_arm64', t: 'dark' },
          }),
        },
      );

      await expect
        .element(screen.getByText('Search for a module'))
        .toBeInTheDocument();

      const classes = Array.from(
        screen.baseElement.ownerDocument.documentElement.classList,
      );
      expect(classes).toContain('dark');
      expect(classes).not.toContain('light');
    });

    test('applies light theme when t=light', async () => {
      screen = await render(
        <NuqslessWrapper>
          <App />
        </NuqslessWrapper>,
        {
          wrapper: withNuqsTestingAdapter({
            searchParams: { c: 'test.json', a: 'MacOS_arm64', t: 'light' },
          }),
        },
      );

      await expect
        .element(screen.getByText('Search for a module'))
        .toBeInTheDocument();

      const classes = Array.from(
        screen.baseElement.ownerDocument.documentElement.classList,
      );
      expect(classes).toContain('light');
      expect(classes).not.toContain('dark');
    });
  });

  describe('Given font search param', () => {
    test('applies font when f=SansSerif', async () => {
      screen = await render(
        <NuqslessWrapper>
          <App />
        </NuqslessWrapper>,
        {
          wrapper: withNuqsTestingAdapter({
            searchParams: { c: 'test.json', a: 'MacOS_arm64', f: 'SansSerif' },
          }),
        },
      );

      const searchLabel = screen.getByText('Search for a module');
      await expect.element(searchLabel).toBeInTheDocument();

      const labelComputedStyle = window.getComputedStyle(searchLabel.element());
      expect(labelComputedStyle.fontFamily).toContain('SansSerif');
    });
  });

  describe('Given Windows_x86-64 architecture', () => {
    beforeEach(async () => {
      screen = await render(
        <NuqslessWrapper>
          <App />
        </NuqslessWrapper>,
        {
          wrapper: withNuqsTestingAdapter({
            searchParams: { c: 'test.json', a: 'Windows_x86-64' },
          }),
        },
      );
    });

    test('renders only modules with Windows_x86-64 assets', async () => {
      const jaspAnovaCard = screen.getByRole('listitem', { name: 'jaspAnova' });
      await expect.element(jaspAnovaCard).toBeInTheDocument();

      // Should have an Install button since Windows_x86-64 asset is available
      const installButton = jaspAnovaCard.getByRole('link', {
        name: 'Install',
      });
      await expect.element(installButton).toBeInTheDocument();
      await expect
        .element(installButton)
        .toHaveAttribute(
          'href',
          'https://github.com/test/test/releases/download/v0.95.5/test1_Windows_x86-64.JASPModule',
        );

      // jaspAnova should be the only listitem since it's the only module with Windows_x86-64 asset
      const allListItems = screen.getByRole('listitem');
      const listItemElements = await allListItems.all();
      expect(listItemElements.length).toBe(1);
    });
  });
});
