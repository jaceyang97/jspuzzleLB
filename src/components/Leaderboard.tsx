import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import './Leaderboard.css';
import Confetti from '@tholman/confetti';
import { useLeaderboardData } from '../features/leaderboard/hooks/useLeaderboardData';
import {
  TopSolversTable,
  StreaksTable,
  RisingStarsTable,
  SolverDistributionChart,
  LoadingSpinner,
  StatsCards,
} from '../features/leaderboard/components';

// Import charts lazily to improve initial load time
const Charts = lazy(() => import('./charts/Charts'));

const Leaderboard: React.FC = () => {
  const { data, loading, error } = useLeaderboardData();
  const [showRisingStarsTooltip, setShowRisingStarsTooltip] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [topSolversSearch, setTopSolversSearch] = useState('');

  useEffect(() => {
    if (data) {
      setShowConfetti(true);
    }
  }, [data]);

  // Hide confetti after 5 seconds
  useEffect(() => {
    if (!showConfetti) return;
    
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [showConfetti]);

  // Memoize chart data to prevent unnecessary recalculations
  const solversGrowthData = useMemo(() => 
    data?.solversGrowth || [], [data]);

  const monthlyParticipationData = useMemo(() => 
    data?.monthlyParticipation?.slice(-24) || [], [data]);
  
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
            href="https://github.com/jaceyang97/practices/blob/main/p31.js"
            target="_blank"
            rel="noopener noreferrer"
            className="logo-link"
            title="Check out this logo in p5.js"
          >
            <img src="/js_puzzle_solver_logo.svg" alt="Jane Street Puzzle" className="header-logo" />
          </a>
          <h1 className="header-title">
            <span className="title-bold">Jane Street</span>
            <span className="title-separator"> | </span>
            <span className="title-regular">Puzzle Leaderboard</span>
          </h1>
          <div className="intro-container">
            <span className="intro-button">INTRO</span>
            <div className="intro-tooltip">
              <table className="intro-leaderboard-table" style={{ width: '100%', marginBottom: '8px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '10%', padding: '8px', backgroundColor: '#f5f7fa', fontWeight: '600', color: '#2c3e50', textAlign: 'left', borderBottom: '2px solid #e0e4e9' }}>Rank</th>
                    <th style={{ width: '90%', padding: '8px', backgroundColor: '#f5f7fa', fontWeight: '600', color: '#2c3e50', textAlign: 'left', borderBottom: '2px solid #e0e4e9' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'nowrap' }}>1</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}><strong>Why Leaderboards?</strong></td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'nowrap' }}>2</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>What's a programmer like me doing building a leaderboard for Jane Street puzzles? Good question—it's mostly an excuse to procrastinate while feeling productive.</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'nowrap' }}>3</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>Jane Street thrives on turning brain teasers into financial wizardry. While they puzzle out market strategies, I puzzle out how to scrape puzzle data without getting banned. It's a delicate dance.</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'nowrap' }}>4</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>Tracking solvers isn't about glory (okay, <i>maybe a little</i>). It's about justifying hours spent staring at spreadsheets as "research." Plus, if you squint, React components and Python scrapers almost feel like <i>real work</i>.</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'nowrap' }}>5</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>Oh, and <strong>this is a leaderboard</strong>.</td>
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
              fill="#2c3e50"
              className="github-icon"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
      </header>
      
      <div className="dashboard-grid four-column">
        <div className="dashboard-item stats-charts-column">
          <StatsCards totalPuzzles={data.totalPuzzles} uniqueSolvers={data.uniqueSolvers} />
          
          <SolverDistributionChart data={data.topSolvers || []} />
          
          <div className="charts-container">
            <Suspense fallback={<div className="chart-loading">Loading charts...</div>}>
              <Charts 
                solversGrowthData={solversGrowthData} 
                monthlyParticipationData={monthlyParticipationData}
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