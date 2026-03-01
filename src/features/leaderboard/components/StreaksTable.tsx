import React from 'react';
import { useScrollPagination } from '../../../hooks/useScrollPagination';
import RankBadge from './RankBadge';

interface StreaksTableProps {
  data: Array<{ name: string; streakLength: number }>;
}

const StreaksTable: React.FC<StreaksTableProps> = React.memo(({ data }) => {
  const { visibleItems, containerRef, tableRef, handleScroll } = useScrollPagination({
    totalItems: data.length,
  });

  return (
    <div className="dashboard-table" onScroll={handleScroll} ref={containerRef}>
      <table className="leaderboard-table mini" ref={tableRef} aria-label="Solvers with longest consecutive monthly solving streaks">
        <thead>
          <tr>
            <th scope="col">Rank</th>
            <th scope="col">Solver</th>
            <th scope="col" className="center">Streak</th>
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? (
            data.slice(0, visibleItems).map((streak, index) => (
              <tr key={`streak-${index}`}>
                <td><RankBadge rank={index + 1} /></td>
                <td title={streak.name}>
                  <span className="solver-name">{streak.name}</span>
                </td>
                <td className="center">{streak.streakLength || 0}m</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3}>No data available</td>
            </tr>
          )}
          {visibleItems < data.length && (
            <tr className="loading-row">
              <td colSpan={3}>Loading more...</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

export default StreaksTable;
