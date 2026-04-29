import React from 'react';
import { useScrollPagination } from '../../../hooks/useScrollPagination';

interface RisingStarsTableProps {
  data: Array<{ name: string; firstAppearance: string }>;
  onSolverClick?: (name: string) => void;
}

const RisingStarsTable: React.FC<RisingStarsTableProps> = React.memo(({ data, onSolverClick }) => {
  const { visibleItems, containerRef, tableRef, handleScroll } = useScrollPagination({
    totalItems: data.length,
  });

  return (
    <div className="dashboard-table" onScroll={handleScroll} ref={containerRef}>
      <table
        className="leaderboard-table mini"
        ref={tableRef}
        aria-label="Rising stars - new solvers with high solve rates"
      >
        <thead>
          <tr>
            <th scope="col" style={{ width: '65%' }}>Solver</th>
            <th scope="col" className="center" style={{ width: '35%' }}>First Appeared</th>
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? (
            data.slice(0, visibleItems).map((solver, index) => {
              const clickable = !!onSolverClick;
              return (
                <tr
                  key={`rising-${index}`}
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
                  <td>
                    <span className="solver-name">{solver.name}</span>
                  </td>
                  <td className="center">{solver.firstAppearance || 'N/A'}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={2}>No data available</td>
            </tr>
          )}
          {visibleItems < data.length && (
            <tr className="loading-row">
              <td colSpan={2}>Loading more...</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

export default RisingStarsTable;
