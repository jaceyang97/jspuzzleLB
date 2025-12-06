import { LeaderboardData, NormalizedLeaderboardData } from '../types';

const formatDate = (dateText: string): string => {
  if (!dateText) return 'N/A';

  if (/^[A-Za-z]{3} \d{4}$/.test(dateText)) return dateText;

  try {
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
  } catch (e) {
    console.error('Error formatting date:', dateText, e);
    return dateText;
  }
};

const normalizeLeaderboardData = (data: LeaderboardData): NormalizedLeaderboardData => {
  const normalized: NormalizedLeaderboardData = {
    totalPuzzles: data.totalPuzzles,
    uniqueSolvers: data.uniqueSolvers,
    monthlyParticipation: data.monthlyParticipation ?? [],
    solversGrowth: data.solversGrowth ?? [],
    mostSolvedPuzzles: data.mostSolvedPuzzles ?? [],
    topSolvers: [],
    longestStreaks: [],
    risingStars: [],
  };

  if (data.topSolvers) {
    normalized.topSolvers = data.topSolvers.map((solver) => ({
      name: solver.name || (solver as any).solver,
      puzzlesSolved: solver.puzzlesSolved || 0,
      firstAppearance: formatDate(solver.firstAppearance) || 'N/A',
      lastSolve: formatDate(solver.lastSolve) || 'N/A',
    }));
  }

  if (data.longestStreaks) {
    normalized.longestStreaks = data.longestStreaks.map((streak) => ({
      name: streak.solver || (streak as any).name,
      streakLength: streak.length || (streak as any).streakLength || 0,
      startDate: formatDate((streak as any).startDate || streak.start) || 'N/A',
      endDate: formatDate((streak as any).endDate || streak.end) || 'N/A',
    }));
  }

  if (data.risingStars) {
    normalized.risingStars = data.risingStars.map((solver) => ({
      name: solver.solver || (solver as any).name,
      solveRate: solver.solveRate || 0,
      puzzlesSolved: solver.puzzlesSolved || 0,
      firstAppearance: formatDate(solver.firstAppearance) || 'N/A',
    }));
  }

  return normalized;
};

export const loadLeaderboardData = async (): Promise<NormalizedLeaderboardData> => {
  try {
    const response = await fetch('/data/stats.json', { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`Failed to load stats.json: ${response.status}`);
    }
    const data = (await response.json()) as NormalizedLeaderboardData;
    return data;
  } catch (err) {
    console.error('Failed to load precomputed leaderboard data, falling back to client calculation', err);
    const { calculateLeaderboardData } = await import('../../../utils/leaderboardUtils');
    const computed = calculateLeaderboardData();
    return normalizeLeaderboardData(computed);
  }
};

