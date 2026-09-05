import React, { useMemo } from 'react';
import { useScrollPagination } from '../../../hooks/useScrollPagination';
import RankBadge from './RankBadge';
import SolverColumnHeader from './SolverColumnHeader';

interface StreaksTableProps {
  data: Array<{ name: string; streakLength: number }>;
  searchTerm?: string;
  onSolverClick?: (name: string) => void;
}

const StreaksTable: React.FC<StreaksTableProps> = React.memo(({ data, searchTerm = '', onSolverClick }) => {
  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return data.map((streak, index) => ({ ...streak, rank: index + 1 })).filter((streak) =>
      streak.name.toLowerCase().includes(query)
    );
  }, [data, searchTerm]);

  const { visibleItems, containerRef, tableRef, handleScroll } = useScrollPagination({
    totalItems: filteredData.length,
    trackLabel: 'streaks',
  });

  return (
    <div className="dashboard-table" onScroll={handleScroll} ref={containerRef}>
      <table
        className="leaderboard-table mini"
        ref={tableRef}
        aria-label="Solvers with longest consecutive monthly solving streaks"
      >
        <thead>
          <tr>
            <th scope="col" style={{ width: '10%' }}>Rank</th>
            <th scope="col" style={{ width: '70%' }}><SolverColumnHeader /></th>
            <th scope="col" className="center" style={{ width: '20%' }}>Streak</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.length > 0 ? (
            filteredData.slice(0, visibleItems).map((streak) => {
              const clickable = !!onSolverClick;
              return (
                <tr
                  key={`streak-${streak.rank}`}
                  className={clickable ? 'clickable-row' : undefined}
                  onClick={clickable ? () => onSolverClick!(streak.name) : undefined}
                >
                  <td className="rank-cell"><span aria-label={`Rank ${streak.rank}`}><RankBadge rank={streak.rank} /></span></td>
                  <td title={streak.name}>
                    {onSolverClick ? (
                      <button
                        type="button"
                        className="solver-name-button"
                        aria-label={`Open profile for ${streak.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onSolverClick(streak.name);
                        }}
                      >
                        {streak.name}
                      </button>
                    ) : <span className="solver-name">{streak.name}</span>}
                  </td>
                  <td className="center leaderboard-score">{streak.streakLength || 0}<span className="leaderboard-secondary"> months</span></td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={3} className="leaderboard-empty">
                <p role="status">{searchTerm.trim() ? `No solvers match “${searchTerm.trim()}”. Try another name.` : 'No streak rankings available yet.'}</p>
              </td>
            </tr>
          )}
          {visibleItems < filteredData.length && (
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
