import '@testing-library/jest-dom';
import { act, renderHook } from '@testing-library/react';
import { useTheme } from '../useTheme';

interface TransitionStub {
  update: () => void;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  finished: Promise<void>;
  skipTransition: jest.Mock;
  finish: () => void;
}

describe('useTheme', () => {
  const originalMatchMedia = window.matchMedia;
  const originalWidth = window.innerWidth;
  const transitionDocument = document as Document & { startViewTransition?: (update: () => void) => TransitionStub };
  const listeners = new Map<string, Set<(event: MediaQueryListEvent) => void>>();
  let systemDark = false;
  let reducedMotion = false;

  const notify = (query: string, matches: boolean) => {
    act(() => listeners.get(query)?.forEach((listener) => listener({ matches } as MediaQueryListEvent)));
  };

  beforeEach(() => {
    jest.useFakeTimers();
    systemDark = false;
    reducedMotion = false;
    listeners.clear();
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-transition');
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1200 });
    window.matchMedia = jest.fn((query: string) => ({
      get matches() { return query.includes('reduced-motion') ? reducedMotion : systemDark; },
      media: query,
      onchange: null,
      addEventListener: (_name: string, listener: (event: MediaQueryListEvent) => void) => {
        if (!listeners.has(query)) listeners.set(query, new Set());
        listeners.get(query)!.add(listener);
      },
      removeEventListener: (_name: string, listener: (event: MediaQueryListEvent) => void) => listeners.get(query)?.delete(listener),
      addListener: jest.fn(), removeListener: jest.fn(), dispatchEvent: jest.fn(),
    } as unknown as MediaQueryList));
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    window.matchMedia = originalMatchMedia;
    window.innerWidth = originalWidth;
    delete transitionDocument.startViewTransition;
  });

  test('a saved choice takes precedence over phone and system defaults', () => {
    localStorage.setItem('theme', 'dark');
    window.innerWidth = 375;
    const { result } = renderHook(useTheme);
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  test('uses the desktop system preference and follows changes until a manual choice', () => {
    systemDark = true;
    const { result } = renderHook(useTheme);
    expect(result.current.theme).toBe('dark');
    notify('(prefers-color-scheme: dark)', false);
    expect(result.current.theme).toBe('light');
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    notify('(prefers-color-scheme: dark)', false);
    expect(result.current.theme).toBe('dark');
  });

  test('retains the light phone default and works without matchMedia', () => {
    systemDark = true;
    window.innerWidth = 375;
    const phone = renderHook(useTheme);
    expect(phone.result.current.theme).toBe('light');
    phone.unmount();
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    const fallback = renderHook(useTheme);
    act(() => fallback.result.current.toggleTheme());
    expect(fallback.result.current.theme).toBe('dark');
  });

  test('storage failures do not break toggling or let the system override a manual choice', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage blocked'); });
    const { result } = renderHook(useTheme);
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('dark');
    notify('(prefers-color-scheme: dark)', false);
    expect(result.current.theme).toBe('dark');
  });

  test('an older View Transition callback cannot undo the latest rapid toggle', async () => {
    const transitions: TransitionStub[] = [];
    transitionDocument.startViewTransition = jest.fn((update: () => void) => {
      let finish!: () => void;
      const transition = { update, ready: Promise.resolve(), updateCallbackDone: Promise.resolve(),
        finished: new Promise<void>((resolve) => { finish = resolve; }), skipTransition: jest.fn(), finish: () => finish() };
      transitions.push(transition);
      return transition;
    });
    const { result } = renderHook(useTheme);
    act(() => { result.current.toggleTheme(); result.current.toggleTheme(); });
    expect(transitions).toHaveLength(2);
    expect(transitions[0].skipTransition).toHaveBeenCalledTimes(1);
    act(() => { transitions[1].update(); transitions[0].update(); });
    expect(result.current.theme).toBe('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(localStorage.getItem('theme')).toBe('light');
    await act(async () => { transitions.forEach((transition) => transition.finish()); });
    expect(document.documentElement).not.toHaveAttribute('data-theme-transition');
  });

  test('falls back when capture throws and removes the temporary transition marker', () => {
    transitionDocument.startViewTransition = jest.fn(() => { throw new Error('Capture unavailable'); });
    const { result } = renderHook(useTheme);
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.documentElement).toHaveAttribute('data-theme-transition', 'fallback');
    act(() => jest.advanceTimersByTime(350));
    expect(document.documentElement).not.toHaveAttribute('data-theme-transition');
  });

  test('reduced motion switches immediately without a page capture', () => {
    reducedMotion = true;
    transitionDocument.startViewTransition = jest.fn();
    const { result } = renderHook(useTheme);
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('dark');
    expect(transitionDocument.startViewTransition).not.toHaveBeenCalled();
    expect(document.documentElement).toHaveAttribute('data-theme-transition', 'instant');
  });

  test('unmount cancels an unfinished capture and prevents its callback from changing the page', () => {
    let update!: () => void;
    const skipTransition = jest.fn();
    transitionDocument.startViewTransition = jest.fn((callback: () => void) => {
      update = callback;
      return { update, ready: Promise.resolve(), updateCallbackDone: Promise.resolve(),
        finished: new Promise<void>(() => undefined), skipTransition, finish: jest.fn() };
    });
    const { result, unmount } = renderHook(useTheme);
    act(() => result.current.toggleTheme());
    unmount();
    act(() => update());
    expect(skipTransition).toHaveBeenCalledTimes(1);
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(document.documentElement).not.toHaveAttribute('data-theme-transition');
  });
});
