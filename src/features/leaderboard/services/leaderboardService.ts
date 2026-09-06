import { calculateLeaderboardData, formatDate } from '../../../utils/leaderboardUtils';
import { LeaderboardData, Puzzle } from '../types';
import { calculateRisingStars, RISING_STARS_RULE } from '../../../utils/risingStars';

const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return (await response.json()) as T;
};

export const loadLeaderboardData = async (): Promise<LeaderboardData> => {
  // Try loading precomputed stats first (faster, smaller payload)
  try {
    // stats.json uses raw field names (solver, length, start, end) — map to our types
    const raw = await fetchJson<Record<string, any>>('/data/stats.json');
    const hasPublishedRisingStars = raw.risingStarsRule === RISING_STARS_RULE
      && Object.prototype.hasOwnProperty.call(raw, 'risingStarsAsOf')
      && (raw.risingStarsAsOf === null || typeof raw.risingStarsAsOf === 'string')
      && Array.isArray(raw.risingStars)
      && raw.risingStars.every((s: any) => s && typeof s.solver === 'string'
        && Number.isInteger(s.puzzlesSolved) && s.puzzlesSolved >= 2
        && Number.isInteger(s.opportunities) && s.opportunities >= Math.max(3, s.puzzlesSolved)
        && Number.isInteger(s.rank) && s.rank >= 1
        && Number.isFinite(s.solveRate) && s.solveRate >= 0 && s.solveRate <= 1);
    // A matching schema alone is not enough: an older policy can contain valid
    // rates but the wrong eligible names. Rebuild when the policy differs.
    const rising = hasPublishedRisingStars ? {
      risingStars: raw.risingStars.map((s: any) => ({
        name: s.solver,
        solveRate: s.solveRate,
        puzzlesSolved: s.puzzlesSolved,
        opportunities: s.opportunities,
        rank: s.rank,
        firstAppearance: formatDate(s.firstAppearance),
      })),
      risingStarsAsOf: raw.risingStarsAsOf === null ? null : formatDate(raw.risingStarsAsOf),
    } : calculateRisingStars(await fetchJson<Puzzle[]>('/data/data.json'));
    return {
      totalPuzzles: raw.totalPuzzles,
      uniqueSolvers: raw.uniqueSolvers,
      solverDistribution: raw.solverDistribution,
      generatedAt: raw.generatedAt,
      monthlyParticipation: raw.monthlyParticipation ?? [],
      solversGrowth: raw.solversGrowth ?? [],
      mostSolvedPuzzles: raw.mostSolvedPuzzles ?? [],
      topSolvers: (raw.topSolvers ?? []).map((s: any) => ({
        name: s.name,
        puzzlesSolved: s.puzzlesSolved,
        firstAppearance: formatDate(s.firstAppearance),
        lastSolve: formatDate(s.lastSolve),
        rankChange: s.rankChange,
      })),
      longestStreaks: (raw.longestStreaks ?? []).map((s: any) => ({
        name: s.solver,
        streakLength: s.length,
        startDate: formatDate(s.start),
        endDate: formatDate(s.end),
      })),
      ...rising,
      currentPuzzleProgress: raw.currentPuzzleProgress ?? undefined,
    };
  } catch {
    // Fallback: load raw puzzle data and calculate stats client-side
    const puzzles = await fetchJson<Puzzle[]>('/data/data.json');
    return calculateLeaderboardData(puzzles);
  }
};
