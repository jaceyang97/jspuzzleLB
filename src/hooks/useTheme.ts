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

const initialTheme = (): Theme => {
  const saved = savedTheme();
  if (saved) return saved;
  const painted = typeof document !== 'undefined' && document.documentElement.dataset.theme;
  if (painted === 'dark' || painted === 'light') return painted;
  return typeof window !== 'undefined' && window.innerWidth > 768 &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/*! @license
 * Animated theme reveal adapted from Jace's theme-src/theme.js and Magic UI's
 * AnimatedThemeToggler. Copyright (c) Magic UI. MIT License.
 * See public/licenses/theme-transition.txt for the complete license.
 */
function revealPath(button: HTMLElement) {
  const { left, top, width, height } = button.getBoundingClientRect();
  const w = window.innerWidth, h = window.innerHeight, x = left + width / 2, y = top + height / 2;
  const point = (a: number, b: number) => `${a / w * 100}% ${b / h * 100}%`;
  const origin = point(x, y), half = Math.max(x, w - x, y, h - y) * 1.05;
  return [
    `polygon(${Array(4).fill(origin).join(', ')})`,
    `polygon(${[point(x - half, y - half), point(x + half, y - half), point(x + half, y + half), point(x - half, y + half)].join(', ')})`,
  ];
}

function clearTransitionStyles() {
  const root = document.documentElement;
  root.removeAttribute('data-theme-transition');
  root.classList.remove('theme-switching');
  delete root.dataset.magicuiThemeVt;
  root.style.removeProperty('--magicui-theme-toggle-vt-duration');
  root.style.removeProperty('--magicui-theme-vt-clip-from');
}

export const useTheme = (effect: 'fade' | 'reveal' = 'fade') => {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const requestedTheme = useRef(theme);
  const explicitChoice = useRef(!!savedTheme());
  const generation = useRef(0);
  const activeTransition = useRef<ThemeViewTransition | null>(null);
  const cleanupTimer = useRef<number | null>(null);
  const animation = useRef<Animation | null>(null);
  const mounted = useRef(true);

  const stopTransition = useCallback(() => {
    const transition = activeTransition.current;
    activeTransition.current = null;
    transition?.skipTransition();
    animation.current?.cancel();
    animation.current = null;
    clearTransitionStyles();
    if (cleanupTimer.current !== null) window.clearTimeout(cleanupTimer.current);
    cleanupTimer.current = null;
  }, []);

  const changeTheme = useCallback((next: Theme, animate: boolean, button?: HTMLElement) => {
    requestedTheme.current = next;
    const request = ++generation.current;
    stopTransition();
    const root = document.documentElement;
    const current = () => mounted.current && request === generation.current;
    const clearMarker = () => {
      if (!current()) return;
      clearTransitionStyles();
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
      const fade = effect === 'fade' && animate && !reducedMotion;
      if (effect === 'reveal') root.classList.add('theme-switching');
      root.setAttribute('data-theme-transition', fade ? 'fallback' : 'instant');
      // Establish the old colors before changing CSS variables for the fallback.
      void root.offsetWidth;
      commit();
      if (effect === 'reveal') requestAnimationFrame(() => requestAnimationFrame(clearMarker));
      else cleanupTimer.current = window.setTimeout(clearMarker, 350);
    };
    const transitionDocument = document as ThemeDocument;
    if (!animate || reducedMotion || (effect === 'reveal' && (!button || !root.animate)) || document.visibilityState === 'hidden' || !transitionDocument.startViewTransition) {
      fallback();
      return;
    }

    const clipPath = effect === 'reveal' && button ? revealPath(button) : null;
    if (clipPath) {
      root.dataset.magicuiThemeVt = 'active';
      root.style.setProperty('--magicui-theme-toggle-vt-duration', '250ms');
      root.style.setProperty('--magicui-theme-vt-clip-from', clipPath[0]);
    } else root.setAttribute('data-theme-transition', 'view');
    try {
      const transition = transitionDocument.startViewTransition(commit);
      activeTransition.current = transition;
      // An interrupted or unsupported capture rejects ready without cancelling the update.
      void transition.ready.then(() => {
        if (clipPath && current()) animation.current = root.animate({ clipPath }, {
          duration: 250, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', fill: 'forwards', pseudoElement: '::view-transition-new(root)',
        });
      }).catch(() => undefined);
      void transition.updateCallbackDone.catch(fallback);
      const finish = () => {
        if (activeTransition.current === transition) {
          animation.current?.cancel();
          animation.current = null;
          activeTransition.current = null;
          clearMarker();
        }
      };
      void transition.finished.then(finish, finish);
    } catch {
      fallback();
    }
  }, [effect, stopTransition]);

  useLayoutEffect(() => {
    if (document.documentElement.getAttribute('data-theme') !== theme) {
      document.documentElement.setAttribute('data-theme', theme);
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1c1c1e' : '#ffffff');
    document.getElementById('site-icon')?.setAttribute('href', theme === 'dark' ? '/js_puzzle_solver_logo_dark.svg' : '/js_puzzle_solver_logo.svg');
  }, [theme]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
      stopTransition();
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
    media.addListener?.(handleChange);
    return () => media.removeListener?.(handleChange);
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
    media.addListener?.(handleChange);
    return () => media.removeListener?.(handleChange);
  }, [changeTheme]);

  const toggleTheme = useCallback((event?: React.MouseEvent<HTMLElement>) => {
    const next = requestedTheme.current === 'light' ? 'dark' : 'light';
    explicitChoice.current = true;
    try {
      localStorage.setItem('theme', next);
    } catch {
      // An in-memory choice still takes precedence when storage is unavailable.
    }
    changeTheme(next, effect === 'fade' || !!event?.detail, event?.currentTarget);
  }, [changeTheme, effect]);

  return { theme, toggleTheme };
};
