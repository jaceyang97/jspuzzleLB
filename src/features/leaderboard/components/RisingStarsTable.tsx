import React from 'react';
import { useScrollPagination } from '../../../hooks/useScrollPagination';

interface RisingStarsTableProps {
  data: Array<{ name: string; firstAppearance: string }>;
}

const RisingStarsTable: React.FC<RisingStarsTableProps> = React.memo(({ data }) => {
  const { visibleItems, containerRef, tableRef, handleScroll } = useScrollPagination({
    totalItems: data.length,
  });

  return (
    <div className="dashboard-table" onScroll={handleScroll} ref={containerRef}>
      <table className="leaderboard-table mini" ref={tableRef} aria-label="Rising stars - new solvers with high solve rates">
        <thead>
          <tr>
            <th scope="col" style={{ width: '65%' }}>Solver</th>
            <th scope="col" className="center" style={{ width: '35%' }}>First Appeared</th>
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? (
            data.slice(0, visibleItems).map((solver, index) => (
              <tr key={`rising-${index}`}>
                <td>{solver.name}</td>
                <td className="center">{solver.firstAppearance || 'N/A'}</td>
              </tr>
            ))
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
