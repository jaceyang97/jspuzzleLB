import React from 'react';

interface StatsCardsProps {
  totalPuzzles: number;
  uniqueSolvers: number;
}

const StatsCards: React.FC<StatsCardsProps> = ({ totalPuzzles, uniqueSolvers }) => (
  <div className="stats-cards">
    <div className="stats-card">
      <h3>Total Puzzles</h3>
      <div className="stat-value">{totalPuzzles}</div>
    </div>
    <div className="stats-card">
      <h3>Unique Solvers</h3>
      <div className="stat-value">{uniqueSolvers.toLocaleString('en-US')}</div>
    </div>
  </div>
);

export default StatsCards;


