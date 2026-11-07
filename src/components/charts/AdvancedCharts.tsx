import React, { memo, useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import ChartTooltipContent from './ChartTooltipContent';
import { Puzzle } from '../../features/leaderboard/types';
import { MONTH_CODES } from '../../utils/leaderboardUtils';
import { useThemeColors } from '../../hooks/useThemeColors';

const ACCENT = 'var(--accent-primary)';
export const chartMonthIndex = (month: string): number => {
  const date = new Date(month);
  return Number.isNaN(date.getTime()) ? NaN : date.getFullYear() * 12 + date.getMonth();
};
export const latestMonthLabel = (month: string): string => {
  const now = new Date();
  return `${month}${chartMonthIndex(month) === now.getFullYear() * 12 + now.getMonth() ? ' · in progress' : ''}`;
};
const compactNumber = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : `${value}`;
const shortMonth = (value: string) => value.replace(/ (\d{2})(\d{2})$/, " '$2");

export const ChartSummary = ({ value, label, context }: { value: number; label: string; context: string }) => (
  <div className="trend-summary">
    <div className="trend-summary-value"><strong>{value.toLocaleString()}</strong><span>{label}</span></div>
    <span className="trend-summary-context">{context}</span>
  </div>
);

// Precomputed participation is sampled. Raw lists preserve every recorded month
// and count each name once even when a month contains multiple puzzles.
export const buildMonthlyParticipation = (puzzles: Puzzle[]) => {
  const months = new Map<number, { solvers: Set<string>; publishedLists: number; totalLists: number }>();
  for (const puzzle of puzzles) {
    const index = chartMonthIndex(puzzle.date_text);
    if (!Number.isFinite(index) || index < 2015 * 12 + 10) continue;
    const month = months.get(index) ?? { solvers: new Set<string>(), publishedLists: 0, totalLists: 0 };
    month.totalLists += 1;
    if (puzzle.solvers.length) month.publishedLists += 1;
    puzzle.solvers.forEach((name) => month.solvers.add(name));
    months.set(index, month);
  }
  if (!months.size) return [];
  const seen = new Set<string>();
  const first = Math.min(...Array.from(months.keys()));
  const last = Math.max(...Array.from(months.keys()));
  return Array.from({ length: last - first + 1 }, (_, offset) => {
    const index = first + offset;
    const month = months.get(index);
    const published = !!month?.publishedLists;
    const solvers = month?.solvers ?? new Set<string>();
    let newSolvers = 0;
    solvers.forEach((name) => {
      if (!seen.has(name)) newSolvers += 1;
      seen.add(name);
    });
    return {
      month: `${MONTH_CODES[index % 12]} ${Math.floor(index / 12)}`,
      monthIndex: index,
      solvers: published ? solvers.size : null,
      newSolvers: published ? newSolvers : null,
      returningSolvers: published ? solvers.size - newSolvers : null,
      publishedLists: month?.publishedLists ?? 0,
      totalLists: month?.totalLists ?? 0,
    };
  });
};
interface PuzzleChartProps { puzzles: Puzzle[] | null; loading: boolean; }

export const MonthlyParticipationChart = memo(({ puzzles, loading }: PuzzleChartProps) => {
  const colors = useThemeColors();
  const data = useMemo(() => puzzles ? buildMonthlyParticipation(puzzles) : [], [puzzles]);
  const now = new Date();
  const currentMonth = now.getFullYear() * 12 + now.getMonth();
  const latest = [...data].reverse().find((row) => row.monthIndex < currentMonth);
  const visible = useMemo(() => latest ? data.filter((row) => row.monthIndex >= latest.monthIndex - 11 && row.monthIndex <= latest.monthIndex) : [], [data, latest]);
  if (loading && !puzzles) return <div className="chart-loading" role="status">Loading new and returning solvers…</div>;
  if (!latest) return <div className="chart-loading">New and returning solver history is unavailable.</div>;
  return (
    <div className="growth-chart-body new-returning-chart">
      <div className="trend-composition-summary">
        <dl className="trend-composition-key">
          <div><dt><i aria-hidden="true" style={{ backgroundColor: colors.textColor }} />Returning</dt><dd>{latest.returningSolvers?.toLocaleString() ?? 'N/A'}</dd></div>
          <div><dt><i aria-hidden="true" style={{ backgroundColor: ACCENT }} />New</dt><dd>{latest.newSolvers?.toLocaleString() ?? 'N/A'}</dd></div>
        </dl>
      </div>
      <div className="chart-canvas">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart accessibilityLayer data={visible} maxBarSize={20} barCategoryGap="24%" margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={colors.gridStroke} strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: colors.textColor }} height={24}
              tickFormatter={shortMonth} interval="preserveStartEnd" minTickGap={30} axisLine={false} tickLine={false} />
            <YAxis width={34} tickCount={3} tickFormatter={compactNumber} allowDecimals={false}
              tick={{ fontSize: 12, fill: colors.textColor }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltipContent />} isAnimationActive={false} wrapperStyle={{ visibility: 'hidden', pointerEvents: 'none' }} contentStyle={{ backgroundColor: colors.tooltipBg, color: colors.textColor,
              border: `1px solid ${colors.tooltipBorder}`, fontSize: 12, borderRadius: 6 }}
              cursor={{ fill: colors.gridStroke, fillOpacity: 0.5 }}
              labelFormatter={(label) => latestMonthLabel(String(label))}
              formatter={(value: number, name) => [value.toLocaleString(), name]} />
            <Bar name="Returning" dataKey="returningSolvers" stackId="solvers" fill={colors.textColor} isAnimationActive={false} />
            <Bar name="New" dataKey="newSolvers" stackId="solvers" fill={ACCENT} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export const buildFirstTimeData = (growth: { month: string; totalSolvers: number }[]) => {
  const sorted = [...growth].filter((row) => Number.isFinite(chartMonthIndex(row.month)))
    .sort((a, b) => chartMonthIndex(a.month) - chartMonthIndex(b.month));
  return sorted.map((row, index) => ({ month: row.month,
    newSolvers: Math.max(0, row.totalSolvers - (index ? sorted[index - 1].totalSolvers : 0)) }));
};
export const FirstTimeSolversChart = memo(({ solversGrowth }: { solversGrowth: { month: string; totalSolvers: number }[] }) => {
  const colors = useThemeColors();
  const data = useMemo(() => buildFirstTimeData(solversGrowth), [solversGrowth]);
  const latest = data[data.length - 1];
  const visible = latest ? data.filter((row) => chartMonthIndex(row.month) >= chartMonthIndex(latest.month) - 23) : [];
  if (!latest) return <div className="chart-loading">New solver history is unavailable.</div>;
  return (
    <div className="growth-chart-body">
      <ChartSummary value={latest.newSolvers} label="first-time solvers" context={latestMonthLabel(latest.month)} />
      <div className="chart-canvas">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart accessibilityLayer data={visible} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={colors.gridStroke} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: colors.textColor }} height={22}
              tickFormatter={shortMonth} interval="preserveStartEnd" minTickGap={30} axisLine={false} tickLine={false} />
            <YAxis width={34} tickCount={3} tickFormatter={compactNumber} allowDecimals={false}
              tick={{ fontSize: 10, fill: colors.textColor }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltipContent />} isAnimationActive={false} wrapperStyle={{ visibility: 'hidden', pointerEvents: 'none' }} contentStyle={{ backgroundColor: colors.tooltipBg, color: colors.textColor,
              border: `1px solid ${colors.tooltipBorder}`, fontSize: 12, borderRadius: 6 }}
              labelFormatter={(label) => latestMonthLabel(String(label))}
              formatter={(value: number) => [value.toLocaleString(), 'First-time solvers']} />
            <Bar dataKey="newSolvers" fill={ACCENT} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="trend-caption"><span>First recorded solves · last 24 months</span></div>
    </div>
  );
});

// Preserve the existing mean-finish percentile calculation for repeat solvers.
export const buildPercentileHistogram = (puzzles: Puzzle[]) => {
  const sums = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const puzzle of puzzles) {
    const solvers = puzzle.solvers;
    if (solvers.length < 2) continue;
    const seen = new Set<string>();
    solvers.forEach((name, index) => {
      // A repeated name is still one solved puzzle. Keep the first published
      // position and original list size, matching the solver profile metric.
      if (seen.has(name)) return;
      seen.add(name);
      sums.set(name, (sums.get(name) ?? 0) + 100 * (1 - index / (solvers.length - 1)));
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });
  }
  const bins = Array.from({ length: 10 }, (_, index) => ({
    binStart: index * 10, binLabel: `${index * 10}–${(index + 1) * 10}`, count: 0,
  }));
  let totalSolvers = 0;
  sums.forEach((sum, name) => {
    const count = counts.get(name) ?? 0;
    if (count < 2) return;
    bins[Math.min(9, Math.max(0, Math.floor(sum / count / 10)))].count += 1;
    totalSolvers += 1;
  });
  return { bins, totalSolvers };
};
export const PercentileRankChart = memo(({ puzzles, loading }: PuzzleChartProps) => {
  const colors = useThemeColors();
  const { bins, totalSolvers } = useMemo(() => puzzles ? buildPercentileHistogram(puzzles) : { bins: [], totalSolvers: 0 }, [puzzles]);
  if (loading && !puzzles) return <div className="chart-loading">Loading rank distribution…</div>;
  if (!puzzles) return <div className="chart-loading">Rank distribution is unavailable.</div>;
  return (
    <div className="growth-chart-body">
      <ChartSummary value={totalSolvers} label="repeat solvers" context="At least 2 recorded puzzles" />
      <div className="chart-canvas">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart accessibilityLayer data={bins} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={colors.gridStroke} />
            <XAxis dataKey="binStart" tick={{ fontSize: 10, fill: colors.textColor }} height={22}
              axisLine={false} tickLine={false} interval={1} />
            <YAxis width={34} tickCount={3} tickFormatter={compactNumber} allowDecimals={false}
              tick={{ fontSize: 10, fill: colors.textColor }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltipContent />} isAnimationActive={false} wrapperStyle={{ visibility: 'hidden', pointerEvents: 'none' }} contentStyle={{ backgroundColor: colors.tooltipBg, color: colors.textColor,
              border: `1px solid ${colors.tooltipBorder}`, fontSize: 12, borderRadius: 6 }}
              formatter={(value: number) => [`${value.toLocaleString()} (${totalSolvers ? (value / totalSolvers * 100).toFixed(1) : 0}%)`, 'Solvers']}
              labelFormatter={(_label, payload) => payload?.[0]?.payload ? `Average percentile ${payload[0].payload.binLabel}` : ''} />
            <Bar dataKey="count" fill={ACCENT} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="trend-caption"><span>Average finish percentile · higher is faster</span></div>
    </div>
  );
});
