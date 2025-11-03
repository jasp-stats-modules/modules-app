import { beforeEach, describe, expect, test } from 'vitest';
import { type RenderResult, render } from 'vitest-browser-react';
import { App } from './App';
import { Wrapper } from './Wrapper';

describe('App component', () => {
  let screen: RenderResult;
  beforeEach(async () => {
    screen = await render(<App />, {
      wrapper: Wrapper,
    });
  });

  test('renders search label', async () => {
    await expect
      .element(screen.getByText('Search for a module'))
      .toBeInTheDocument();
  });

  test('Many (>25) install buttons are rendered', async () => {
    const buttons = screen.getByText('Install');
    expect(buttons.length).toBeGreaterThan(25);
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
});
