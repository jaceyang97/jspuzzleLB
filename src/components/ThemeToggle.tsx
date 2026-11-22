import { Button } from '@ui-sdk/react/button';
import React from 'react';
import { AnimatePresence, LazyMotion, domAnimation, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { Theme } from '../hooks/useTheme';
import './ThemeToggle.css';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: (event: React.MouseEvent<HTMLElement>) => void;
  variant?: 'article' | 'leaderboard';
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

// Heroicons, MIT. See public/licenses/theme-icons.txt.
function PersonalThemeIcon({ theme }: { theme: Theme }) {
  const dark = theme === 'dark';
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {dark ? <path d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /> : <path d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />}
    </svg>;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle, variant = 'article' }) => {
  const reduceMotion = useReducedMotion();
  // useTheme sets this marker before its synchronous React commit. The page
  // snapshot needs a complete glyph, rather than a halfway-entered Motion icon.
  const nativeTransition = typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme-transition') === 'view';
  const nextTheme = theme === 'light' ? 'dark' : 'light';
  const hidden = reduceMotion
    ? { opacity: 0, scale: 1, filter: 'blur(0px)' }
    : { opacity: 0, scale: 0.25, filter: 'blur(4px)' };
  const label = `Switch to ${nextTheme} mode`;
  return (
    <Button type="button" className={variant === 'leaderboard' ? 'flow-theme-button' : 'theme-toggle theme-toggle-motion'}
      onClick={onToggle} aria-label={label} title={variant === 'leaderboard' ? label : undefined}>
      {variant === 'leaderboard' ? <PersonalThemeIcon theme={theme} /> : <LazyMotion features={domAnimation} strict>
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
      </LazyMotion>}
    </Button>
  );
};

export default ThemeToggle;
