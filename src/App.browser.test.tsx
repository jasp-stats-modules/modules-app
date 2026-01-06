import { beforeEach, describe, expect, test } from 'vitest';
import { type RenderResult, render } from 'vitest-browser-react';
import { App } from './App';
import { Wrapper } from './Wrapper';

describe('App component', () => {
  let screen: RenderResult;
  beforeEach(async () => {
    // Use test catalog and set architecture to match fixtures
    history.replaceState(null, '', '?c=index.test.json&a=MacOS_arm64');

    screen = await render(<App initialCatalogUrl="index.test.json" />, {
      wrapper: Wrapper,
    });
  });

  test('renders search label', async () => {
    await expect
      .element(screen.getByText('Search for a module'))
      .toBeInTheDocument();
  });

  test('Many (>3) install buttons are rendered', async () => {
    const buttons = screen.getByText('Install');
    expect(buttons.length).toBeGreaterThan(2);
  });

  describe('Search for existing modules', () => {
    beforeEach(async () => {
      const input = screen.getByLabelText('Search for a module');
      await input.fill('Test Module 1');
    });

    test('renders the jaspAnova module', async () => {
      await expect
        .element(screen.getByText('jaspAnova'))
        .toBeInTheDocument();
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
      await expect.element(screen.getByText('Pre release')).toBeInTheDocument();
    });
  });
});
