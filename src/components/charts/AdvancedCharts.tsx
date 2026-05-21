import React, { memo, useMemo, useState } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, BarChart, Bar, Legend,
} from 'recharts';
import { Puzzle } from '../../features/leaderboard/types';
import { MONTH_CODES } from '../../utils/leaderboardUtils';
import { useThemeColors } from '../../hooks/useThemeColors';

// Bin count for the percentile rank histogram. 10 bins of width 10 keeps the
// X-axis readable in the compact chart panel while still showing shape.
const PERCENTILE_BIN_COUNT = 10;
const PERCENTILE_BIN_WIDTH = 100 / PERCENTILE_BIN_COUNT;

// Year colors — cool→warm so recent years pop a bit.
const YEAR_COLORS = [
  '#94a3b8', '#64748b', '#475569',
  '#0ea5e9', '#06b6d4', '#10b981', '#22c55e',
  '#eab308', '#f97316', '#ef4444', '#a855f7', '#ec4899',
];
const colorForYear = (year: number, allYears: number[]): string => {
  const sorted = [...allYears].sort((a, b) => a - b);
  const idx = sorted.indexOf(year);
  if (idx < 0) return '#888';
  return YEAR_COLORS[idx % YEAR_COLORS.length];
};

// Build {month: 'Jan'..'Dec', "yyyy": uniqueSolverCount} rows from raw puzzles.
const buildYoYData = (puzzles: Puzzle[]) => {
  const buckets = new Map<string, Set<string>>();
  for (const p of puzzles) {
    const d = new Date(p.date_text);
    if (isNaN(d.getTime())) continue;
    const year = d.getFullYear();
    const month = d.getMonth();
    const key = `${year}-${month}`;
    if (!buckets.has(key)) buckets.set(key, new Set<string>());
    const set = buckets.get(key)!;
    (p.solvers || []).forEach((s) => set.add(s));
  }

  const yearsSet = new Set<number>();
  buckets.forEach((_v, k) => yearsSet.add(parseInt(k.split('-')[0], 10)));
  const years = Array.from(yearsSet).filter((y) => !isNaN(y)).sort((a, b) => a - b);

  const rows = MONTH_CODES.map((m, monthIdx) => {
    const row: Record<string, number | string> = { month: m };
    years.forEach((y) => {
      const set = buckets.get(`${y}-${monthIdx}`);
      if (set && set.size > 0) row[String(y)] = set.size;
    });
    return row;
  });

  return { rows, years };
};

interface YoYProps {
  puzzles: Puzzle[] | null;
  loading: boolean;
}

export const YoYChart = memo(({ puzzles, loading }: YoYProps) => {
  const colors = useThemeColors();
  const [showAllYears, setShowAllYears] = useState(false);

  const { rows, years } = useMemo(() => {
    if (!puzzles) return { rows: [], years: [] };
    return buildYoYData(puzzles);
  }, [puzzles]);

  const currentYear = new Date().getFullYear();
  const visibleYears = useMemo(() => {
    if (showAllYears) return years;
    return years.slice(-4);
  }, [years, showAllYears]);

  return (
    <div className="growth-chart-body">
      <div className="growth-chart-toolbar">
        <div className="chart-toggle">
          <button
            className={`chart-toggle-btn ${!showAllYears ? 'active' : ''}`}
            onClick={() => setShowAllYears(false)}
          >
            Recent
          </button>
          <button
            className={`chart-toggle-btn ${showAllYears ? 'active' : ''}`}
            onClick={() => setShowAllYears(true)}
          >
            All years
          </button>
        </div>
      </div>
      {loading && !puzzles ? (
        <div className="chart-loading">Loading year-over-year data…</div>
      ) : (
        <ResponsiveContainer width="100%" height="100%" minHeight={120}>
          <LineChart data={rows} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={colors.gridStroke} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: colors.textColor }}
              axisLine={{ stroke: colors.axisStroke }}
              tickLine={{ stroke: colors.axisStroke }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: colors.textColor }}
              width={35}
              axisLine={{ stroke: colors.axisStroke }}
              tickLine={{ stroke: colors.axisStroke }}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: colors.tooltipBg,
                border: `1px solid ${colors.tooltipBorder}`,
                fontSize: 11,
                borderRadius: 4,
              }}
              labelStyle={{ fontWeight: 600 }}
            />
            <Legend
              wrapperStyle={{ fontSize: 10, paddingTop: 2 }}
              iconType="line"
              iconSize={8}
            />
            {visibleYears.map((y) => (
              <Line
                key={y}
                type="monotone"
                dataKey={String(y)}
                stroke={colorForYear(y, years)}
                strokeWidth={y === currentYear ? 2.2 : 1.4}
                dot={false}
                activeDot={{ r: 3 }}
                connectNulls={false}
                isAnimationActive={false}
                name={String(y)}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
});

// Compute newcomers per month from cumulative solversGrowth deltas.
const buildFirstTimeData = (solversGrowth: { month: string; totalSolvers: number }[]) => {
  if (!solversGrowth.length) return [];
  const out: { month: string; newSolvers: number }[] = [];
  for (let i = 0; i < solversGrowth.length; i++) {
    const prev = i === 0 ? 0 : solversGrowth[i - 1].totalSolvers;
    const delta = Math.max(0, solversGrowth[i].totalSolvers - prev);
    out.push({ month: solversGrowth[i].month, newSolvers: delta });
  }
  const firstNonZero = out.findIndex((p) => p.newSolvers > 0);
  return firstNonZero === -1 ? out : out.slice(firstNonZero);
};

const formatXAxisYearTick = (value: string) => {
  const m = value.match(/\d{4}$/);
  return m ? m[0] : value;
};

interface FirstTimeProps {
  solversGrowth: { month: string; totalSolvers: number }[];
}

export const FirstTimeSolversChart = memo(({ solversGrowth }: FirstTimeProps) => {
  const colors = useThemeColors();

  const data = useMemo(() => buildFirstTimeData(solversGrowth), [solversGrowth]);

  const customTicks = useMemo(() => {
    const seen = new Set<string>();
    const ticks: string[] = [];
    for (const d of data) {
      const m = d.month.match(/^([A-Za-z]{3}) (\d{4})$/);
      if (!m) continue;
      const [, mon, year] = m;
      if (mon === 'Jan' && !seen.has(year)) {
        seen.add(year);
        ticks.push(d.month);
      }
    }
    return ticks;
  }, [data]);

  return (
    <div className="growth-chart-body">
      <ResponsiveContainer width="100%" height="100%" minHeight={120}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.gridStroke} />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: colors.textColor }}
            ticks={customTicks}
            tickFormatter={formatXAxisYearTick}
            axisLine={{ stroke: colors.axisStroke }}
            tickLine={{ stroke: colors.axisStroke }}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: colors.textColor }}
            width={35}
            axisLine={{ stroke: colors.axisStroke }}
            tickLine={{ stroke: colors.axisStroke }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.tooltipBg,
              border: `1px solid ${colors.tooltipBorder}`,
              fontSize: 11,
              borderRadius: 4,
            }}
            labelStyle={{ fontWeight: 600 }}
            formatter={(value: number) => [value.toLocaleString(), 'New solvers']}
          />
          <Bar dataKey="newSolvers" fill="#2E8B57" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

// Build a histogram of average percentile across solvers who have solved
// at least 2 puzzles (Enthusiasts + Masters). Per-puzzle percentile uses the
// same formula as the profile modal: 100 × (1 − (rank − 1) / (total − 1)).
// Puzzles with fewer than 2 solvers contribute no percentile signal.
const buildPercentileHistogram = (puzzles: Puzzle[]) => {
  const sumByName = new Map<string, number>();
  const countByName = new Map<string, number>();

  for (const p of puzzles) {
    const solvers = p.solvers;
    if (!solvers) continue;
    const total = solvers.length;
    if (total < 2) continue;
    for (let i = 0; i < total; i++) {
      const name = solvers[i];
      const percentile = 100 * (1 - i / (total - 1));
      sumByName.set(name, (sumByName.get(name) || 0) + percentile);
      countByName.set(name, (countByName.get(name) || 0) + 1);
    }
  }

  const bins = Array.from({ length: PERCENTILE_BIN_COUNT }, (_, i) => ({
    binStart: i * PERCENTILE_BIN_WIDTH,
    binLabel: `${i * PERCENTILE_BIN_WIDTH}–${(i + 1) * PERCENTILE_BIN_WIDTH}`,
    count: 0,
  }));

  let totalSolvers = 0;
  sumByName.forEach((sum, name) => {
    const count = countByName.get(name) || 0;
    if (count < 2) return;
    const avg = sum / count;
    let idx = Math.floor(avg / PERCENTILE_BIN_WIDTH);
    if (idx >= PERCENTILE_BIN_COUNT) idx = PERCENTILE_BIN_COUNT - 1;
    if (idx < 0) idx = 0;
    bins[idx].count += 1;
    totalSolvers += 1;
  });

  return { bins, totalSolvers };
};

interface PercentileRankProps {
  puzzles: Puzzle[] | null;
  loading: boolean;
}

export const PercentileRankChart = memo(({ puzzles, loading }: PercentileRankProps) => {
  const colors = useThemeColors();

  const { bins, totalSolvers } = useMemo(() => {
    if (!puzzles) return { bins: [], totalSolvers: 0 };
    return buildPercentileHistogram(puzzles);
  }, [puzzles]);

  if (loading && !puzzles) {
    return (
      <div className="growth-chart-body">
        <div className="chart-loading">Loading percentile distribution…</div>
      </div>
    );
  }

  return (
    <div className="growth-chart-body">
      <ResponsiveContainer width="100%" height="100%" minHeight={120}>
        <BarChart data={bins} margin={{ top: 5, right: 8, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.gridStroke} />
          <XAxis
            dataKey="binStart"
            tick={{ fontSize: 11, fill: colors.textColor }}
            axisLine={{ stroke: colors.axisStroke }}
            tickLine={{ stroke: colors.axisStroke }}
            tickFormatter={(v: number) => `${v}`}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: colors.textColor }}
            width={35}
            tickFormatter={(value) =>
              value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
            }
            axisLine={{ stroke: colors.axisStroke }}
            tickLine={{ stroke: colors.axisStroke }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.tooltipBg,
              border: `1px solid ${colors.tooltipBorder}`,
              fontSize: 11,
              borderRadius: 4,
            }}
            labelStyle={{ fontWeight: 600 }}
            formatter={(value: number) => {
              const pct = totalSolvers > 0 ? (value / totalSolvers) * 100 : 0;
              return [`${value.toLocaleString()} (${pct.toFixed(1)}%)`, 'Solvers'];
            }}
            labelFormatter={(_label, payload) => {
              const item = payload && payload[0]?.payload;
              return item ? `Avg percentile ${item.binLabel}` : '';
            }}
          />
          <Bar dataKey="count" fill="#2E8B57" isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
