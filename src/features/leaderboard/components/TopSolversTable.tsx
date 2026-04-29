import React, { useMemo } from 'react';
import { useScrollPagination } from '../../../hooks/useScrollPagination';
import RankBadge from './RankBadge';

interface TopSolversTableProps {
  data: Array<{ name: string; puzzlesSolved: number; lastSolve: string }>;
  searchTerm: string;
  onSolverClick?: (name: string) => void;
}

const TopSolversTable: React.FC<TopSolversTableProps> = React.memo(
  ({ data, searchTerm, onSolverClick }) => {
    // Build a lookup map for O(1) rank access instead of O(n) findIndex per row
    const rankMap = useMemo(() => {
      const map = new Map<string, number>();
      data.forEach((solver, index) => {
        map.set(solver.name, index + 1);
      });
      return map;
    }, [data]);

    const filteredData = useMemo(() => {
      if (!searchTerm.trim()) return data;
      return data.filter((solver) =>
        solver.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }, [data, searchTerm]);

    const { visibleItems, containerRef, tableRef, handleScroll } = useScrollPagination({
      totalItems: filteredData.length,
    });

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
              <th scope="col" style={{ width: '55%' }}>Solver</th>
              <th scope="col" className="center" style={{ width: '15%' }}>Puzzles</th>
              <th scope="col" className="center" style={{ width: '20%' }}>Most Recent</th>
            </tr>
          </thead>
          <tbody>
            {filteredData && filteredData.length > 0 ? (
              filteredData.slice(0, visibleItems).map((solver) => {
                const originalRank = rankMap.get(solver.name) ?? 0;
                const clickable = !!onSolverClick;
                return (
                  <tr
                    key={solver.name}
                    className={clickable ? 'clickable-row' : undefined}
                    onClick={clickable ? () => onSolverClick!(solver.name) : undefined}
                    role={clickable ? 'button' : undefined}
                    tabIndex={clickable ? 0 : undefined}
                    aria-label={clickable ? `Open profile for ${solver.name}` : undefined}
                    onKeyDown={clickable ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSolverClick!(solver.name);
                      }
                    } : undefined}
                  >
                    <td><RankBadge rank={originalRank} /></td>
                    <td title={solver.name}>
                      <span className="solver-name">{solver.name}</span>
                    </td>
                    <td className="center">{solver.puzzlesSolved}</td>
                    <td className="center">{solver.lastSolve || 'N/A'}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={4}>No data available</td>
              </tr>
            )}
            {visibleItems < filteredData.length && (
              <tr className="loading-row">
                <td colSpan={4}>Loading more...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  }
);

export default TopSolversTable;
