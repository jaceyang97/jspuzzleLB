import React, { useEffect, useRef, useState } from 'react';

interface StreaksTableProps {
  data: Array<{ name: string; streakLength: number; solver?: string }>;
}

const StreaksTable: React.FC<StreaksTableProps> = React.memo(({ data }) => {
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
            <th>Rank</th>
            <th>Solver</th>
            <th>Streak</th>
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? (
            data.slice(0, visibleItems).map((streak, index) => (
              <tr key={`streak-${index}`}>
                <td>{index + 1}</td>
                <td>
                  <span style={{ display: 'inline-block', width: '25px', textAlign: 'center' }}>
                    {index < 3 ? ['🥇', '🥈', '🥉'][index] : ''}
                  </span>
                  {streak.name || streak.solver}
                </td>
                <td>{streak.streakLength || 0}m</td>
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


