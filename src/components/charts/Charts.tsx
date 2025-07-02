import React, { memo, useState, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

interface ChartsProps {
  solversGrowthData: any[];
  monthlyParticipationData: any[];
  mostSolvedPuzzlesData?: any[]; // Add new prop for most solved puzzles
}


// Format x-axis ticks to show only years
const formatXAxisTick = (value: string) => {
  // Extract year from date string (assuming format like "Jan 2014")
  const yearMatch = value.match(/\d{4}$/);
  return yearMatch ? yearMatch[0] : value;
};

// Custom tick formatter to only show years
const yearTickFormatter = (value: any) => {
  if (typeof value === 'string') {
    return formatXAxisTick(value);
  }
  return '';
};

// Memoized chart components to prevent unnecessary re-renders
const SolversGrowthChart = memo(({ data }: { data: any[] }) => {
  // Filter data to start from Nov 2015 (first occurrence of solvers)
  const filteredData = data.filter(item => {
    const dateMatch = item.month.match(/^([A-Za-z]{3})\s(\d{4})$/);
    if (!dateMatch) return false;
    
    const [, month, yearStr] = dateMatch;
    const year = parseInt(yearStr, 10);
    
    // Include data from Nov 2015 onwards
    return (year > 2015) || (year === 2015 && (month === "Nov" || month === "Dec"));
  });
  
  // Extract all years from the filtered data
  const years = Array.from(new Set(
    filteredData.map(item => {
      const yearMatch = item.month.match(/\d{4}$/);
      return yearMatch ? yearMatch[0] : null;
    }).filter(Boolean)
  )).sort();
  
  // Select only a subset of years to display on the x-axis to avoid overcrowding
  const displayYears = years.length > 10 
    ? years // Show every year instead of every other year
    : years;
  
  // Create custom ticks for selected years
  const customTicks = displayYears
    .filter(year => year !== '2015') // Remove 2015 from the displayed years
    .map(year => {
      // Find a data point for this year, preferably January
      const janEntry = filteredData.find(item => item.month.includes(`Jan ${year}`));
      if (janEntry) return janEntry.month;
      
      // If no January, find any month for this year
      const anyEntry = filteredData.find(item => item.month.endsWith(year));
      return anyEntry ? anyEntry.month : null;
    }).filter(Boolean);
  
  // Determine if we need to adjust font size based on number of years
  const fontSize = years.length > 8 ? 11 : 13;
  
  // Tooltip state for the chart title
  const [showTitleTooltip, setShowTitleTooltip] = useState(false);
  
  // Get current month string
  const now = new Date();
  const currentMonthStr = `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][now.getMonth()]} ${now.getFullYear()}`;
  
  // Check if current month exists in data
  const currentMonthExists = filteredData.some(item => item.month === currentMonthStr);
  
  // If current month doesn't exist in data, add it with the latest solver count
  let dataWithCurrentMonth = [...filteredData];
  if (!currentMonthExists && filteredData.length > 0) {
    const lastItem = filteredData[filteredData.length - 1];
    dataWithCurrentMonth.push({
      ...lastItem,
      month: currentMonthStr,
      isCurrentMonth: true // Flag to identify current month
    });
  }
  
  // Custom tooltip component that shows "Ongoing" for the current month
  const CustomSolversTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Check if this is the current month
      const isCurrentMonth = label === currentMonthStr;
      
      return (
        <div className="custom-tooltip">
          <p className="label">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="value" style={{ color: entry.color }}>
              {`${entry.name}: ${isCurrentMonth ? 'Ongoing' : entry.value.toLocaleString()}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Custom dot component that flashes for the current month
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    
    // Check if this is the current month
    const isCurrentMonth = payload.month === currentMonthStr;
    
    if (isCurrentMonth) {
      return (
        <g>
          <circle 
            cx={cx} 
            cy={cy} 
            r={3} 
            fill="#A83232" 
            stroke="#fff"
            strokeWidth={1}
            className="pulsing-dot"
          />
          <text 
            x={cx} 
            y={cy - 10} 
            textAnchor="middle" 
            fill="#A83232" 
            fontSize={9}
            fontWeight={500}
            className="pulsing-text"
          >
            Ongoing
          </text>
        </g>
      );
    }
    
    // For non-current months, return a small dot or nothing
    return props.r > 0 ? (
      <circle 
        cx={cx} 
        cy={cy} 
        r={0.5} 
        fill="#2E8B57" 
      />
    ) : null;
  };
  
  return (
    <div className="chart-container mini" style={{ display: 'flex', flexDirection: 'column', padding: '8px 5px 0 5px' }}>
      <h3 
        onMouseEnter={() => setShowTitleTooltip(true)}
        onMouseLeave={() => setShowTitleTooltip(false)}
        style={{ position: 'relative', cursor: 'help' }}
      >
        🌱 Solvers Growth
        {showTitleTooltip && (
          <div className="chart-title-tooltip">
            The puzzle series started in Jan 2014, but solver lists are only publicly available from Nov 2015 onwards.
          </div>
        )}
      </h3>
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 0.6; }
            50% { opacity: 1; }
            100% { opacity: 0.6; }
          }
          .pulsing-dot, .pulsing-text {
            animation: pulse 1s infinite ease-in-out;
          }
        `}
      </style>
      <ResponsiveContainer width="100%" height="100%" minHeight={120}>
        <AreaChart 
          data={dataWithCurrentMonth} 
          margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorSolvers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2E8B57" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#2E8B57" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize, fontWeight: 500 }}
            ticks={customTicks}
            tickFormatter={yearTickFormatter}
            tickMargin={8}
            height={30}
            padding={{ left: 5, right: 5 }}
            axisLine={{ stroke: '#ccc' }}
            tickLine={{ stroke: '#ccc' }}
            interval={0} // Force display of all ticks
            scale="band"
          />
          <YAxis 
            tick={{ fontSize: 12 }} 
            width={35}
            tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
            axisLine={{ stroke: '#ccc' }}
            tickLine={{ stroke: '#ccc' }}
            domain={[0, 'dataMax']}
          />
          <Tooltip content={<CustomSolversTooltip />} />
          <Area 
            type="monotone" 
            dataKey="totalSolvers" 
            name="Total Solvers"
            stroke="#2E8B57" 
            strokeWidth={1.5}
            fillOpacity={1} 
            fill="url(#colorSolvers)" 
            isAnimationActive={false}
            dot={<CustomDot />}
            activeDot={{ r: 4, strokeWidth: 1, fill: "#2E8B57" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

// Optimized component for displaying top puzzles
const MostSolvedPuzzlesTable = memo(({ data }: { data: any[] }) => {
  // Memoize sorted data to prevent recalculation on re-renders
  const topPuzzles = useMemo(() => {
    return (data?.length ? [...data] : [])
      .sort((a, b) => b.solvers - a.solvers)
      .slice(0, 10);
  }, [data]);
  
  const [showTitleTooltip, setShowTitleTooltip] = useState(false);
  
  // Pre-compute month codes for date formatting
  const monthCodes = useMemo(() => [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ], []);
  
  // Memoized helper functions to avoid recreating on each render
  const helpers = useMemo(() => ({
    // Convert solution URL to puzzle URL
    getPuzzleUrl: (solutionUrl: string) => {
      return solutionUrl?.replace("-solution", "-index") || "#";
    },
    
    // Format puzzle date from ID (YYYY-MM)
    formatPuzzleDate: (id: string) => {
      if (!id?.includes('-')) return 'N/A';
      
      const [year, monthStr] = id.split('-');
      const month = parseInt(monthStr, 10);
      
      return month >= 1 && month <= 12 ? 
        `${monthCodes[month-1]} ${year}` : 'N/A';
    }
  }), [monthCodes]);

  return (
    <div className="chart-container mini" style={{ display: 'flex', flexDirection: 'column', padding: '8px 5px 0' }}>
      <h3 
        onMouseEnter={() => setShowTitleTooltip(true)}
        onMouseLeave={() => setShowTitleTooltip(false)}
        style={{ position: 'relative', cursor: 'help' }}
      >
        🧩 Top 10 Most Solved Puzzles
        {showTitleTooltip && (
          <div className="chart-title-tooltip">
            The number of solvers can reflect the difficulty of the puzzle, but can also reflect the number of unique participants during that month.
          </div>
        )}
      </h3>
      <div className="puzzle-table-container" style={{ flex: '1', display: 'flex', flexDirection: 'column', marginBottom: '0' }}>
        <table className="puzzle-table" style={{ flex: '1', marginBottom: '0' }}>
          <thead>
            <tr>
              <th style={{ width: 'calc(100% - 160px)' }}>Puzzle</th>
              <th style={{ width: '80px' }}>Date</th>
              <th style={{ width: '80px' }}>Solvers</th>
            </tr>
          </thead>
          <tbody>
            {topPuzzles.length > 0 ? (
              topPuzzles.map((puzzle, index) => {
                const isLast = index === topPuzzles.length - 1;
                const borderStyle = isLast ? 'none' : '1px solid #eee';
                
                return (
                  <tr key={puzzle.id || `puzzle-${index}`}>
                    <td style={{ borderBottom: borderStyle }}>
                      <a 
                        href={helpers.getPuzzleUrl(puzzle.solution_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="puzzle-link-table"
                        title={puzzle.name}
                      >
                        {puzzle.name}
                      </a>
                    </td>
                    <td style={{ borderBottom: borderStyle }}>{helpers.formatPuzzleDate(puzzle.id)}</td>
                    <td style={{ borderBottom: borderStyle }}>{puzzle.solvers.toLocaleString()}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={3}>No puzzle data available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

const Charts: React.FC<ChartsProps> = ({ 
  solversGrowthData, 
  monthlyParticipationData,
  mostSolvedPuzzlesData = [] 
}) => {
  return (
    <div className="charts-dashboard">
      <SolversGrowthChart data={solversGrowthData} />
      <MostSolvedPuzzlesTable data={mostSolvedPuzzlesData} />
      {/* 
        When adding the Rising Stars section, use this emoji for the header:
        - 💫 for Rising Stars section
      */}
    </div>
  );
};

export default Charts; 