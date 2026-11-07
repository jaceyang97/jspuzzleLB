/*! @license
 * Animated theme reveal adapted from Jace's theme-src/theme.js and Magic UI's
 * AnimatedThemeToggler. Copyright (c) Magic UI. MIT License.
 * See public/licenses/theme-transition.txt for the complete license.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

const initialTheme = () => {
  try {
    const value = localStorage.getItem('theme');
    if (value === 'dark' || value === 'light') return value;
  } catch {
    // Theme selection remains available when browser storage is blocked.
  }
  const resolved = document.documentElement.getAttribute('data-theme');
  if (resolved === 'dark' || resolved === 'light') return resolved;
  return window.innerWidth > 768 && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

export default function usePageTheme() {
  const [theme, setTheme] = useState(initialTheme);
  const requested = useRef(theme);
  const generation = useRef(0);
  const transition = useRef(null);
  const animation = useRef(null);
  const clear = useCallback(() => {
    const root = document.documentElement;
    delete root.dataset.magicuiThemeVt;
    root.style.removeProperty('--magicui-theme-toggle-vt-duration');
    root.style.removeProperty('--magicui-theme-vt-clip-from');
    animation.current?.cancel(); animation.current = null;
    transition.current = null;
  }, []);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#1c1c1e' : '#ffffff');
    document.getElementById('site-icon')?.setAttribute('href', theme === 'dark' ? '/js_puzzle_solver_logo_dark.svg' : '/js_puzzle_solver_logo.svg');
  }, [theme]);
  useEffect(() => () => {
    generation.current += 1;
    transition.current?.skipTransition(); clear();
    document.documentElement.classList.remove('theme-switching');
  }, [clear]);

  const toggleTheme = useCallback(async (event) => {
    const request = ++generation.current;
    transition.current?.skipTransition(); clear();
    const next = requested.current === 'light' ? 'dark' : 'light';
    requested.current = next;
    const root = document.documentElement;
    const commit = () => {
      if (generation.current !== request) return;
      try { localStorage.setItem('theme', next); } catch {
        // Keep the in-memory choice if storage is unavailable.
      }
      flushSync(() => { root.setAttribute('data-theme', next); setTheme(next); });
    };
    const button = event?.currentTarget;
    const instant = !button || event.detail === 0 || window.matchMedia('(prefers-reduced-motion: reduce)').matches
      || typeof document.startViewTransition !== 'function' || typeof root.animate !== 'function';
    if (instant) {
      root.classList.add('theme-switching'); commit();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (generation.current === request) root.classList.remove('theme-switching');
      }));
      return;
    }

    root.classList.remove('theme-switching');
    const { left, top, width, height } = button.getBoundingClientRect();
    const w = window.innerWidth, h = window.innerHeight, x = left + width / 2, y = top + height / 2;
    const point = (a, b) => `${a / w * 100}% ${b / h * 100}%`;
    const origin = point(x, y), half = Math.max(x, w - x, y, h - y) * 1.05;
    const clipPath = [
      `polygon(${Array(4).fill(origin).join(', ')})`,
      `polygon(${[point(x - half, y - half), point(x + half, y - half), point(x + half, y + half), point(x - half, y + half)].join(', ')})`,
    ];
    root.dataset.magicuiThemeVt = 'active';
    root.style.setProperty('--magicui-theme-toggle-vt-duration', '250ms');
    root.style.setProperty('--magicui-theme-vt-clip-from', clipPath[0]);
    try {
      const active = document.startViewTransition(commit); transition.current = active;
      await active.ready;
      if (generation.current !== request) return;
      animation.current = root.animate({ clipPath }, { duration: 250, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', fill: 'forwards', pseudoElement: '::view-transition-new(root)' });
      await active.finished;
    } catch {
      commit();
    } finally {
      if (generation.current === request) clear();
    }
  }, [clear]);
  return { theme, toggleTheme };
}
