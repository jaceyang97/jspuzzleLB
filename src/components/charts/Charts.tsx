import React, { memo, useState, useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { MONTH_CODES } from '../../utils/leaderboardUtils';
import { Puzzle } from '../../features/leaderboard/types';
import { useThemeColors } from '../../hooks/useThemeColors';
import InfoTooltip from '../InfoTooltip';
import ChartTooltipContent from './ChartTooltipContent';
import HelpTooltip from '../Tooltip';
import { MonthlyParticipationChart, FirstTimeSolversChart, PercentileRankChart, ChartSummary, chartMonthIndex, latestMonthLabel } from './AdvancedCharts';
import { trackEvent } from '../../utils/analytics';
import './trend-panel.css';

interface SolversGrowthDataPoint { month: string; totalSolvers: number; }
interface PuzzleData { id: string; name: string; solvers: number; solution_url: string; }
interface ChartsProps {
  solversGrowthData: SolversGrowthDataPoint[];
  mostSolvedPuzzlesData?: PuzzleData[];
  rawPuzzles?: Puzzle[] | null;
  puzzlesLoading?: boolean;
}

const SolversGrowthBody = memo(({ data }: { data: SolversGrowthDataPoint[] }) => {
  const colors = useThemeColors();
  const recorded = useMemo(() => data.filter((row) => chartMonthIndex(row.month) >= 2015 * 12 + 10)
    .sort((a, b) => chartMonthIndex(a.month) - chartMonthIndex(b.month)), [data]);
  const latest = recorded[recorded.length - 1];
  if (!latest) return <div className="chart-loading">Solver history is unavailable.</div>;
  return (
    <div className="growth-chart-body">
      <ChartSummary value={latest.totalSolvers} label="unique solvers" context={`Recorded through ${latest.month}`} />
      <div className="chart-canvas">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <AreaChart data={recorded} accessibilityLayer margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={colors.gridStroke} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: colors.textColor }} height={22}
              tickFormatter={(value: string) => value.slice(-4)}
              ticks={recorded.filter((row) => row.month.startsWith('Jan')).map((row) => row.month)}
              interval="preserveStartEnd" minTickGap={20} axisLine={false} tickLine={false} />
            <YAxis width={34} tickCount={3} tick={{ fontSize: 10, fill: colors.textColor }}
              tickFormatter={(value: number) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`}
              axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltipContent />} isAnimationActive={false} wrapperStyle={{ visibility: 'hidden', pointerEvents: 'none' }}
              contentStyle={{ backgroundColor: colors.tooltipBg, color: colors.textColor,
              border: `1px solid ${colors.tooltipBorder}`, fontSize: 12, borderRadius: 6 }}
              labelFormatter={(label) => latestMonthLabel(String(label))}
              formatter={(value: number) => [value.toLocaleString(), 'Unique solvers']} />
            <Area type="monotone" dataKey="totalSolvers" stroke="#2E8B57" fill="#2E8B57"
              fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} activeDot={{ r: 3 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="trend-caption"><span>At least one solve · {recorded[0].month} – {latest.month}</span></div>
    </div>
  );
});

type GrowthTab = 'monthly' | 'growth' | 'first-time' | 'percentiles';
interface GrowthChartTabsProps {
  solversGrowthData: SolversGrowthDataPoint[];
  rawPuzzles?: Puzzle[] | null;
  puzzlesLoading?: boolean;
}
const VIEWS: Array<{ id: GrowthTab; label: string; tooltip: string }> = [
  { id: 'growth', label: 'Total solvers', tooltip: 'Cumulative unique solvers with at least one recorded solve. Only recorded data is shown; public solver lists begin in November 2015.' },
  { id: 'monthly', label: 'Monthly activity', tooltip: 'Unique solvers in each calendar month. Each name is counted once even when a month has multiple puzzles. The current month is still in progress.' },
  { id: 'first-time', label: 'New solvers', tooltip: 'Solvers making their first recorded appearance in each month, calculated from changes in the cumulative unique-solver count.' },
  { id: 'percentiles', label: 'Rank distribution', tooltip: 'Average finish percentile for solvers with at least two puzzles. Higher percentiles mean earlier positions in the published solver lists.' },
];

export const GrowthChartTabs: React.FC<GrowthChartTabsProps> = ({ solversGrowthData, rawPuzzles, puzzlesLoading }) => {
  const [tab, setTab] = useState<GrowthTab>('growth');
  const activeView = VIEWS.find((view) => view.id === tab)!;
  return (
    <div className="chart-container mini growth-chart-tabs" data-view={tab}>
      <div className="trend-header">
        <div className="trend-title">
          <h3>Trends</h3>
          <InfoTooltip content={activeView.tooltip} label={`About ${activeView.label.toLowerCase()}`} />
        </div>
        <select className="trend-view-select" aria-label="Trend view" value={tab}
          onChange={(event) => { const next = event.target.value as GrowthTab; setTab(next); trackEvent('chart_tab_change', { tab: next }); }}>
          {VIEWS.map((view) => <option key={view.id} value={view.id}>{view.label}</option>)}
        </select>
      </div>
      <div className="growth-tab-panel">
        {tab === 'monthly' && <MonthlyParticipationChart puzzles={rawPuzzles ?? null} loading={!!puzzlesLoading} />}
        {tab === 'growth' && <SolversGrowthBody data={solversGrowthData} />}
        {tab === 'first-time' && <FirstTimeSolversChart solversGrowth={solversGrowthData} />}
        {tab === 'percentiles' && <PercentileRankChart puzzles={rawPuzzles ?? null} loading={!!puzzlesLoading} />}
      </div>
    </div>
  );
};

export const MostSolvedPuzzlesTable = memo(({ data }: { data: PuzzleData[] }) => {
  const colors = useThemeColors();
  // Empty published lists are encoded as 0 upstream; their counts are unknown.
  const puzzles = useMemo(() => [...data].sort((a, b) => {
    const aPublished = a.solvers > 0;
    const bPublished = b.solvers > 0;
    if (aPublished !== bPublished) return aPublished ? -1 : 1;
    return aPublished ? b.solvers - a.solvers : 0;
  }), [data]);
  const puzzleUrl = (url: string) => url ? url.replace('-solution', '-index') : 'https://www.janestreet.com/puzzles/current-puzzle/';
  const formatPuzzleDate = (id: string) => {
    const [year, monthText] = id.split('-');
    const month = Number(monthText);
    return month >= 1 && month <= 12 ? `${MONTH_CODES[month - 1]} ${year}` : 'N/A';
  };
  return (
    <div className="chart-container mini most-solved-panel">
      <div className="puzzle-panel-header">
        <h3>Most solved puzzles</h3>
        <InfoTooltip label="About most solved puzzles" content="All available puzzles, ordered by published solver count. N/A means the solver list has not been published. Participation affects these counts as well as puzzle difficulty." />
      </div>
      <div className="puzzle-table-container">
        <table className="puzzle-table" aria-label="Puzzles ranked by number of solvers">
          <thead><tr>
            <th scope="col" style={{ width: 'calc(100% - 160px)' }}>Puzzle</th>
            <th scope="col" style={{ width: '80px' }}>Date</th>
            <th scope="col" style={{ width: '80px' }}>Solvers</th>
          </tr></thead>
          <tbody>
            {puzzles.map((puzzle, index) => (
              <tr key={puzzle.id || `puzzle-${index}`}>
                <td style={{ borderBottomColor: colors.gridStroke }}>
                  <a href={puzzleUrl(puzzle.solution_url)} target="_blank" rel="noopener noreferrer"
                    className="puzzle-link-table" title={puzzle.name}>{puzzle.name}</a>
                </td>
                <td style={{ borderBottomColor: colors.gridStroke }}>{formatPuzzleDate(puzzle.id)}</td>
                <td style={{ borderBottomColor: colors.gridStroke }}>
                  {puzzle.solvers > 0 ? puzzle.solvers.toLocaleString() : (
                    <HelpTooltip content="Solver list not published" rich tabIndex={0}
                      aria-label="N/A: Solver list not published">
                      N/A
                    </HelpTooltip>
                  )}
                </td>
              </tr>
            ))}
            {!puzzles.length && <tr><td colSpan={3}>No puzzle data available</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
});

const Charts: React.FC<ChartsProps> = ({ solversGrowthData, mostSolvedPuzzlesData = [], rawPuzzles, puzzlesLoading }) => (
  <div className="charts-dashboard">
    <GrowthChartTabs solversGrowthData={solversGrowthData} rawPuzzles={rawPuzzles} puzzlesLoading={puzzlesLoading} />
    <MostSolvedPuzzlesTable data={mostSolvedPuzzlesData} />
  </div>
);
export default Charts;
