import React, { useMemo } from 'react';
import { useScrollPagination } from '../../../hooks/useScrollPagination';
import { LeaderboardData } from '../types';
import RankBadge from './RankBadge';
import SolverColumnHeader from './SolverColumnHeader';

interface RisingStarsTableProps {
  data: LeaderboardData['risingStars'];
  searchTerm?: string;
  onSolverClick?: (name: string) => void;
}

const RisingStarsTable: React.FC<RisingStarsTableProps> = React.memo(({ data, searchTerm = '', onSolverClick }) => {
  const filteredData = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return data.filter((solver) =>
      solver.name.toLowerCase().includes(query)
    );
  }, [data, searchTerm]);

  const { visibleItems, containerRef, tableRef, handleScroll } = useScrollPagination({
    totalItems: filteredData.length,
    trackLabel: 'rising-stars',
  });

  return (
    <div className="dashboard-table" onScroll={handleScroll} ref={containerRef}>
      <table
        className="leaderboard-table mini rising-stars-table"
        ref={tableRef}
        aria-label="Rising stars - new solvers with high solve rates"
      >
        <thead>
          <tr>
            <th scope="col" style={{ width: '10%' }}>Rank</th>
            <th scope="col" style={{ width: '40%' }}><SolverColumnHeader /></th>
            <th scope="col" className="center" style={{ width: '15%' }}>Solve rate</th>
            <th scope="col" className="center" style={{ width: '15%' }}>Record</th>
            <th scope="col" className="center" style={{ width: '20%' }}>Debut</th>
          </tr>
        </thead>
        <tbody>
          {filteredData.length > 0 ? (
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
                  <td className="center leaderboard-score">{Number.isFinite(solver.solveRate) && solver.solveRate >= 0 && solver.solveRate <= 1
                    ? `${Number((solver.solveRate * 100).toFixed(1))}%` : 'N/A'}</td>
                  <td className="center leaderboard-secondary" aria-label={`${solver.puzzlesSolved} of ${solver.opportunities} published puzzles solved`}>{solver.puzzlesSolved}/{solver.opportunities}</td>
                  <td className="center leaderboard-secondary">{solver.firstAppearance || 'N/A'}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={5} className="leaderboard-empty">
                <p role="status">{searchTerm.trim() ? `No solvers match “${searchTerm.trim()}”. Try another name.` : 'No rising star rankings available yet.'}</p>
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
});

export default RisingStarsTable;
