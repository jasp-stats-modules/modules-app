import { withNuqsTestingAdapter } from 'nuqs/adapters/testing';
import { beforeEach, describe, expect, test } from 'vitest';
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
            searchParams: { c: 'index.test.json', a: 'MacOS_arm64' },
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
      const buttons = screen.getByText('Install');
      expect(buttons.length).toBeGreaterThan(3);
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

    describe('Show pre-releases checkbox', () => {
      test('displays pre-release text when checkbox is checked', async () => {
        // Check the "Show pre-releases" checkbox
        const checkbox = screen.getByLabelText('Show pre-releases');
        await checkbox.click();

        // Search for jaspAnova to filter results
        const input = screen.getByLabelText('Search for a module');
        await input.fill('jaspAnova');

        // Assert that the pre-release text appears
        await expect
          .element(screen.getByText('Pre release'))
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
              c: 'index.test.json',
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
              c: 'index.test.json',
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
});
