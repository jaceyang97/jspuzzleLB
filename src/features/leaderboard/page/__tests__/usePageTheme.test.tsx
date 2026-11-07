import '@testing-library/jest-dom';
import { act, renderHook, within } from '@testing-library/react';
import usePageTheme from '../usePageTheme';

describe('leaderboard theme', () => {
  const matchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    window.matchMedia = jest.fn(() => ({ matches: false } as MediaQueryList));
    document.head.innerHTML = '<meta data-testid="theme-color" name="theme-color" content="#ffffff"><link data-testid="site-icon" id="site-icon" rel="icon" href="/js_puzzle_solver_logo.svg">';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    window.matchMedia = matchMedia;
  });

  test('uses the existing production preference and keeps browser chrome in sync', async () => {
    localStorage.setItem('theme', 'dark');
    const { result } = renderHook(usePageTheme);
    expect(result.current.theme).toBe('dark');
    expect(within(document.head).getByTestId('theme-color')).toHaveAttribute('content', '#1c1c1e');
    expect(within(document.head).getByTestId('site-icon')).toHaveAttribute('href', '/js_puzzle_solver_logo_dark.svg');

    await act(async () => result.current.toggleTheme(undefined));
    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(within(document.head).getByTestId('site-icon')).toHaveAttribute('href', '/js_puzzle_solver_logo.svg');
  });

  test('renders and toggles when browser storage is denied', async () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Denied', 'SecurityError'); });
    const { result } = renderHook(usePageTheme);
    expect(result.current.theme).toBe('light');
    await act(async () => result.current.toggleTheme(undefined));
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
});
