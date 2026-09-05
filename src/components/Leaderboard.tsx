import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import '../styles/layout.css';
import '../styles/components.css';
import Confetti from '@tholman/confetti';
import { trackEvent } from '../utils/analytics';
import { useLeaderboardData } from '../features/leaderboard/hooks/useLeaderboardData';
import { useRawPuzzleData } from '../features/leaderboard/hooks/useRawPuzzleData';
import { useTheme } from '../hooks/useTheme';
import {
  DashboardSkeleton,
  NewSolversBanner,
  SolverProfileModal,
} from '../features/leaderboard/components';
import { formatRelativeTime, formatExactTime } from '../utils/relativeTime';
import Tooltip from './Tooltip';
import ThemeToggle from './ThemeToggle';
import { AnnouncementIcon } from './icons/AnnouncementIcon';
import DashboardStage from '../features/leaderboard/components/DashboardStage';
import PuzzleNavigation from '../features/leaderboard/components/PuzzleNavigation';
import '../styles/leaderboard.css';
import '../styles/header.css';

const Leaderboard: React.FC = () => {
  const { data, loading, error } = useLeaderboardData();
  const { theme, toggleTheme } = useTheme();
  const [showConfetti, setShowConfetti] = useState(false);
  const [compactLayout, setCompactLayout] = useState(() => window.matchMedia('(max-width: 700px), (max-height: 500px), (max-width: 1179px) and (max-height: 949px)').matches);
  const [shortLayout, setShortLayout] = useState(() => window.matchMedia('(max-width: 700px) and (max-height: 620px)').matches);
  useEffect(() => {
    const compact = window.matchMedia('(max-width: 700px), (max-height: 500px), (max-width: 1179px) and (max-height: 949px)');
    const short = window.matchMedia('(max-width: 700px) and (max-height: 620px)');
    const update = () => { setCompactLayout(compact.matches); setShortLayout(short.matches); };
    compact.addEventListener('change', update);
    short.addEventListener('change', update);
    return () => { compact.removeEventListener('change', update); short.removeEventListener('change', update); };
  }, []);
  const [selectedSolver, setSelectedSolver] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get('solver')
  );

  // Track profile opens with the table they came from, and closes with dwell time.
  const openModalRef = useRef<{ name: string; openedAt: number } | null>(null);
  const openSolver = useCallback((name: string, source: string) => {
    trackEvent('solver_profile_open', { solver: name, source });
    openModalRef.current = { name, openedAt: Date.now() };
    setSelectedSolver(name);
  }, []);

  useEffect(() => {
    if (selectedSolver) {
      // Opens not routed through openSolver came from a ?solver= deep link
      // or browser back/forward navigation.
      if (openModalRef.current?.name !== selectedSolver) {
        trackEvent('solver_profile_open', { solver: selectedSolver, source: 'url' });
        openModalRef.current = { name: selectedSolver, openedAt: Date.now() };
      }
    } else if (openModalRef.current) {
      const { name, openedAt } = openModalRef.current;
      openModalRef.current = null;
      trackEvent('solver_profile_close', {
        solver: name,
        seconds: Math.round((Date.now() - openedAt) / 1000),
      });
    }
  }, [selectedSolver]);

  // Push on open/close so the browser back button closes the modal.
  useEffect(() => {
    const url = new URL(window.location.href);
    const current = url.searchParams.get('solver');
    if (selectedSolver === current) return;
    if (selectedSolver) url.searchParams.set('solver', selectedSolver);
    else url.searchParams.delete('solver');
    window.history.pushState(null, '', url.toString());
  }, [selectedSolver]);

  useEffect(() => {
    const onPop = () =>
      setSelectedSolver(new URLSearchParams(window.location.search).get('solver'));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Lazy-load raw puzzle data once a solver modal is opened or once the
  // activity charts need it. The hook caches at module scope so opening multiple
  // modals only fetches once.
  const needPuzzles = !!selectedSolver || !!data;
  const { puzzles: rawPuzzles, loading: puzzlesLoading } = useRawPuzzleData(needPuzzles);

  // Tick once a minute so the relative-time string stays fresh while the tab is open.
  const [, setNow] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!data) return;
    // Reduced motion means no celebratory particle storm.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    // Celebrations are for first-time moments — returning visitors skip the
    // confetti, which also keeps the initial chart load's main thread free.
    try {
      if (localStorage.getItem('confettiSeen')) return;
      localStorage.setItem('confettiSeen', '1');
    } catch {
      return;
    }
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, [data]);

  // Surface data-loading failures in analytics — a broken dashboard would
  // otherwise look like a normal pageview.
  useEffect(() => {
    if (error) {
      trackEvent('data_load_error', { message: error.message || 'unknown' });
    }
  }, [error]);


  // Relative + exact "data updated" strings, derived from generatedAt.
  const updatedRelative = data?.generatedAt ? formatRelativeTime(data.generatedAt) : '';
  const updatedExact = useMemo(
    () => (data?.generatedAt ? formatExactTime(data.generatedAt) : ''),
    [data?.generatedAt]
  );
  // Latest puzzle month, kept as a fallback when no generatedAt is present.
  const latestMonth = useMemo(() => {
    if (data?.monthlyParticipation?.length) {
      const latest = data.monthlyParticipation[data.monthlyParticipation.length - 1];
      if (latest?.month) return latest.month;
    }
    return '';
  }, [data]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="dashboard-layout">
        <header className="dashboard-header">
          <div className="header-title-container">
            <h1 className="header-title" aria-label="Jane Street Puzzle Leaderboard">
              <span className="title-bold title-full" aria-hidden="true">Jane Street</span>
            <span className="title-bold title-short" aria-hidden="true">JS</span>
            <span className="title-separator" aria-hidden="true">|</span>
                <span className="title-regular">Puzzle Leaderboard</span>
            </h1>
          </div>
        </header>
        <div className="dashboard-error" role="alert" style={{ padding: '32px', textAlign: 'center' }}>
          Unable to load leaderboard data. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {showConfetti && <Confetti total={198} />}
      <header className="dashboard-header">
        <div className="header-title-container">
          <Tooltip content="Check out this logo in p5.js">
            <a
              href="https://github.com/jaceyang97/practices/blob/main/artworks/p31.js"
              target="_blank"
              rel="noopener noreferrer"
              className="logo-link"
            >
              <img src="/js_puzzle_solver_logo.svg" alt="Jane Street Puzzle" className="header-logo" />
            </a>
          </Tooltip>
          <h1 className="header-title" aria-label="Jane Street Puzzle Leaderboard">
            <span className="title-bold title-full" aria-hidden="true">Jane Street</span>
            <span className="title-bold title-short" aria-hidden="true">JS</span>
            <span className="title-separator" aria-hidden="true">|</span>
            <span className="title-regular">Puzzle Leaderboard</span>
          </h1>
        </div>
        <PuzzleNavigation />
        <NewSolversBanner
          currentPuzzleProgress={data.currentPuzzleProgress}
          generatedAt={data.generatedAt}
          monthlyParticipation={data.monthlyParticipation}
          inline
          announcementIcon={<AnnouncementIcon variant="ink-cutout" />}
          onSolverClick={(name) => openSolver(name, 'new_today')}
        />
        <div className="header-right">
          <Tooltip
            as="div"
            className="data-date"
            content={
              updatedExact
                ? `Stats generated ${updatedExact}${latestMonth ? ` · latest puzzle: ${latestMonth}` : ''}`
                : latestMonth
                ? `Latest puzzle: ${latestMonth}`
                : 'Update time unknown'
            }
          >
            <span className="data-date-label">Data updated</span>
            <span className="data-date-value">
              {updatedRelative || latestMonth || 'Unknown'}
            </span>
          </Tooltip>
          <Tooltip content="View on GitHub">
          <a
            href="https://github.com/jaceyang97/jspuzzleLB"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
            aria-label="View on GitHub"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="36" 
              height="36" 
              viewBox="0 0 24 24" 
              fill="currentColor"
              className="github-icon"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          </Tooltip>
          <Tooltip content={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
          <ThemeToggle theme={theme} onToggle={() => {
            trackEvent('theme_toggle', { to: theme === 'light' ? 'dark' : 'light' });
            toggleTheme();
          }} />
          </Tooltip>
        </div>
      </header>

      <DashboardStage data={data} rawPuzzles={rawPuzzles} puzzlesLoading={puzzlesLoading}
        compact={compactLayout} short={shortLayout} onSolverClick={openSolver} />
      <SolverProfileModal
        solverName={selectedSolver}
        onClose={() => setSelectedSolver(null)}
      />

      <footer className="dashboard-footer">
        <span className="footer-credit">Created by <a href="https://www.jaceyang.com/" target="_blank" rel="noopener noreferrer" className="author-link">Jace Yang</a></span>
        <Tooltip as="div" className="disclaimer" rich content="This site is not affiliated with, endorsed by, or sponsored by Jane Street. All puzzle data is compiled from publicly available information.">
          <span className="disclaimer-full">Not affiliated with Jane Street. All puzzle data is compiled from publicly available information.</span>
          <span className="disclaimer-short" tabIndex={0}>Independent project · Public puzzle data</span>
        </Tooltip>
      </footer>
    </div>
  );
};

export default Leaderboard;
