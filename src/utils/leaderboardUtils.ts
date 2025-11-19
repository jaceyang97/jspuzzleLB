import { format, parse, compareAsc, differenceInMonths, addMonths } from 'date-fns';
import puzzleData from '../data/data.json';

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
  solvedPuzzles: Puzzle[];
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
  mostSolvedPuzzles: { id: string; name: string; solvers: number }[];
}

// Cache for memoization
let cachedLeaderboardData: LeaderboardData | null = null;
let dateCache: Map<string, Date> = new Map(); // Cache for parsed dates
let monthFormatCache: Map<string, string> = new Map(); // Cache for formatted months

// Parse date from format like "March 2025" with caching
const parseDate = (dateText: string) => {
  if (dateCache.has(dateText)) {
    return dateCache.get(dateText)!;
  }
  
  try {
    const date = parse(dateText, 'MMMM yyyy', new Date());
    dateCache.set(dateText, date);
    return date;
  } catch (e) {
    console.error(`Error parsing date: ${dateText}`, e);
    const fallbackDate = new Date();
    dateCache.set(dateText, fallbackDate);
    return fallbackDate;
  }
};

// Format date to "MMM yyyy" with caching
const formatMonthYear = (date: Date) => {
  const key = date.toISOString();
  if (monthFormatCache.has(key)) {
    return monthFormatCache.get(key)!;
  }
  
  const formatted = format(date, 'MMM yyyy');
  monthFormatCache.set(key, formatted);
  return formatted;
};

// Split a solver string into individual solver names.
// Handles forms like "Alice & Bob", "Alice & Bob, Carol", "Alice and Bob" and HTML entities.
const splitSolverNames = (solverRaw: string): string[] => {
  if (!solverRaw || typeof solverRaw !== 'string') return [];

  // Normalize HTML entity for ampersand and trim
  const normalized = solverRaw.replace(/&amp;/gi, '&').trim();

  // Split on common delimiters: '&', ' and ', ',', '/'
  const parts = normalized
    .split(/\s*(?:&|and|,|\/)\s*/i)
    .map(p => p.trim())
    .filter(Boolean);

  return parts;
};

// Pre-process data in chunks to avoid blocking the UI
export const preProcessData = (callback: () => void) => {
  if (cachedLeaderboardData) {
    callback();
    return;
  }
  
  setTimeout(() => {
    calculateLeaderboardData();
    callback();
  }, 0);
};

// Calculate all solver statistics
export const calculateLeaderboardData = (): LeaderboardData => {
  // Return cached data if available
  if (cachedLeaderboardData) {
    return cachedLeaderboardData;
  }

  console.time('calculateLeaderboardData');
  
  const puzzles = puzzleData as Puzzle[];
  const solverMap = new Map<string, SolverStats>();
  const allMonths = new Set<string>();
  
  // Sort puzzles by date (newest first) - only once
  const sortedPuzzles = [...puzzles].sort((a, b) => {
    const dateA = parseDate(a.date_text);
    const dateB = parseDate(b.date_text);
    return compareAsc(dateB, dateA);
  });
  
  // Process each puzzle
  sortedPuzzles.forEach(puzzle => {
    const puzzleDate = parseDate(puzzle.date_text);
    const monthKey = formatMonthYear(puzzleDate);
    allMonths.add(monthKey);
    
    // Skip empty solver arrays to improve performance
    if (!puzzle.solvers || puzzle.solvers.length === 0) return;
    
    // A single solver entry in the data may contain multiple people (e.g. "A & B").
    // Split those combined entries into individual solver names and credit each person.
    puzzle.solvers.forEach(solverRaw => {
      const solverNames = splitSolverNames(solverRaw);

      solverNames.forEach(solverName => {
        if (!solverMap.has(solverName)) {
          solverMap.set(solverName, {
            name: solverName,
            puzzlesSolved: 0,
            firstAppearance: puzzle.date_text,
            lastSolve: puzzle.date_text,
            solvedPuzzles: [],
            monthlyActivity: {},
            streaks: []
          });
        }

        const solver = solverMap.get(solverName)!;
        solver.puzzlesSolved += 1;

        // Mark activity for the month
        solver.monthlyActivity[monthKey] = true;

        // Update first appearance if this puzzle is older
        if (compareAsc(parseDate(puzzle.date_text), parseDate(solver.firstAppearance)) < 0) {
          solver.firstAppearance = puzzle.date_text;
        }

        // Update last solve if this puzzle is newer
        if (compareAsc(parseDate(puzzle.date_text), parseDate(solver.lastSolve)) > 0) {
          solver.lastSolve = puzzle.date_text;
        }
      });
    });
  });
  
  // Calculate streaks only for top solvers to improve performance
  const topSolversByCount = Array.from(solverMap.values())
    .sort((a, b) => b.puzzlesSolved - a.puzzlesSolved);
  
  // Calculate streaks for each top solver
  topSolversByCount.forEach(solver => {
    const months = Object.keys(solver.monthlyActivity).sort((a, b) => 
      compareAsc(parse(a, 'MMM yyyy', new Date()), parse(b, 'MMM yyyy', new Date()))
    );
    
    if (months.length === 0) return;
    
    let currentStreak = { 
      start: months[0], 
      end: months[0], 
      length: 1 
    };
    
    for (let i = 1; i < months.length; i++) {
      const prevDate = parse(months[i-1], 'MMM yyyy', new Date());
      const currDate = parse(months[i], 'MMM yyyy', new Date());
      
      // Check if months are consecutive
      if (differenceInMonths(currDate, prevDate) === 1) {
        currentStreak.end = months[i];
        currentStreak.length += 1;
      } else {
        // Save the completed streak if it's at least 2 months
        if (currentStreak.length >= 2) {
          solver.streaks.push({ ...currentStreak });
        }
        // Start a new streak
        currentStreak = { 
          start: months[i], 
          end: months[i], 
          length: 1 
        };
      }
    }
    
    // Add the last streak if it's at least 2 months
    if (currentStreak.length >= 2) {
      solver.streaks.push({ ...currentStreak });
    }
    
    // Sort streaks by length (longest first)
    solver.streaks.sort((a, b) => b.length - a.length);
  });
  
  // Get all solvers by puzzles solved
  const topSolvers = topSolversByCount;
  
  // Get solvers with longest streaks
  const longestStreaks = topSolversByCount
    .filter(solver => solver.streaks.length > 0)
    .map(solver => ({
      solver: solver.name,
      ...solver.streaks[0]
    }))
    .sort((a, b) => b.length - a.length)
    .slice(0, 20);
  
  // Calculate rising stars (started in the last year with high solve rate)
  const currentDate = new Date();
  const oneYearAgo = addMonths(currentDate, -12);
  
  const risingStars = Array.from(solverMap.values())
    .filter(solver => {
      const firstDate = parseDate(solver.firstAppearance);
      return compareAsc(firstDate, oneYearAgo) >= 0 && solver.puzzlesSolved >= 3;
    })
    .map(solver => {
      const firstDate = parseDate(solver.firstAppearance);
      const monthsSinceStart = Math.max(1, differenceInMonths(currentDate, firstDate));
      return {
        solver: solver.name,
        puzzlesSolved: solver.puzzlesSolved,
        solveRate: solver.puzzlesSolved / monthsSinceStart,
        firstAppearance: solver.firstAppearance
      };
    })
    .sort((a, b) => b.solveRate - a.solveRate)
    .slice(0, 20);
  
  // Calculate monthly participation - sample every other month for better performance
  const sortedMonths = Array.from(allMonths).sort((a, b) => 
    compareAsc(parse(a, 'MMM yyyy', new Date()), parse(b, 'MMM yyyy', new Date()))
  );
  
  // Sample months to reduce data points for monthly participation
  const sampledMonths = sortedMonths.length > 48 
    ? sortedMonths.filter((_, index) => index % 3 === 0 || index === sortedMonths.length - 1)
    : sortedMonths;
  
  const monthlyParticipation = sampledMonths.map(month => {
    const solversCount = Array.from(solverMap.values())
      .filter(solver => solver.monthlyActivity[month])
      .length;
    
    return {
      month,
      solvers: solversCount
    };
  });
  
  // Calculate solvers growth over time - include every month for complete visualization
  const solversGrowth: { month: string; totalSolvers: number }[] = [];
  let totalSolvers = 0;
  
  // Use all months for solvers growth to show every data point
  sortedMonths.forEach(month => {
    const newSolvers = Array.from(solverMap.values())
      .filter(solver => {
        const firstMonth = formatMonthYear(parseDate(solver.firstAppearance));
        return firstMonth === month;
      })
      .length;
    
    totalSolvers += newSolvers;
    
    solversGrowth.push({
      month,
      totalSolvers
    });
  });
  
  // Ensure the last data point shows the total number of unique solvers
  if (solversGrowth.length > 0) {
    const lastPoint = solversGrowth[solversGrowth.length - 1];
    if (lastPoint.totalSolvers !== solverMap.size) {
      lastPoint.totalSolvers = solverMap.size;
    }
  }
  
  // Calculate most solved puzzles
  const mostSolvedPuzzles = sortedPuzzles
    .map(puzzle => {
      // Extract year and month from date_text (e.g., "January 2023")
      const date = parseDate(puzzle.date_text);
      const year = date.getFullYear();
      const month = date.getMonth() + 1; // JavaScript months are 0-indexed
      
      return {
        id: `${year}-${month}`,
        name: puzzle.name,
        solvers: puzzle.solvers ? puzzle.solvers.length : 0,
        solution_url: puzzle.solution_url
      };
    })
    .sort((a, b) => b.solvers - a.solvers)
    .slice(0, 20); // Get top 20 to have some buffer
  
  // Clean up memory by removing unnecessary data
  solverMap.forEach(solver => {
    // Remove solved puzzles array to save memory
    solver.solvedPuzzles = [];
  });
  
  // Create and cache the result
  cachedLeaderboardData = {
    totalPuzzles: puzzles.length,
    uniqueSolvers: solverMap.size,
    topSolvers,
    longestStreaks,
    risingStars,
    monthlyParticipation,
    solversGrowth,
    mostSolvedPuzzles
  };
  
  console.timeEnd('calculateLeaderboardData');
  
  return cachedLeaderboardData;
}; 