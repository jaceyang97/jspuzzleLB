import { calculateLeaderboardData } from '../../../utils/leaderboardUtils';
import { LeaderboardData, NormalizedLeaderboardData, Puzzle } from '../types';

const formatDate = (dateText: string): string => {
  if (!dateText) return 'N/A';

  if (/^[A-Za-z]{3} \d{4}$/.test(dateText)) return dateText;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthCodes = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const monthMap = new Map(monthNames.map((name, i) => [name, monthCodes[i]]));

  const parts = dateText.split(' ');
  if (parts.length === 2 && monthMap.has(parts[0])) {
    return `${monthMap.get(parts[0])} ${parts[1]}`;
  }

  return dateText;
};

const normalizeLeaderboardData = (data: LeaderboardData): NormalizedLeaderboardData => {
  const normalized: NormalizedLeaderboardData = {
    totalPuzzles: data.totalPuzzles,
    uniqueSolvers: data.uniqueSolvers,
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
      firstAppearance: formatDate(solver.firstAppearance) || 'N/A',
      lastSolve: formatDate(solver.lastSolve) || 'N/A',
    }));
  }

  if (data.longestStreaks) {
    normalized.longestStreaks = data.longestStreaks.map((streak) => ({
      name: streak.solver,
      streakLength: streak.length,
      startDate: formatDate(streak.start) || 'N/A',
      endDate: formatDate(streak.end) || 'N/A',
    }));
  }

  if (data.risingStars) {
    normalized.risingStars = data.risingStars.map((star) => ({
      name: star.solver,
      solveRate: star.solveRate,
      puzzlesSolved: star.puzzlesSolved,
      firstAppearance: formatDate(star.firstAppearance) || 'N/A',
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

