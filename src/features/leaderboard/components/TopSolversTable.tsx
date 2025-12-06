import React, { useEffect, useMemo, useRef, useState } from 'react';

interface TopSolversTableProps {
  data: Array<{ name: string; puzzlesSolved: number; lastSolve: string; solver?: string }>;
  searchTerm: string;
}

const TopSolversTable: React.FC<TopSolversTableProps> = React.memo(({ data, searchTerm }) => {
  const [visibleItems, setVisibleItems] = useState(20);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    return data.filter((solver) =>
      (solver.name || solver.solver || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  useEffect(() => {
    if (
      filteredData.length > 0 &&
      visibleItems < filteredData.length &&
      containerRef.current &&
      tableRef.current
    ) {
      const timer = setTimeout(() => {
        const containerHeight = containerRef.current!.clientHeight;
        const tableHeight = tableRef.current!.scrollHeight;
        if (tableHeight <= containerHeight) {
          setVisibleItems(filteredData.length);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [filteredData.length, visibleItems]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom =
      e.currentTarget.scrollHeight - e.currentTarget.scrollTop <=
      e.currentTarget.clientHeight + 50;
    if (bottom && visibleItems < filteredData.length) {
      setVisibleItems((prev) => Math.min(prev + 10, filteredData.length));
    }
  };

  const getOriginalRank = (solverName: string) => {
    const originalIndex = data.findIndex((solver) => (solver.name || solver.solver) === solverName);
    return originalIndex + 1;
  };

  return (
    <div className="dashboard-table" onScroll={handleScroll} ref={containerRef}>
      <table className="leaderboard-table mini" ref={tableRef}>
        <thead>
          <tr>
            <th style={{ width: '10%' }}>Rank</th>
            <th style={{ width: '55%' }}>Solver</th>
            <th style={{ width: '15%' }}>Puzzles</th>
            <th style={{ width: '20%' }}>Most Recent</th>
          </tr>
        </thead>
        <tbody>
          {filteredData && filteredData.length > 0 ? (
            filteredData.slice(0, visibleItems).map((solver, index) => {
              const originalRank = getOriginalRank(solver.name || solver.solver || '');
              return (
                <tr key={`solver-${index}`}>
                  <td>{originalRank}</td>
                  <td>
                    <span style={{ display: 'inline-block', width: '25px', textAlign: 'center' }}>
                      {originalRank <= 3 ? ['🥇', '🥈', '🥉'][originalRank - 1] : ''}
                    </span>
                    {solver.name || solver.solver}
                  </td>
                  <td>{solver.puzzlesSolved}</td>
                  <td>{solver.lastSolve || 'N/A'}</td>
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
});

export default TopSolversTable;


