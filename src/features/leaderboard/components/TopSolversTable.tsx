import React, { useEffect, useMemo } from 'react';
import { useScrollPagination } from '../../../hooks/useScrollPagination';
import RankBadge from './RankBadge';
import SolverColumnHeader from './SolverColumnHeader';
import Tooltip from '../../../components/Tooltip';
import { trackEvent } from '../../../utils/analytics';

interface TopSolversTableProps {
  data: Array<{
    name: string;
    puzzlesSolved: number;
    lastSolve: string;
    rankChange?: number | null;
  }>;
  searchTerm: string;
  onSolverClick?: (name: string) => void;
}

const RankChange: React.FC<{ change: number | null | undefined }> = ({ change }) => {
  if (change === null) {
    return (
      <span className="rank-change new" aria-label="Not ranked last month">
        NEW
      </span>
    );
  }
  if (change === undefined || change === 0) {
    return (
      <span className="rank-change same" aria-label="No rank change since last month">
        –
      </span>
    );
  }
  const up = change > 0;
  return (
    <span
      className={`rank-change ${up ? 'up' : 'down'}`}
      aria-label={`${up ? 'Up' : 'Down'} ${Math.abs(change)} since last month`}
    >
      {up ? '▲' : '▼'}
      {Math.abs(change)}
    </span>
  );
};

const TopSolversTable: React.FC<TopSolversTableProps> = React.memo(
  ({ data, searchTerm, onSolverClick }) => {
    const filteredData = useMemo(() => {
      const query = searchTerm.trim().toLowerCase();
      return data.map((solver, index) => ({ ...solver, rank: index + 1 })).filter((solver) =>
        solver.name.toLowerCase().includes(query)
      );
    }, [data, searchTerm]);

    const { visibleItems, containerRef, tableRef, handleScroll } = useScrollPagination({
      totalItems: filteredData.length,
      trackLabel: 'top-solvers',
    });

    // Report searches once typing settles, with whether they found anyone.
    useEffect(() => {
      const query = searchTerm.trim();
      if (!query) return;
      const timer = setTimeout(() => {
        trackEvent('solver_search', {
          query: query.toLowerCase(),
          results: filteredData.length,
          hit: filteredData.length > 0,
        });
      }, 1200);
      return () => clearTimeout(timer);
    }, [searchTerm, filteredData.length]);

    return (
      <div className="dashboard-table" onScroll={handleScroll} ref={containerRef}>
        <table
          className="leaderboard-table mini"
          ref={tableRef}
          aria-label="Top puzzle solvers ranked by number of puzzles solved"
        >
          <thead>
            <tr>
              <th scope="col" style={{ width: '10%' }}>Rank</th>
              <th scope="col" style={{ width: '43%' }}><SolverColumnHeader /></th>
              <th
                scope="col"
                className="center th-has-tooltip"
                style={{ width: '12%' }}
                aria-label="Rank change vs. last month"
              >
                <Tooltip content="Rank change vs. last month">±</Tooltip>
              </th>
              <th scope="col" className="center" style={{ width: '15%' }}>Solved</th>
              <th scope="col" className="center" style={{ width: '20%' }}>Latest solve</th>
            </tr>
          </thead>
          <tbody>
            {filteredData && filteredData.length > 0 ? (
              filteredData.slice(0, visibleItems).map((solver) => {
                const clickable = !!onSolverClick;
                return (
                  <tr
                    key={solver.name}
                    className={clickable ? 'clickable-row' : undefined}
                    onClick={clickable ? () => onSolverClick!(solver.name) : undefined}
                  >
                    <td className="rank-cell"><span aria-label={`Rank ${solver.rank}`}><RankBadge rank={solver.rank} /></span></td>
                    <td title={solver.name}>
                      {onSolverClick ? (
                        <button
                          type="button"
                          className="solver-name-button"
                          aria-label={`Open profile for ${solver.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onSolverClick(solver.name);
                          }}
                        >
                          {solver.name}
                        </button>
                      ) : <span className="solver-name">{solver.name}</span>}
                    </td>
                    <td className="center"><RankChange change={solver.rankChange} /></td>
                    <td className="center leaderboard-score">{solver.puzzlesSolved}</td>
                    <td className="center leaderboard-secondary">{solver.lastSolve || 'N/A'}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="leaderboard-empty">
                  <p role="status">{searchTerm.trim() ? `No solvers match “${searchTerm.trim()}”. Try another name.` : 'No solver rankings available yet.'}</p>
                </td>
              </tr>
            )}
            {visibleItems < filteredData.length && (
              <tr className="loading-row">
                <td colSpan={5}>Loading more...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }
);

export default TopSolversTable;
