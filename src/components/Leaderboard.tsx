import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { calculateLeaderboardData, preProcessData } from '../utils/leaderboardUtils';
import './Leaderboard.css';
import Confetti from '@tholman/confetti';
import puzzleData from '../data/data.json';

// Import charts lazily to improve initial load time
const Charts = lazy(() => import('./charts/Charts'));

// Compact table components for dashboard view
const TopSolversTable = React.memo(({ data, searchTerm }: { data: any[], searchTerm: string }) => {
  const [visibleItems, setVisibleItems] = useState(20);
  
  // Debug the data
  useEffect(() => {
    console.log('Top Solvers Data:', data);
  }, [data]);
  
  // Filter data based on search term
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    return data.filter(solver => 
      (solver.name || solver.solver || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 50;
    if (bottom && visibleItems < filteredData.length) {
      setVisibleItems(prev => Math.min(prev + 10, filteredData.length));
    }
  };
  
  return (
    <div className="dashboard-table" onScroll={handleScroll}>
      <table className="leaderboard-table mini">
        <thead>
          <tr>
            <th style={{ width: '10%' }}>Rank</th>
            <th style={{ width: '55%' }}>Solver</th>
            <th style={{ width: '15%' }}>Puzzles</th>
            <th style={{ width: '20%' }}>Most Recent</th>
          </tr>
        </thead>
        <tbody>
          {filteredData && filteredData.length > 0 ? filteredData.slice(0, visibleItems).map((solver, index) => (
            <tr key={`solver-${index}`}>
              <td>{index + 1}</td>
              <td>
                <span style={{ display: 'inline-block', width: '25px', textAlign: 'center' }}>
                  {index < 3 ? [`🥇`, `🥈`, `🥉`][index] : ''}
                </span>
                {solver.name || solver.solver}
              </td>
              <td>{solver.puzzlesSolved}</td>
              <td>{solver.lastSolve || 'N/A'}</td>
            </tr>
          )) : (
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

const StreaksTable = React.memo(({ data }: { data: any[] }) => {
  const [visibleItems, setVisibleItems] = useState(20);
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 50;
    if (bottom && visibleItems < data.length) {
      setVisibleItems(prev => Math.min(prev + 10, data.length));
    }
  };
  
  return (
    <div className="dashboard-table" onScroll={handleScroll}>
      <table className="leaderboard-table mini">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Solver</th>
            <th>Streak</th>
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? data.slice(0, visibleItems).map((streak, index) => (
            <tr key={`streak-${index}`}>
              <td>{index + 1}</td>
              <td>
                <span style={{ display: 'inline-block', width: '25px', textAlign: 'center' }}>
                  {index < 3 ? [`🥇`, `🥈`, `🥉`][index] : ''}
                </span>
                {streak.solver || streak.name}
              </td>
              <td>{streak.length || streak.streakLength}m</td>
            </tr>
          )) : (
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

const RisingStarsTable = React.memo(({ data }: { data: any[] }) => {
  const [visibleItems, setVisibleItems] = useState(20);
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom = e.currentTarget.scrollHeight - e.currentTarget.scrollTop <= e.currentTarget.clientHeight + 50;
    if (bottom && visibleItems < data.length) {
      setVisibleItems(prev => Math.min(prev + 10, data.length));
    }
  };
  
  return (
    <div className="dashboard-table" onScroll={handleScroll}>
      <table className="leaderboard-table mini">
        <thead>
          <tr>
            <th style={{ width: '65%' }}>Solver</th>
            <th style={{ width: '35%' }}>First Appeared</th>
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? data.slice(0, visibleItems).map((solver, index) => (
            <tr key={`rising-${index}`}>
              <td>{solver.solver || solver.name}</td>
              <td>{solver.firstAppearance || 'N/A'}</td>
            </tr>
          )) : (
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

const SolverDistributionChart = React.memo(({ data }: { data: any[] }) => {
  // Calculate solver distribution
  const distribution = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    const onePuzzle = data.filter(solver => (solver.puzzlesSolved || 0) === 1).length;
    const twoToNine = data.filter(solver => {
      const solved = solver.puzzlesSolved || 0;
      return solved >= 2 && solved <= 9;
    }).length;
    const tenPlus = data.filter(solver => (solver.puzzlesSolved || 0) >= 10).length;
    
    const total = data.length;
    
    // Calculate raw percentages
    const onePuzzlePercent = (onePuzzle / total) * 100;
    const twoToNinePercent = (twoToNine / total) * 100;
    const tenPlusPercent = (tenPlus / total) * 100;
    
    // Round all percentages and adjust the largest one to ensure sum = 100%
    const roundedOne = Math.round(onePuzzlePercent);
    const roundedTwo = Math.round(twoToNinePercent);
    const roundedTen = Math.round(tenPlusPercent);
    
    // Find which category has the largest decimal part to adjust
    const decimals = [
      { value: onePuzzlePercent - roundedOne, index: 'onePuzzle' },
      { value: twoToNinePercent - roundedTwo, index: 'twoToNine' },
      { value: tenPlusPercent - roundedTen, index: 'tenPlus' }
    ];
    
    const largestDecimal = decimals.reduce((max, current) => 
      current.value > max.value ? current : max
    );
    
    // Adjust the largest decimal to ensure sum = 100%
    let adjustedOne = roundedOne;
    let adjustedTwo = roundedTwo;
    let adjustedTen = roundedTen;
    
    if (largestDecimal.index === 'onePuzzle') {
      adjustedOne = 100 - roundedTwo - roundedTen;
    } else if (largestDecimal.index === 'twoToNine') {
      adjustedTwo = 100 - roundedOne - roundedTen;
    } else {
      adjustedTen = 100 - roundedOne - roundedTwo;
    }
    
    return {
      onePuzzle: { count: onePuzzle, percentage: adjustedOne },
      twoToNine: { count: twoToNine, percentage: adjustedTwo },
      tenPlus: { count: tenPlus, percentage: adjustedTen }
    };
  }, [data]);
  
  if (!distribution) return <div>No data available</div>;
  
  return (
    <div className="solver-distribution">
      <div className="distribution-chart">
        <div className="distribution-bar">
          <div 
            className="bar-segment one-puzzle" 
            style={{ width: `${distribution.onePuzzle.percentage}%` }}
          >
            <div className="segment-label">
              <span className="percentage">{distribution.onePuzzle.percentage}%</span>
            </div>
          </div>
          <div 
            className="bar-segment two-nine" 
            style={{ width: `${distribution.twoToNine.percentage}%` }}
          >
            <div className="segment-label">
              <span className="percentage">{distribution.twoToNine.percentage}%</span>
            </div>
          </div>
          <div 
            className="bar-segment ten-plus" 
            style={{ width: `${distribution.tenPlus.percentage}%` }}
          >
            <div className="segment-label">
              <span className="percentage">{distribution.tenPlus.percentage}%</span>
            </div>
          </div>
        </div>
      </div>
      <div className="distribution-legend">
        <div className="legend-item">
          <span className="legend-color one-puzzle"></span>
          <span className="legend-text">One-Timers (1 puzzle)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color two-nine"></span>
          <span className="legend-text">Enthusiasts (2-9 puzzles)</span>
        </div>
        <div className="legend-item">
          <span className="legend-color ten-plus"></span>
          <span className="legend-text">Masters (10+ puzzles)</span>
        </div>
      </div>
    </div>
  );
});

const LoadingSpinner = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
    <p>Loading dashboard...</p>
  </div>
);

// Progressive loading states
enum LoadingState {
  INITIAL = 'initial',
  COMPLETE = 'complete'
}

// Normalize data structure to ensure consistent property names
const normalizeData = (data: any) => {
  if (!data) return null;
  
  // Create a deep copy to avoid mutating the original data
  const normalizedData = JSON.parse(JSON.stringify(data));
  
  // Helper function to format dates consistently (MMM YYYY format)
  const formatDate = (dateText: string) => {
    if (!dateText) return 'N/A';
    
    // If the date is already in MMM YYYY format, return it as is
    if (/^[A-Za-z]{3} \d{4}$/.test(dateText)) return dateText;
    
    // If the date is in "Month YYYY" format (e.g., "January 2023"), convert to "MMM YYYY"
    try {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      const monthCodes = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      
      // Use a more efficient approach with a Map for month lookup
      const monthMap = new Map(monthNames.map((name, i) => [name, monthCodes[i]]));
      
      const parts = dateText.split(' ');
      if (parts.length === 2 && monthMap.has(parts[0])) {
        return `${monthMap.get(parts[0])} ${parts[1]}`;
      }
      
      return dateText;
    } catch (e) {
      console.error('Error formatting date:', dateText, e);
      return dateText;
    }
  };
  
  // Normalize top solvers data
  if (normalizedData.topSolvers) {
    normalizedData.topSolvers = normalizedData.topSolvers.map((solver: any) => ({
      name: solver.name || solver.solver,
      puzzlesSolved: solver.puzzlesSolved || 0,
      firstAppearance: formatDate(solver.firstAppearance) || 'N/A',
      lastSolve: formatDate(solver.lastSolve) || 'N/A'
    }));
  }
  
  // Normalize streaks data
  if (normalizedData.longestStreaks) {
    normalizedData.longestStreaks = normalizedData.longestStreaks.map((streak: any) => ({
      name: streak.solver || streak.name,
      streakLength: streak.length || streak.streakLength || 0,
      startDate: formatDate(streak.startDate || streak.start) || 'N/A',
      endDate: formatDate(streak.endDate || streak.end) || 'N/A'
    }));
  }
  
  // Normalize rising stars data
  if (normalizedData.risingStars) {
    normalizedData.risingStars = normalizedData.risingStars.map((solver: any) => ({
      name: solver.solver || solver.name,
      solveRate: solver.solveRate || 0,
      puzzlesSolved: solver.puzzlesSolved || 0,
      firstAppearance: formatDate(solver.firstAppearance) || 'N/A'
    }));
  }
  
  return normalizedData;
};

const Leaderboard: React.FC = () => {
  // Use progressive loading states
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.INITIAL);
  const [data, setData] = useState<any>(null);
  const [showRisingStarsTooltip, setShowRisingStarsTooltip] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [topSolversSearch, setTopSolversSearch] = useState('');

  // Load data progressively to avoid blocking the UI
  useEffect(() => {
    let isMounted = true;
    
    // Start pre-processing data in the background
    preProcessData(() => {
      // Load data function - optimize with web workers if data processing becomes heavier
      const loadData = () => {
        const leaderboardData = calculateLeaderboardData();
        
        // Normalize data structure for consistent property access
        const normalizedData = normalizeData(leaderboardData);
        
        if (isMounted) {
          setData(normalizedData);
          setLoadingState(LoadingState.COMPLETE);
          setShowConfetti(true);
        }
      };
      
      // Use requestAnimationFrame to schedule non-blocking UI update
      requestAnimationFrame(loadData);
    });
    
    return () => { isMounted = false; };
  }, []);

  // Hide confetti after 5 seconds
  useEffect(() => {
    if (!showConfetti) return;
    
    const timer = setTimeout(() => {
      setShowConfetti(false);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [showConfetti]);

  // Memoize chart data to prevent unnecessary recalculations
  const solversGrowthData = useMemo(() => 
    data?.solversGrowth || [], [data]);

  const monthlyParticipationData = useMemo(() => 
    data?.monthlyParticipation?.slice(-24) || [], [data]);
  
  const mostSolvedPuzzlesData = useMemo(() => 
    data?.mostSolvedPuzzles?.slice(0, 10) || [], [data]);

  // Get the latest data date from the puzzle data
  const getLatestDataDate = () => {
    if (!puzzleData || puzzleData.length === 0) return 'Unknown';
    
    // Sort puzzles by date (newest first)
    const sortedPuzzles = [...puzzleData].sort((a, b) => {
      const dateA = new Date(a.date_text);
      const dateB = new Date(b.date_text);
      return dateB.getTime() - dateA.getTime();
    });
    
    // Find the most recent puzzle that has solvers
    const latestWithSolvers = sortedPuzzles.find(puzzle => 
      puzzle.solvers && puzzle.solvers.length > 0
    );
    
    // Return the date of the most recent puzzle with solvers, or "Unknown" if none found
    return latestWithSolvers ? latestWithSolvers.date_text : 'Unknown';
  };

  // Show loading spinner while data is being loaded
  if (loadingState === LoadingState.INITIAL || !data) {
    return <LoadingSpinner />;
  }

  return (
    <div className="dashboard-layout">
      {showConfetti && <Confetti total={198} />}
      <header className="dashboard-header">
        <div className="header-title-container">
          <a 
            href="https://github.com/jaceyang97/practices/blob/main/p31.js"
            target="_blank"
            rel="noopener noreferrer"
            className="logo-link"
            title="Check out this logo in p5.js"
          >
            <img src="/js_puzzle_solver_logo.svg" alt="Jane Street Puzzle" className="header-logo" />
          </a>
          <h1 className="header-title">
            <span className="title-bold">Jane Street</span>
            <span className="title-separator"> | </span>
            <span className="title-regular">Puzzle Leaderboard</span>
          </h1>
          <div className="intro-container">
            <span className="intro-button">INTRO</span>
            <div className="intro-tooltip">
              <table className="intro-leaderboard-table" style={{ width: '100%', marginBottom: '8px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '10%', padding: '8px', backgroundColor: '#f5f7fa', fontWeight: '600', color: '#2c3e50', textAlign: 'left', borderBottom: '2px solid #e0e4e9' }}>Rank</th>
                    <th style={{ width: '90%', padding: '8px', backgroundColor: '#f5f7fa', fontWeight: '600', color: '#2c3e50', textAlign: 'left', borderBottom: '2px solid #e0e4e9' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'nowrap' }}>1</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}><strong>Why Leaderboards?</strong></td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'nowrap' }}>2</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>What's a programmer like me doing building a leaderboard for Jane Street puzzles? Good question—it's mostly an excuse to procrastinate while feeling productive.</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'nowrap' }}>3</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>Jane Street thrives on turning brain teasers into financial wizardry. While they puzzle out market strategies, I puzzle out how to scrape puzzle data without getting banned. It's a delicate dance.</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'nowrap' }}>4</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>Tracking solvers isn't about glory (okay, <i>maybe a little</i>). It's about justifying hours spent staring at spreadsheets as "research." Plus, if you squint, React components and Python scrapers almost feel like <i>real work</i>.</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'nowrap' }}>5</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee', verticalAlign: 'top', whiteSpace: 'normal', wordBreak: 'break-word' }}>Oh, and <strong>this is a leaderboard</strong>.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <a 
            href="https://www.janestreet.com/puzzles/"
            target="_blank"
            rel="noopener noreferrer"
            className="js-nav-link"
          >
            PUZZLES
          </a>
        </div>
        <div className="header-right">
          <div className="data-date">
            <span className="data-date-label">Data updated</span>
            <span className="data-date-value">{getLatestDataDate()}</span>
          </div>
          <span className="creator-text">
            Created by <a href="https://www.jaceyang.com/" target="_blank" rel="noopener noreferrer" className="author-link">Jace Yang</a>
          </span>
          <a 
            href="https://github.com/jaceyang97/jspuzzleLB"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
            title="View on GitHub"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="36" 
              height="36" 
              viewBox="0 0 24 24" 
              fill="#2c3e50"
              className="github-icon"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
      </header>
      
      <div className="dashboard-grid four-column">
        <div className="dashboard-item stats-charts-column">
          <div className="stats-cards">
            <div className="stats-card">
              <h3>Total Puzzles</h3>
              <div className="stat-value">{data.totalPuzzles}</div>
            </div>
            <div className="stats-card">
              <h3>Unique Solvers</h3>
              <div className="stat-value">{data.uniqueSolvers.toLocaleString('en-US')}</div>
            </div>
          </div>
          
          <SolverDistributionChart data={data.topSolvers || []} />
          
          <div className="charts-container">
            <Suspense fallback={<div className="chart-loading">Loading charts...</div>}>
              <Charts 
                solversGrowthData={solversGrowthData} 
                monthlyParticipationData={monthlyParticipationData}
                mostSolvedPuzzlesData={mostSolvedPuzzlesData}
              />
            </Suspense>
          </div>
        </div>
        
        <div className="dashboard-item top-solvers-column">
          <div className="section-header">
            <h2>🏆 Top Solvers</h2>
            <div className="search-container">
              <input
                type="text"
                placeholder="Search solvers..."
                value={topSolversSearch}
                onChange={(e) => setTopSolversSearch(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
          <TopSolversTable data={data.topSolvers || []} searchTerm={topSolversSearch} />
        </div>
        
        <div className="dashboard-item streaks-column">
          <h2>🔥 Longest Streaks</h2>
          <StreaksTable data={data.longestStreaks || []} />
        </div>
        
        <div className="dashboard-item rising-stars-column">
          <h2 
            style={{ position: 'relative', cursor: 'help' }}
            onMouseEnter={() => setShowRisingStarsTooltip(true)}
            onMouseLeave={() => setShowRisingStarsTooltip(false)}
          >
            💫 Rising Stars
            {showRisingStarsTooltip && (
              <div className="chart-title-tooltip">
                Rising Stars are solvers who started within the past year and have demonstrated exceptional puzzle-solving ability. They are ranked based on their solve rate (puzzles solved per month since their first appearance).
              </div>
            )}
          </h2>
          <RisingStarsTable data={data.risingStars || []} />
        </div>
      </div>
      <footer className="dashboard-footer">
        <div className="disclaimer">
          This site is not affiliated with, endorsed by, or sponsored by Jane Street. All puzzle data is compiled from publicly available information.
        </div>
      </footer>
    </div>
  );
};

export default Leaderboard; 