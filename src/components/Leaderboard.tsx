import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import '../styles/layout.css';
import '../styles/components.css';
import Confetti from '@tholman/confetti';
import { useLeaderboardData } from '../features/leaderboard/hooks/useLeaderboardData';
import { useTheme } from '../hooks/useTheme';
import {
  TopSolversTable,
  StreaksTable,
  RisingStarsTable,
  SolverDistributionChart,
  LoadingSpinner,
  StatsCards,
  NewSolversBanner,
} from '../features/leaderboard/components';

// Import charts lazily to improve initial load time
const Charts = lazy(() => import('./charts/Charts'));

// Theme icons
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
  </svg>
);

const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
  </svg>
);

const Leaderboard: React.FC = () => {
  const { data, loading, error } = useLeaderboardData();
  const { theme, toggleTheme } = useTheme();
  const [showRisingStarsTooltip, setShowRisingStarsTooltip] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [topSolversSearch, setTopSolversSearch] = useState('');

  useEffect(() => {
    if (!data) return;
    setShowConfetti(true);
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, [data]);

  const solversGrowthData = data?.solversGrowth || [];

  const mostSolvedPuzzlesData = useMemo(() =>
    data?.mostSolvedPuzzles?.slice(0, 10) || [], [data]);

  // Use the precomputed stats month as the last updated marker
  const getLatestDataDate = () => {
    if (data?.monthlyParticipation?.length) {
      const latestEntry = data.monthlyParticipation[data.monthlyParticipation.length - 1];
      if (latestEntry?.month) return latestEntry.month;
    }
    if (data?.generatedAt) {
      return new Date(data.generatedAt).toISOString().split('T')[0];
    }
    return 'Unknown';
  };

  // Show loading spinner while data is being loaded
  if (loading) {
    return <LoadingSpinner />;
  }

  if (error || !data) {
    return (
      <div className="dashboard-layout">
        <header className="dashboard-header">
          <div className="header-title-container">
            <h1 className="header-title">
              <span className="title-bold">Jane Street</span>
              <span className="title-separator"> | </span>
              <span className="title-regular">Puzzle Leaderboard</span>
            </h1>
          </div>
        </header>
        <div className="dashboard-grid" style={{ padding: '32px', textAlign: 'center' }}>
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
          <a 
            href="https://github.com/jaceyang97/practices/blob/main/artworks/p31.js"
            target="_blank"
            rel="noopener noreferrer"
            className="logo-link"
            title="Check out this logo in p5.js"
          >
            <img src="/js_puzzle_solver_logo.svg" alt="Jane Street Puzzle" className="header-logo" />
          </a>
          <h1 className="header-title">
            <span className="title-bold title-full">Jane Street</span>
            <span className="title-bold title-short">JS</span>
            <span className="title-separator"> | </span>
            <span className="title-regular">Puzzle Leaderboard</span>
          </h1>
          <div className="intro-container">
            <span className="intro-button">INTRO</span>
            <div className="intro-tooltip">
              <table className="intro-leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>1</td>
                    <td><strong>Why Leaderboards?</strong></td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>What's a programmer like me doing building a leaderboard for Jane Street puzzles? Good question—it's mostly an excuse to procrastinate while feeling productive.</td>
                  </tr>
                  <tr>
                    <td>3</td>
                    <td>Jane Street thrives on turning brain teasers into financial wizardry. While they puzzle out market strategies, I puzzle out how to scrape puzzle data without getting banned. It's a delicate dance.</td>
                  </tr>
                  <tr>
                    <td>4</td>
                    <td>Tracking solvers isn't about glory (okay, <i>maybe a little</i>). It's about justifying hours spent staring at spreadsheets as "research." Plus, if you squint, React components and Python scrapers almost feel like <i>real work</i>.</td>
                  </tr>
                  <tr>
                    <td>5</td>
                    <td>Oh, and <strong>this is a leaderboard</strong>.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <a 
            href="https://www.janestreet.com/puzzles/"
            target="_blank"
            rel="noopener noreferrer"
            className="js-nav-link"
          >
            PUZZLES
          </a>
        </div>
        <div className="header-right">
          <div className="data-date">
            <span className="data-date-label">Data updated</span>
            <span className="data-date-value">{getLatestDataDate()}</span>
          </div>
          <span className="creator-text">
            Created by <a href="https://www.jaceyang.com/" target="_blank" rel="noopener noreferrer" className="author-link">Jace Yang</a>
          </span>
          <a 
            href="https://github.com/jaceyang97/jspuzzleLB"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
            title="View on GitHub"
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
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            <span className="theme-icon-wrapper">
              <span className={`theme-icon ${theme === 'light' ? 'active' : 'inactive'}`}>
                <MoonIcon />
              </span>
              <span className={`theme-icon ${theme === 'dark' ? 'active' : 'inactive'}`}>
                <SunIcon />
              </span>
            </span>
          </button>
        </div>
      </header>

      <NewSolversBanner
        currentPuzzleProgress={data.currentPuzzleProgress}
        generatedAt={data.generatedAt}
        monthlyParticipation={data.monthlyParticipation}
      />

      <div className="dashboard-grid four-column">
        <div className="dashboard-item stats-charts-column">
          <StatsCards totalPuzzles={data.totalPuzzles} uniqueSolvers={data.uniqueSolvers} />
          
          <SolverDistributionChart data={data.solverDistribution} />
          
          <div className="charts-container">
            <Suspense fallback={<div className="chart-loading">Loading charts...</div>}>
              <Charts 
                solversGrowthData={solversGrowthData} 
                mostSolvedPuzzlesData={mostSolvedPuzzlesData}
              />
            </Suspense>
          </div>
        </div>
        
        <div className="dashboard-item top-solvers-column">
          <div className="section-header">
            <h2>🏆 Top Solvers</h2>
            <div className="search-container">
              <input
                type="text"
                placeholder="Search solvers..."
                value={topSolversSearch}
                onChange={(e) => setTopSolversSearch(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          <TopSolversTable data={data.topSolvers || []} searchTerm={topSolversSearch} />
        </div>
        
        <div className="dashboard-item streaks-column">
          <h2>🔥 Longest Streaks</h2>
          <StreaksTable data={data.longestStreaks || []} />
        </div>
        
        <div className="dashboard-item rising-stars-column">
          <h2 
            style={{ position: 'relative', cursor: 'help' }}
            onMouseEnter={() => setShowRisingStarsTooltip(true)}
            onMouseLeave={() => setShowRisingStarsTooltip(false)}
          >
            💫 Rising Stars
            {showRisingStarsTooltip && (
              <div className="chart-title-tooltip">
                Rising Stars are solvers who started within the past year and have demonstrated exceptional puzzle-solving ability. They are ranked based on their solve rate (puzzles solved per month since their first appearance).
              </div>
            )}
          </h2>
          <RisingStarsTable data={data.risingStars || []} />
        </div>
      </div>
      <footer className="dashboard-footer">
        <div className="disclaimer">
          This site is not affiliated with, endorsed by, or sponsored by Jane Street. All puzzle data is compiled from publicly available information.
        </div>
      </footer>
    </div>
  );
};

export default Leaderboard; 