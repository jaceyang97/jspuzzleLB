import { Puzzle, RisingStar } from '../features/leaderboard/types';

export const RISING_STARS_RULE = 'W18-S2-E3-raw';
const DEBUT_WINDOW_MONTHS = 18;
const MIN_SOLVES = 2;
const MIN_OPPORTUNITIES = 3;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const parseMonth = (text: unknown): number | null => {
  if (typeof text !== 'string') return null;
  const match = /^([A-Za-z]+)\s+(\d{4})$/.exec(text.trim());
  if (!match) return null;
  const index = MONTHS.findIndex((name) => name.toLowerCase() === match[1].toLowerCase() || name.slice(0, 3).toLowerCase() === match[1].toLowerCase());
  const year = Number(match[2]);
  return index >= 0 && year >= 1 ? year * 12 + index : null;
};

const formatMonth = (value: number): string => `${MONTHS[value % 12].slice(0, 3)} ${Math.floor(value / 12)}`;

const identity = (puzzle: Puzzle, puzzleMonth: number): string => {
  for (const value of [puzzle.puzzle_id, puzzle.id]) {
    if (value !== undefined && value !== null && String(value).trim()) return `id:${String(value).trim()}`;
  }
  for (const value of [puzzle.puzzle_url, puzzle.url]) {
    if (typeof value === 'string' && value.trim()) return `url:${value.trim()}`;
  }
  return `month-name:${puzzleMonth}:${puzzle.name}`;
};

// Match Python's Unicode ordering without a viewer-dependent locale tiebreak.
const compareNames = (left: string, right: string): number => {
  const a = Array.from(left);
  const b = Array.from(right);
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    const difference = a[index].codePointAt(0)! - b[index].codePointAt(0)!;
    if (difference) return difference;
  }
  return a.length - b.length;
};

export interface RisingStarsResult {
  risingStars: RisingStar[];
  risingStarsAsOf: string | null;
}

/** Inclusive published opportunities, anchored to the data rather than today's date. */
export const calculateRisingStars = (puzzles: Puzzle[]): RisingStarsResult => {
  const records = new Map<string, { month: number; published: boolean; solvers: Set<string> }>();
  puzzles.forEach((puzzle) => {
    const puzzleMonth = parseMonth(puzzle.date_text || '');
    if (puzzleMonth === null) return;
    const key = identity(puzzle, puzzleMonth);
    const record = records.get(key) || { month: puzzleMonth, published: false, solvers: new Set<string>() };
    record.month = Math.min(record.month, puzzleMonth);
    record.published ||= typeof puzzle.solution_url === 'string' && !!puzzle.solution_url.trim();
    (puzzle.solvers || []).forEach((name) => {
      if (typeof name === 'string' && name.trim()) record.solvers.add(name);
    });
    records.set(key, record);
  });
  const completed = Array.from(records.values())
    .filter((record) => record.published && record.solvers.size > 0)
    .sort((a, b) => a.month - b.month);
  if (!completed.length) return { risingStars: [], risingStarsAsOf: null };

  const asOf = completed[completed.length - 1].month;
  const opportunitiesFromMonth = new Map<number, number>();
  const solvers = new Map<string, { firstMonth: number; solved: number }>();
  completed.forEach((record, index) => {
    // All distinct puzzles in the debut month are opportunities, regardless
    // of their order in the source or which one first listed the name.
    if (!opportunitiesFromMonth.has(record.month)) opportunitiesFromMonth.set(record.month, completed.length - index);
    record.solvers.forEach((name) => {
      const solver = solvers.get(name) || { firstMonth: record.month, solved: 0 };
      solver.solved += 1;
      solvers.set(name, solver);
    });
  });
  const risingStars = Array.from(solvers, ([name, solver]) => {
    const opportunities = opportunitiesFromMonth.get(solver.firstMonth)!;
    return {
      name, puzzlesSolved: solver.solved, opportunities,
      solveRate: solver.solved / opportunities,
      firstAppearance: formatMonth(solver.firstMonth),
      firstMonth: solver.firstMonth,
      rank: 0,
    };
  }).filter((solver) => asOf - solver.firstMonth >= 0 && asOf - solver.firstMonth < DEBUT_WINDOW_MONTHS
      && solver.puzzlesSolved >= MIN_SOLVES && solver.opportunities >= MIN_OPPORTUNITIES)
    .sort((a, b) => (b.puzzlesSolved * a.opportunities - a.puzzlesSolved * b.opportunities)
      || b.puzzlesSolved - a.puzzlesSolved || compareNames(a.name, b.name));

  risingStars.forEach((solver, index) => {
    const previous = risingStars[index - 1];
    const tied = previous && previous.puzzlesSolved === solver.puzzlesSolved
      && previous.puzzlesSolved * solver.opportunities === solver.puzzlesSolved * previous.opportunities;
    solver.rank = tied ? previous.rank : index + 1;
  });
  return {
    risingStars: risingStars.map(({ firstMonth, ...solver }) => solver),
    risingStarsAsOf: formatMonth(asOf),
  };
};
