import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';

export type Theme = 'light' | 'dark';

interface ThemeViewTransition {
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  finished: Promise<void>;
  skipTransition: () => void;
}

type ThemeDocument = Document & {
  startViewTransition?: (update: () => void) => ThemeViewTransition;
};

const savedTheme = (): Theme | undefined => {
  try {
    const value = localStorage.getItem('theme');
    return value === 'dark' || value === 'light' ? value : undefined;
  } catch {
    return undefined;
  }
};

const initialTheme = (): Theme => savedTheme() ?? (
  typeof window !== 'undefined' && window.innerWidth > 768 &&
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
);

export const useTheme = () => {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const requestedTheme = useRef(theme);
  const explicitChoice = useRef(!!savedTheme());
  const generation = useRef(0);
  const activeTransition = useRef<ThemeViewTransition | null>(null);
  const cleanupTimer = useRef<number | null>(null);
  const mounted = useRef(true);

  const stopTransition = useCallback(() => {
    const transition = activeTransition.current;
    activeTransition.current = null;
    transition?.skipTransition();
    if (cleanupTimer.current !== null) window.clearTimeout(cleanupTimer.current);
    cleanupTimer.current = null;
  }, []);

  const changeTheme = useCallback((next: Theme, animate: boolean) => {
    requestedTheme.current = next;
    const request = ++generation.current;
    stopTransition();
    const root = document.documentElement;
    const current = () => mounted.current && request === generation.current;
    const clearMarker = () => {
      if (current()) root.removeAttribute('data-theme-transition');
    };
    const commit = () => {
      // skipTransition still runs its update callback, so ignore superseded requests.
      if (!current()) return;
      flushSync(() => {
        root.setAttribute('data-theme', next);
        setTheme(next);
      });
    };
    const reducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const fallback = () => {
      if (!current()) return;
      root.setAttribute('data-theme-transition', animate && !reducedMotion ? 'fallback' : 'instant');
      // Establish the old colors before changing CSS variables for the fallback.
      void root.offsetWidth;
      commit();
      cleanupTimer.current = window.setTimeout(clearMarker, 350);
    };
    const transitionDocument = document as ThemeDocument;
    if (!animate || reducedMotion || document.visibilityState === 'hidden' || !transitionDocument.startViewTransition) {
      fallback();
      return;
    }

    root.setAttribute('data-theme-transition', 'view');
    try {
      const transition = transitionDocument.startViewTransition(commit);
      activeTransition.current = transition;
      // An interrupted or unsupported capture rejects ready without cancelling the update.
      void transition.ready.catch(() => undefined);
      void transition.updateCallbackDone.catch(fallback);
      const finish = () => {
        if (activeTransition.current === transition) {
          activeTransition.current = null;
          clearMarker();
        }
      };
      void transition.finished.then(finish, finish);
    } catch {
      fallback();
    }
  }, [stopTransition]);

  useLayoutEffect(() => {
    if (document.documentElement.getAttribute('data-theme') !== theme) {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
      stopTransition();
      document.documentElement.removeAttribute('data-theme-transition');
    };
  }, [stopTransition]);

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      if (!explicitChoice.current && !savedTheme()) changeTheme(event.matches ? 'dark' : 'light', false);
    };
    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, [changeTheme]);

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) changeTheme(requestedTheme.current, false);
    };
    if (media.addEventListener) {
      media.addEventListener('change', handleChange);
      return () => media.removeEventListener('change', handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, [changeTheme]);

  const toggleTheme = useCallback(() => {
    const next = requestedTheme.current === 'light' ? 'dark' : 'light';
    explicitChoice.current = true;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // An in-memory choice still takes precedence when storage is unavailable.
    }
    changeTheme(next, true);
  }, [changeTheme]);

  return { theme, toggleTheme };
};
