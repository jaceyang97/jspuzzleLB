import React, { useEffect, useRef, useState } from 'react';

interface RisingStarsTableProps {
  data: Array<{ name: string; firstAppearance: string; solver?: string }>;
}

const RisingStarsTable: React.FC<RisingStarsTableProps> = React.memo(({ data }) => {
  const [visibleItems, setVisibleItems] = useState(20);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    if (data.length > 0 && visibleItems < data.length && containerRef.current && tableRef.current) {
      const timer = setTimeout(() => {
        const containerHeight = containerRef.current!.clientHeight;
        const tableHeight = tableRef.current!.scrollHeight;
        if (tableHeight <= containerHeight) {
          setVisibleItems(data.length);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [data.length, visibleItems]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom =
      e.currentTarget.scrollHeight - e.currentTarget.scrollTop <=
      e.currentTarget.clientHeight + 50;
    if (bottom && visibleItems < data.length) {
      setVisibleItems((prev) => Math.min(prev + 10, data.length));
    }
  };

  return (
    <div className="dashboard-table" onScroll={handleScroll} ref={containerRef}>
      <table className="leaderboard-table mini" ref={tableRef}>
        <thead>
          <tr>
            <th style={{ width: '65%' }}>Solver</th>
            <th style={{ width: '35%' }}>First Appeared</th>
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? (
            data.slice(0, visibleItems).map((solver, index) => (
              <tr key={`rising-${index}`}>
                <td>{solver.name || solver.solver}</td>
                <td>{solver.firstAppearance || 'N/A'}</td>
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


