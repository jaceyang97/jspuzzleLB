import React from 'react';

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
  <div className="dashboard-layout" aria-busy="true" aria-live="polite">
    <header className="dashboard-header">
      <div className="header-title-container">
        <h1 className="header-title">
          <span className="title-bold">Jane Street</span>
          <span className="title-separator"> | </span>
          <span className="title-regular">Puzzle Leaderboard</span>
        </h1>
      </div>
    </header>

    <div className="new-solvers-banner">
      <span className="skeleton skeleton-banner" />
    </div>

    <div className="dashboard-grid four-column">
      <div className="dashboard-item stats-charts-column">
        <div className="stats-cards">
          <div className="stats-card">
            <span className="skeleton skeleton-stat-label" />
            <span className="skeleton skeleton-stat-value" />
          </div>
          <div className="stats-card">
            <span className="skeleton skeleton-stat-label" />
            <span className="skeleton skeleton-stat-value" />
          </div>
        </div>

        <span className="skeleton skeleton-distribution" />

        <div className="charts-container">
          <span className="skeleton skeleton-chart" />
          <span className="skeleton skeleton-chart" />
        </div>
      </div>

      <div className="dashboard-item top-solvers-column">
        <div className="section-header">
          <span className="skeleton skeleton-heading" />
          <span className="skeleton skeleton-search" />
        </div>
        <TableSkeleton rows={14} />
      </div>

      <div className="dashboard-item streaks-column">
        <span className="skeleton skeleton-heading" />
        <TableSkeleton rows={12} />
      </div>

      <div className="dashboard-item rising-stars-column">
        <span className="skeleton skeleton-heading" />
        <TableSkeleton rows={12} />
      </div>
    </div>

    <footer className="dashboard-footer">
      <div className="disclaimer">
        This site is not affiliated with, endorsed by, or sponsored by Jane Street. All puzzle data is compiled from publicly available information.
      </div>
    </footer>
  </div>
);

export default DashboardSkeleton;
