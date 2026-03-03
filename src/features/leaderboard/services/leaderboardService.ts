import { calculateLeaderboardData, formatDate } from '../../../utils/leaderboardUtils';
import { LeaderboardData, Puzzle } from '../types';

const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path, { cache: 'no-cache' });
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
      })),
      longestStreaks: (raw.longestStreaks ?? []).map((s: any) => ({
        name: s.solver,
        streakLength: s.length,
        startDate: formatDate(s.start),
        endDate: formatDate(s.end),
      })),
      risingStars: (raw.risingStars ?? []).map((s: any) => ({
        name: s.solver,
        solveRate: s.solveRate,
        puzzlesSolved: s.puzzlesSolved,
        firstAppearance: formatDate(s.firstAppearance),
      })),
      currentPuzzleProgress: raw.currentPuzzleProgress ?? undefined,
    };
  } catch {
    // Fallback: load raw puzzle data and calculate stats client-side
    const puzzles = await fetchJson<Puzzle[]>('/data/data.json');
    return calculateLeaderboardData(puzzles);
  }
};
