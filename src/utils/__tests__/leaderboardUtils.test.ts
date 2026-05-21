import {
  computeAveragePercentile,
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
