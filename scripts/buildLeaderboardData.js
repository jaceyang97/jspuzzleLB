// Precompute leaderboard stats on the server/build side to avoid heavy client work.
// Reads src/data/data.json and writes a normalized stats file to public/data/stats.json.
const fs = require('fs/promises');
const path = require('path');
const { format, parse, compareAsc, differenceInMonths, addMonths } = require('date-fns');

const ROOT = path.resolve(__dirname, '..');
const INPUT_PATH = path.join(ROOT, 'src', 'data', 'data.json');
const OUTPUT_DIR = path.join(ROOT, 'public', 'data');
const OUTPUT_PATH = path.join(OUTPUT_DIR, 'stats.json');

const parseDate = (dateText) => {
  try {
    return parse(dateText, 'MMMM yyyy', new Date());
  } catch (err) {
    console.error(`Failed to parse date "${dateText}", falling back to now.`, err);
    return new Date();
  }
};

const formatDateShort = (dateText) => {
  if (!dateText) return 'N/A';
  if (/^[A-Za-z]{3} \d{4}$/.test(dateText)) return dateText;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthCodes = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const map = new Map(monthNames.map((name, idx) => [name, monthCodes[idx]]));

  const parts = dateText.split(' ');
  if (parts.length === 2 && map.has(parts[0])) {
    return `${map.get(parts[0])} ${parts[1]}`;
  }
  return dateText;
};

const formatMonthYear = (date) => format(date, 'MMM yyyy');

const buildStats = (puzzles) => {
  const solverMap = new Map();
  const allMonths = new Set();

  const sortedPuzzles = [...puzzles].sort((a, b) => compareAsc(parseDate(b.date_text), parseDate(a.date_text)));

  sortedPuzzles.forEach((puzzle) => {
    const puzzleDate = parseDate(puzzle.date_text);
    const monthKey = formatMonthYear(puzzleDate);
    allMonths.add(monthKey);

    if (!puzzle.solvers || puzzle.solvers.length === 0) return;

    puzzle.solvers.forEach((solverName) => {
      if (!solverMap.has(solverName)) {
        solverMap.set(solverName, {
          name: solverName,
          puzzlesSolved: 0,
          firstAppearance: puzzle.date_text,
          lastSolve: puzzle.date_text,
          monthlyActivity: {},
          streaks: [],
        });
      }

      const solver = solverMap.get(solverName);
      solver.puzzlesSolved += 1;
      solver.monthlyActivity[monthKey] = true;

      if (compareAsc(parseDate(puzzle.date_text), parseDate(solver.firstAppearance)) < 0) {
        solver.firstAppearance = puzzle.date_text;
      }
      if (compareAsc(parseDate(puzzle.date_text), parseDate(solver.lastSolve)) > 0) {
        solver.lastSolve = puzzle.date_text;
      }
    });
  });

  const topSolversByCount = Array.from(solverMap.values()).sort((a, b) => b.puzzlesSolved - a.puzzlesSolved);

  topSolversByCount.forEach((solver) => {
    const months = Object.keys(solver.monthlyActivity).sort((a, b) =>
      compareAsc(parse(a, 'MMM yyyy', new Date()), parse(b, 'MMM yyyy', new Date())),
    );

    if (months.length === 0) return;

    let current = { start: months[0], end: months[0], length: 1 };
    for (let i = 1; i < months.length; i += 1) {
      const prevDate = parse(months[i - 1], 'MMM yyyy', new Date());
      const currDate = parse(months[i], 'MMM yyyy', new Date());
      if (differenceInMonths(currDate, prevDate) === 1) {
        current.end = months[i];
        current.length += 1;
      } else {
        if (current.length >= 2) solver.streaks.push({ ...current });
        current = { start: months[i], end: months[i], length: 1 };
      }
    }
    if (current.length >= 2) solver.streaks.push({ ...current });
    solver.streaks.sort((a, b) => b.length - a.length);
  });

  const longestStreaks = topSolversByCount
    .filter((solver) => solver.streaks.length > 0)
    .map((solver) => ({ solver: solver.name, ...solver.streaks[0] }))
    .sort((a, b) => b.length - a.length)
    .slice(0, 20);

  const currentDate = new Date();
  const oneYearAgo = addMonths(currentDate, -12);
  const risingStars = Array.from(solverMap.values())
    .filter((solver) => compareAsc(parseDate(solver.firstAppearance), oneYearAgo) >= 0 && solver.puzzlesSolved >= 3)
    .map((solver) => {
      const firstDate = parseDate(solver.firstAppearance);
      const monthsSinceStart = Math.max(1, differenceInMonths(currentDate, firstDate));
      return {
        solver: solver.name,
        puzzlesSolved: solver.puzzlesSolved,
        solveRate: solver.puzzlesSolved / monthsSinceStart,
        firstAppearance: solver.firstAppearance,
      };
    })
    .sort((a, b) => b.solveRate - a.solveRate)
    .slice(0, 20);

  const sortedMonths = Array.from(allMonths).sort((a, b) =>
    compareAsc(parse(a, 'MMM yyyy', new Date()), parse(b, 'MMM yyyy', new Date())),
  );
  const sampledMonths =
    sortedMonths.length > 48 ? sortedMonths.filter((_, idx) => idx % 3 === 0 || idx === sortedMonths.length - 1) : sortedMonths;

  const monthlyParticipation = sampledMonths.map((month) => {
    const solversCount = Array.from(solverMap.values()).filter((solver) => solver.monthlyActivity[month]).length;
    return { month, solvers: solversCount };
  });

  const solversGrowth = [];
  let totalSolvers = 0;
  sortedMonths.forEach((month) => {
    const newSolvers = Array.from(solverMap.values()).filter((solver) => formatMonthYear(parseDate(solver.firstAppearance)) === month).length;
    totalSolvers += newSolvers;
    solversGrowth.push({ month, totalSolvers });
  });
  if (solversGrowth.length > 0 && solversGrowth[solversGrowth.length - 1].totalSolvers !== solverMap.size) {
    solversGrowth[solversGrowth.length - 1].totalSolvers = solverMap.size;
  }

  const mostSolvedPuzzles = sortedPuzzles
    .map((puzzle) => {
      const date = parseDate(puzzle.date_text);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      return {
        id: `${year}-${month}`,
        name: puzzle.name,
        solvers: puzzle.solvers ? puzzle.solvers.length : 0,
        solution_url: puzzle.solution_url,
      };
    })
    .sort((a, b) => b.solvers - a.solvers)
    .slice(0, 20);

  return {
    totalPuzzles: puzzles.length,
    uniqueSolvers: solverMap.size,
    topSolvers: topSolversByCount.map((solver) => ({
      name: solver.name,
      puzzlesSolved: solver.puzzlesSolved,
      firstAppearance: formatDateShort(solver.firstAppearance),
      lastSolve: formatDateShort(solver.lastSolve),
    })),
    longestStreaks: longestStreaks.map((streak) => ({
      name: streak.solver,
      streakLength: streak.length,
      startDate: formatDateShort(streak.start),
      endDate: formatDateShort(streak.end),
    })),
    risingStars: risingStars.map((solver) => ({
      name: solver.solver,
      solveRate: solver.solveRate,
      puzzlesSolved: solver.puzzlesSolved,
      firstAppearance: formatDateShort(solver.firstAppearance),
    })),
    monthlyParticipation,
    solversGrowth,
    mostSolvedPuzzles,
    generatedAt: new Date().toISOString(),
  };
};

const main = async () => {
  console.log(`Reading puzzles from ${INPUT_PATH}`);
  const raw = await fs.readFile(INPUT_PATH, 'utf-8');
  const puzzles = JSON.parse(raw);

  const stats = buildStats(puzzles);

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(stats, null, 2));
  console.log(`Wrote stats to ${OUTPUT_PATH}`);
};

main().catch((err) => {
  console.error('Failed to build leaderboard data', err);
  process.exit(1);
});

