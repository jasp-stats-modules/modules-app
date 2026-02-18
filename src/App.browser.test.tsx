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

    describe('Show betas checkbox', () => {
      test('displays betas text when checkbox is checked', async () => {
        // Check the "Show betas" checkbox
        const checkbox = screen.getByLabelText('Show Betas');
        await checkbox.click();

        // Assert that the latest beta text appears
        await expect
          .element(screen.getByText('latest beta'))
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
              i: '{"jaspAnova":"0.95.4-release.0"}',
            },
          }),
        },
      );
    });

    test('shows Update button', async () => {
      const input = screen.getByLabelText('Search for a module');
      await input.fill('jaspAnova');

      await expect
        .element(screen.getByText('Update', { exact: true }))
        .toBeInTheDocument();
    });

    test('release stats for older installed version', async () => {
      const input = screen.getByLabelText('Search for a module');
      await input.fill('jaspAnova');

      await expect
        .element(
          screen.getByText(
            /Installed 0\.95\.4-release\.0, Latest 0\.95\.5-release\.0/i,
          ),
        )
        .toBeInTheDocument();
    });
  });

  describe('Given test catalog and when the latest module version is installed', () => {
    let jaspAnovaCard: Locator;
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
              i: '{"jaspAnova":"0.95.5-release.0"}',
            },
          }),
        },
      );
      jaspAnovaCard = screen.getByRole('listitem', { name: 'jaspAnova' });
      await expect.element(jaspAnovaCard).toBeInTheDocument();
    });

    test('say installed', async () => {
      const installedText = jaspAnovaCard.getByText(
        'Latest version is installed',
      );
      await expect.element(installedText).toBeInTheDocument();
    });

    test('shows installed release stats ', async () => {
      const releaseStats = jaspAnovaCard.getByText(
        'Latest installed 0.95.5-release.0',
      );
      await expect.element(releaseStats).toBeInTheDocument();
    });

    test('no action buttons', async () => {
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

    // TODO add test for  release is on GitHub that does not work on installed JASP version
    // try out with ?v=0.94.0 should show releasejaspAnova v0.94.0
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

    test('Should say installed outside qt', async () => {
      const jaspAnovaCard = screen.getByRole('listitem', { name: 'jaspAnova' });
      await expect.element(jaspAnovaCard).toBeInTheDocument();

      await expect
        .element(jaspAnovaCard.getByText('Latest version is installed'))
        .toBeInTheDocument();
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
          'https://github.com/test/test/releases/download/v0.95.5-release.0/test1_Windows_x86-64.JASPModule',
        );

      const allListItems = screen.getByRole('listitem');
      const listItemElements = await allListItems.all();
      expect(listItemElements.length).toBe(4);
    });
  });

  describe('Given test catalog with nl as language', () => {
    beforeEach(async () => {
      screen = await render(
        <NuqslessWrapper>
          <App />
        </NuqslessWrapper>,
        {
          wrapper: withNuqsTestingAdapter({
            searchParams: { c: 'test.json', a: 'MacOS_arm64', l: 'nl' },
          }),
        },
      );
    });

    test('renders search label in Dutch', async () => {
      await expect
        .element(screen.getByText('Zoek een module'))
        .toBeInTheDocument();
    });

    test('renders jaspAnova name in Dutch', async () => {
      const jaspAnovaCard = screen.getByRole('listitem', {
        name: 'Mijn Anova Module',
      });
      await expect.element(jaspAnovaCard).toBeInTheDocument();

      await expect
        .element(jaspAnovaCard.getByText('Mijn Anova Module'))
        .toBeInTheDocument();
    });

    test('renders jaspAnova description in Dutch', async () => {
      const jaspAnovaCard = screen.getByRole('listitem', {
        name: 'Mijn Anova Module',
      });
      await expect.element(jaspAnovaCard).toBeInTheDocument();

      await expect
        .element(jaspAnovaCard.getByText('Test Module 1 in Nederlands'))
        .toBeInTheDocument();
    });
  });
});
