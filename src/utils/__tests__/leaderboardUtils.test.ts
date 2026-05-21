import {
  buildPercentileDistribution,
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

describe('buildPercentileDistribution', () => {
  test('excludes solvers below the minimum puzzle count', () => {
    // Alice solves 2 puzzles (qualifies), Bob solves 1 (does not).
    const puzzles: Puzzle[] = [
      puzzle('Jan 2025', 'A', ['Alice', 'Bob']),
      puzzle('Feb 2025', 'B', ['Alice']),
    ];
    const { solverCount } = buildPercentileDistribution(puzzles, 2);
    expect(solverCount).toBe(1);
  });

  test('bins use 10-wide buckets with 100 included in the top bucket', () => {
    // Alice always finishes first ⇒ avg percentile = 100 ⇒ goes to 90-100.
    const puzzles: Puzzle[] = [
      puzzle('Jan 2025', 'A', ['Alice', 'Bob', 'Carol']),
      puzzle('Feb 2025', 'B', ['Alice', 'Bob', 'Carol']),
    ];
    const { buckets } = buildPercentileDistribution(puzzles, 2);
    expect(buckets[9].count).toBe(1); // Alice avg=100 → 90-100 bucket
    expect(buckets[0].count).toBe(1); // Carol avg=0   → 0-10 bucket
    expect(buckets[5].count).toBe(1); // Bob avg=50    → 50-60 bucket
  });

  test('skips puzzles where total<2 (no defined percentile) but still counts toward solved', () => {
    // Alice has one solo puzzle (excluded from percentile mean) and one
    // multi-solver puzzle. minPuzzles=2 includes her because she has 2
    // solved puzzles; her percentile comes from the multi-solver one.
    const puzzles: Puzzle[] = [
      puzzle('Jan 2025', 'Solo', ['Alice']),
      puzzle('Feb 2025', 'Multi', ['Alice', 'Bob']),
    ];
    const { solverCount, buckets } = buildPercentileDistribution(puzzles, 2);
    expect(solverCount).toBe(1);
    expect(buckets[9].count).toBe(1); // Alice avg = 100
  });

  test('drops solvers with zero rankable puzzles even if solved>=min', () => {
    // Both Alice and Bob qualify on count (2 solos each) but neither has
    // any multi-solver puzzle, so percentile is undefined → drop them.
    const puzzles: Puzzle[] = [
      puzzle('Jan 2025', 'A', ['Alice']),
      puzzle('Feb 2025', 'B', ['Alice']),
      puzzle('Mar 2025', 'C', ['Bob']),
      puzzle('Apr 2025', 'D', ['Bob']),
    ];
    const { solverCount, buckets } = buildPercentileDistribution(puzzles, 2);
    expect(solverCount).toBe(0);
    expect(buckets.every((b) => b.count === 0)).toBe(true);
  });

  test('median is computed from per-solver averages, not raw percentiles', () => {
    // Alice avg = 100, Bob avg = 50, Carol avg = 0 → median = 50.
    const puzzles: Puzzle[] = [
      puzzle('Jan 2025', 'A', ['Alice', 'Bob', 'Carol']),
      puzzle('Feb 2025', 'B', ['Alice', 'Bob', 'Carol']),
    ];
    const { median } = buildPercentileDistribution(puzzles, 2);
    expect(median).toBeCloseTo(50, 6);
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
