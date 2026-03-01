import { calculateLeaderboardData } from '../../../utils/leaderboardUtils';
import { LeaderboardData, NormalizedLeaderboardData, Puzzle } from '../types';

const MONTH_MAP = new Map([
  ['January', 'Jan'], ['February', 'Feb'], ['March', 'Mar'],
  ['April', 'Apr'], ['May', 'May'], ['June', 'Jun'],
  ['July', 'Jul'], ['August', 'Aug'], ['September', 'Sep'],
  ['October', 'Oct'], ['November', 'Nov'], ['December', 'Dec'],
]);

const formatDate = (dateText: string): string => {
  if (!dateText) return 'N/A';
  if (/^[A-Za-z]{3} \d{4}$/.test(dateText)) return dateText;

  const parts = dateText.split(' ');
  if (parts.length === 2 && MONTH_MAP.has(parts[0])) {
    return `${MONTH_MAP.get(parts[0])} ${parts[1]}`;
  }

  return dateText;
};

const normalizeLeaderboardData = (data: LeaderboardData): NormalizedLeaderboardData => {
  const normalized: NormalizedLeaderboardData = {
    totalPuzzles: data.totalPuzzles,
    uniqueSolvers: data.uniqueSolvers,
    solverDistribution: data.solverDistribution,
    monthlyParticipation: data.monthlyParticipation ?? [],
    solversGrowth: data.solversGrowth ?? [],
    mostSolvedPuzzles: data.mostSolvedPuzzles ?? [],
    generatedAt: data.generatedAt,
    topSolvers: [],
    longestStreaks: [],
    risingStars: [],
  };

  if (data.topSolvers) {
    normalized.topSolvers = data.topSolvers.map((solver) => ({
      name: solver.name,
      puzzlesSolved: solver.puzzlesSolved,
      firstAppearance: formatDate(solver.firstAppearance),
      lastSolve: formatDate(solver.lastSolve),
    }));
  }

  if (data.longestStreaks) {
    normalized.longestStreaks = data.longestStreaks.map((streak) => ({
      name: streak.solver,
      streakLength: streak.length,
      startDate: formatDate(streak.start),
      endDate: formatDate(streak.end),
    }));
  }

  if (data.risingStars) {
    normalized.risingStars = data.risingStars.map((star) => ({
      name: star.solver,
      solveRate: star.solveRate,
      puzzlesSolved: star.puzzlesSolved,
      firstAppearance: formatDate(star.firstAppearance),
    }));
  }

  return normalized;
};

const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return (await response.json()) as T;
};

export const loadLeaderboardData = async (): Promise<NormalizedLeaderboardData> => {
  // Try loading precomputed stats first (faster, smaller payload)
  try {
    const data = await fetchJson<LeaderboardData>('/data/stats.json');
    return normalizeLeaderboardData(data);
  } catch {
    // Fallback: load raw puzzle data and calculate stats client-side
    const puzzles = await fetchJson<Puzzle[]>('/data/data.json');
    return normalizeLeaderboardData(calculateLeaderboardData(puzzles));
  }
};

