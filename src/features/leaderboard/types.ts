export interface Puzzle {
  date_text: string;
  name: string;
  solution_url: string;
  solvers: string[];
}

export interface SolverStats {
  name: string;
  puzzlesSolved: number;
  firstAppearance: string;
  lastSolve: string;
  monthlyActivity: Record<string, boolean>;
  streaks: { length: number; start: string; end: string }[];
}

export interface LeaderboardData {
  totalPuzzles: number;
  uniqueSolvers: number;
  topSolvers: SolverStats[];
  longestStreaks: { solver: string; length: number; start: string; end: string }[];
  risingStars: { solver: string; puzzlesSolved: number; solveRate: number; firstAppearance: string }[];
  monthlyParticipation: { month: string; solvers: number }[];
  solversGrowth: { month: string; totalSolvers: number }[];
  mostSolvedPuzzles: { id: string; name: string; solvers: number; solution_url: string }[];
  generatedAt?: string;
}

export interface NormalizedLeaderboardData {
  totalPuzzles: number;
  uniqueSolvers: number;
  topSolvers: Array<{
    name: string;
    puzzlesSolved: number;
    firstAppearance: string;
    lastSolve: string;
  }>;
  longestStreaks: Array<{
    name: string;
    streakLength: number;
    startDate: string;
    endDate: string;
  }>;
  risingStars: Array<{
    name: string;
    solveRate: number;
    puzzlesSolved: number;
    firstAppearance: string;
  }>;
  monthlyParticipation: { month: string; solvers: number }[];
  solversGrowth: { month: string; totalSolvers: number }[];
  mostSolvedPuzzles: { id: string; name: string; solvers: number; solution_url: string }[];
  generatedAt?: string;
}

