import React from 'react';
import { AnimatePresence, LazyMotion, domAnimation, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { Theme } from '../hooks/useTheme';
import './ThemeToggle.css';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
}

const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" focusable="false">
    <path d="M20.9 13.2A8.5 8.5 0 0 1 10.8 3.1 8.5 8.5 0 1 0 20.9 13.2Z" />
  </svg>
);

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" focusable="false">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  const reduceMotion = useReducedMotion();
  // useTheme sets this marker before its synchronous React commit. The page
  // snapshot needs a complete glyph, rather than a halfway-entered Motion icon.
  const nativeTransition = typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme-transition') === 'view';
  const nextTheme = theme === 'light' ? 'dark' : 'light';
  const hidden = reduceMotion
    ? { opacity: 0, scale: 1, filter: 'blur(0px)' }
    : { opacity: 0, scale: 0.25, filter: 'blur(4px)' };
  return (
    <LazyMotion features={domAnimation} strict>
      <button type="button" className="theme-toggle theme-toggle-motion" onClick={onToggle}
        aria-label={`Switch to ${nextTheme} mode`}>
        <span className="theme-toggle-glyph" aria-hidden="true">
          {nativeTransition ? (
            <span className="theme-toggle-symbol">
              {nextTheme === 'dark' ? <MoonIcon /> : <SunIcon />}
            </span>
          ) : <AnimatePresence initial={false} mode="sync">
            <m.span key={nextTheme} className="theme-toggle-symbol"
              initial={hidden} animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }} exit={hidden}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', duration: 0.3, bounce: 0 }}>
              {nextTheme === 'dark' ? <MoonIcon /> : <SunIcon />}
            </m.span>
          </AnimatePresence>}
        </span>
      </button>
    </LazyMotion>
  );
};

export default ThemeToggle;
