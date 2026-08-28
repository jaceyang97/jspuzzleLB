import { addMonths, format } from 'date-fns';
import {
  calculateLeaderboardData,
  competitionRanks,
  computeAveragePercentile,
  computeRankChanges,
  findSolverPlacement,
  SolverPlacement,
} from '../leaderboardUtils';
import { Puzzle } from '../../features/leaderboard/types';

const puzzle = (
  date_text: string,
  name: string,
  solvers: string[],
): Puzzle => ({
  date_text,
  name,
  solution_url: '',
  solvers,
});

describe('findSolverPlacement', () => {
  test('rank reflects JSON order, not alphabetic order', () => {
    // "Zelda" appears FIRST in JSON; "Alice" appears LAST.
    // If we accidentally sorted alphabetically, Alice would be #1.
    const p = puzzle('Jan 2025', 'Sorted Out', ['Zelda', 'Mallory', 'Alice']);

    expect(findSolverPlacement('Zelda', p)).toEqual({
      puzzle: p,
      rank: 1,
      total: 3,
      percentile: 100,
    });
    expect(findSolverPlacement('Mallory', p)).toEqual({
      puzzle: p,
      rank: 2,
      total: 3,
      percentile: 50,
    });
    expect(findSolverPlacement('Alice', p)).toEqual({
      puzzle: p,
      rank: 3,
      total: 3,
      percentile: 0,
    });
  });

  test('rank reflects JSON order, not date-group order', () => {
    // Two puzzles share the same date_text. Within each puzzle, the
    // JSON order of solvers is what determines placement — date grouping
    // does not re-rank.
    const a = puzzle('May 2026', 'Puzzle A', ['Carol', 'Bob', 'Alice']);
    const b = puzzle('May 2026', 'Puzzle B', ['Alice', 'Bob', 'Carol']);

    expect(findSolverPlacement('Alice', a)?.rank).toBe(3);
    expect(findSolverPlacement('Alice', b)?.rank).toBe(1);
    expect(findSolverPlacement('Carol', a)?.rank).toBe(1);
    expect(findSolverPlacement('Carol', b)?.rank).toBe(3);
  });

  test('returns null when solver is not in the list', () => {
    const p = puzzle('Jan 2025', 'X', ['Alice', 'Bob']);
    expect(findSolverPlacement('Charlie', p)).toBeNull();
  });

  test('returns null when solvers array is empty or missing', () => {
    expect(findSolverPlacement('Alice', puzzle('Jan 2025', 'X', []))).toBeNull();
    expect(
      findSolverPlacement('Alice', {
        date_text: 'Jan 2025',
        name: 'X',
        solution_url: '',
      } as unknown as Puzzle),
    ).toBeNull();
  });

  test('single-solver puzzle: rank=1, total=1, percentile=null', () => {
    const p = puzzle('Jan 2025', 'Lonely', ['Alice']);
    expect(findSolverPlacement('Alice', p)).toEqual({
      puzzle: p,
      rank: 1,
      total: 1,
      percentile: null,
    });
  });

  test('percentile formula: rank 1 of 1000 is exactly 100, mid is ~50, last is exactly 0', () => {
    const solvers = Array.from({ length: 1000 }, (_, i) => `solver_${i}`);
    const p = puzzle('Jan 2025', 'Big', solvers);
    expect(findSolverPlacement('solver_0', p)?.percentile).toBe(100);
    expect(findSolverPlacement('solver_999', p)?.percentile).toBe(0);
    const mid = findSolverPlacement('solver_500', p)?.percentile;
    expect(mid).toBeGreaterThan(49);
    expect(mid).toBeLessThan(51);
  });

  test('placement is identical regardless of how the source list is sorted by caller', () => {
    // Same logical ranking, just to be defensive: indexOf is positional.
    const sorted = ['A', 'B', 'C', 'D'];
    const p = puzzle('Jan 2025', 'X', sorted);
    expect(findSolverPlacement('A', p)?.rank).toBe(1);
    expect(findSolverPlacement('D', p)?.rank).toBe(4);
  });
});

describe('computeAveragePercentile', () => {
  const mk = (
    rank: number,
    total: number,
    name = 'p',
    date = 'Jan 2025',
  ): SolverPlacement => ({
    puzzle: puzzle(date, name, []),
    rank,
    total,
    percentile: total > 1 ? 100 * (1 - (rank - 1) / (total - 1)) : null,
  });

  test('returns null when no placements have a defined percentile', () => {
    expect(computeAveragePercentile([])).toBeNull();
    expect(computeAveragePercentile([mk(1, 1)])).toBeNull();
  });

  test('averages percentiles, excluding single-solver puzzles', () => {
    // 100, 50, 0 → mean = 50. The single-solver puzzle is excluded.
    const result = computeAveragePercentile([
      mk(1, 3),
      mk(2, 3),
      mk(3, 3),
      mk(1, 1),
    ]);
    expect(result).not.toBeNull();
    expect(result!.value).toBeCloseTo(50, 6);
    expect(result!.sampleSize).toBe(3);
  });

  test('rank 1 in many puzzles averages to 100', () => {
    const result = computeAveragePercentile([
      mk(1, 100),
      mk(1, 50),
      mk(1, 1000),
    ]);
    expect(result!.value).toBeCloseTo(100, 6);
    expect(result!.sampleSize).toBe(3);
  });

  test('does NOT collapse to raw-rank average', () => {
    // Rank 1 of 30 vs rank 1 of 1000 — raw mean would be 1; we should
    // see 100 (both top finishes). This is the whole point: the metric
    // is field-size-invariant for ties at the top.
    const result = computeAveragePercentile([mk(1, 30), mk(1, 1000)]);
    expect(result!.value).toBeCloseTo(100, 6);
  });
});

describe('competitionRanks', () => {
  test('tied counts share a rank; next distinct count skips past the tie group', () => {
    const ranks = competitionRanks(
      new Map([
        ['A', 5],
        ['B', 3],
        ['C', 3],
        ['D', 1],
      ]),
    );
    expect(ranks.get('A')).toBe(1);
    expect(ranks.get('B')).toBe(2);
    expect(ranks.get('C')).toBe(2);
    expect(ranks.get('D')).toBe(4);
  });

  test('empty input yields empty ranks', () => {
    expect(competitionRanks(new Map()).size).toBe(0);
  });
});

describe('computeRankChanges', () => {
  test('overtaking in the latest month shows up as +/- movement', () => {
    // Before June: Alice 2 solves (rank 1), Bob 1 solve (rank 2).
    // Bob solves June's puzzle, Alice does not → both at 2, tied rank 1.
    const puzzles = [
      puzzle('April 2026', 'P1', ['Alice', 'Bob']),
      puzzle('May 2026', 'P2', ['Alice']),
      puzzle('June 2026', 'P3', ['Bob']),
    ];
    const changes = computeRankChanges(puzzles);
    expect(changes.get('Alice')).toBe(0); // rank 1 → 1
    expect(changes.get('Bob')).toBe(1); // rank 2 → 1
  });

  test('solver whose first solve is the latest month is flagged as new (null)', () => {
    const puzzles = [
      puzzle('May 2026', 'P1', ['Alice']),
      puzzle('June 2026', 'P2', ['Alice', 'Newcomer']),
    ];
    const changes = computeRankChanges(puzzles);
    expect(changes.get('Newcomer')).toBeNull();
    expect(changes.get('Alice')).toBe(0);
  });

  test('being passed by others shows a negative change', () => {
    // Before June: Alice and Bob tied at 2 solves, both rank 1.
    // June: only Bob solves → Bob 3 (sole rank 1), Alice 2 (rank 2).
    const puzzles = [
      puzzle('April 2026', 'P1', ['Alice', 'Bob']),
      puzzle('May 2026', 'P2', ['Alice', 'Bob']),
      puzzle('June 2026', 'P3', ['Bob']),
    ];
    const changes = computeRankChanges(puzzles);
    expect(changes.get('Bob')).toBe(0); // tied rank 1 → sole rank 1
    expect(changes.get('Alice')).toBe(-1); // tied rank 1 → rank 2
  });

  test('latest month with no solvers yet means no movement for anyone', () => {
    const puzzles = [
      puzzle('May 2026', 'P1', ['Alice', 'Bob']),
      puzzle('June 2026', 'P2', []),
    ];
    const changes = computeRankChanges(puzzles);
    expect(changes.get('Alice')).toBe(0);
    expect(changes.get('Bob')).toBe(0);
  });

  test('empty input yields an empty map', () => {
    expect(computeRankChanges([]).size).toBe(0);
  });
});

describe('rising stars eligibility', () => {
  // Puzzle dated `offset` months from now, e.g. -2 → "June 2026" when
  // the current month is August 2026.
  const monthText = (offset: number): string =>
    format(addMonths(new Date(), offset), 'MMMM yyyy');

  test('requires 3 distinct puzzles — duplicate names on one puzzle count once', () => {
    // "Star": 3 distinct puzzles. "Dupe": 3 list entries but only 2
    // distinct puzzles (listed twice on a double puzzle) → excluded.
    const puzzles = [
      puzzle(monthText(-3), 'P1', ['Star']),
      puzzle(monthText(-2), 'P2', ['Star', 'Dupe', 'Dupe']),
      puzzle(monthText(-1), 'P3', ['Star', 'Dupe']),
    ];
    const data = calculateLeaderboardData(puzzles);
    const names = data.risingStars.map((s) => s.name);
    expect(names).toContain('Star');
    expect(names).not.toContain('Dupe');

    const dupe = data.topSolvers.find((s) => s.name === 'Dupe');
    expect(dupe?.puzzlesSolved).toBe(2);
  });

  test('first appearance must fall within the past 12 months', () => {
    // "Old" first appeared 12 months back (the 13th month counting the
    // current one) → excluded. "Recent" first appeared 11 months back
    // (the 12th month) → included. Both have 3 solves.
    const puzzles = [
      puzzle(monthText(-12), 'P1', ['Old']),
      puzzle(monthText(-11), 'P2', ['Old', 'Recent']),
      puzzle(monthText(-10), 'P3', ['Old', 'Recent']),
      puzzle(monthText(-9), 'P4', ['Recent']),
    ];
    const names = calculateLeaderboardData(puzzles).risingStars.map((s) => s.name);
    expect(names).toContain('Recent');
    expect(names).not.toContain('Old');
  });

  test('fewer than 3 solves never qualifies, however recent', () => {
    const puzzles = [
      puzzle(monthText(-1), 'P1', ['Casual']),
      puzzle(monthText(0), 'P2', ['Casual']),
    ];
    expect(calculateLeaderboardData(puzzles).risingStars).toHaveLength(0);
  });
});

describe('JSON-order invariance: placement is unaffected by sorting the input', () => {
  test('alphabetic sort of the solvers array would change rank — guard against it', () => {
    const original = ['Zelda', 'Mallory', 'Alice'];
    const alpha = [...original].sort();

    const pOriginal = puzzle('Jan 2025', 'X', original);
    const pAlpha = puzzle('Jan 2025', 'X', alpha);

    // Sanity: if someone alphabetized, Alice would become rank 1.
    expect(findSolverPlacement('Alice', pAlpha)?.rank).toBe(1);

    // What we actually want: Zelda is rank 1 in submission-order JSON.
    expect(findSolverPlacement('Zelda', pOriginal)?.rank).toBe(1);
    expect(findSolverPlacement('Alice', pOriginal)?.rank).toBe(3);
  });
});
