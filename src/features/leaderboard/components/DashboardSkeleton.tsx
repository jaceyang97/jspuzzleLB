import React from 'react';
import PuzzleNavigation from './PuzzleNavigation';

const TableSkeleton = ({ rows = 12 }: { rows?: number }) => (
  <div className="skeleton-table">
    <div className="skeleton-row skeleton-row-head">
      <span className="skeleton skeleton-rank" />
      <span className="skeleton skeleton-name" />
      <span className="skeleton skeleton-num" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="skeleton-row">
        <span className="skeleton skeleton-rank" />
        <span className="skeleton skeleton-name" />
        <span className="skeleton skeleton-num" />
      </div>
    ))}
  </div>
);

const DashboardSkeleton = () => (
  <div className="dashboard-layout dashboard-skeleton" aria-busy="true" aria-live="polite">
    <header className="dashboard-header">
      <div className="header-title-container">
        <img src="/js_puzzle_solver_logo.svg" alt="Jane Street Puzzle" className="header-logo" />
        <h1 className="header-title" aria-label="Jane Street Puzzle Leaderboard">
          <span className="title-bold title-full" aria-hidden="true">Jane Street</span>
            <span className="title-bold title-short" aria-hidden="true">JS</span>
            <span className="title-separator" aria-hidden="true">|</span>
          <span className="title-regular">Puzzle Leaderboard</span>
        </h1>
      </div>
      <PuzzleNavigation />
    </header>

    <main className="dashboard-stage" aria-label="Loading dashboard">
      <div className="ranking-stage">
        <div className="leaderboard-workspace" aria-label="Loading leaderboard">
          <div className="leaderboard-tabs">
            <span className="skeleton skeleton-heading" />
          </div>
          <div className="leaderboard-controls">
            <span className="skeleton skeleton-search" />
          </div>
          <TableSkeleton rows={10} />
        </div>
      </div>
      <div className="community-panel side-panel" aria-hidden="true">
        <div className="stats-cards">
          {[0, 1].map((index) => (
            <div className="stats-card" key={index}>
              <span className="skeleton skeleton-stat-label" />
              <span className="skeleton skeleton-stat-value" />
            </div>
          ))}
        </div>
        <span className="skeleton skeleton-heading" />
        <span className="skeleton skeleton-distribution" />
      </div>
      <div className="growth-panel side-panel" aria-hidden="true">
        <div className="chart-container mini growth-chart-tabs">
          <span className="skeleton skeleton-heading" />
          <span className="skeleton skeleton-chart" />
        </div>
      </div>
      <div className="puzzles-panel side-panel" aria-hidden="true">
        <div className="chart-container mini most-solved-panel">
          <span className="skeleton skeleton-heading" />
          <TableSkeleton rows={6} />
        </div>
      </div>
    </main>

    <footer className="dashboard-footer">
      <div className="disclaimer">
        This site is not affiliated with, endorsed by, or sponsored by Jane Street. All puzzle data is compiled from publicly available information.
      </div>
    </footer>
  </div>
);

export default DashboardSkeleton;
