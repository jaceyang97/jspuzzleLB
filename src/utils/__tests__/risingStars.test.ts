import { calculateRisingStars } from '../risingStars';
import { Puzzle } from '../../features/leaderboard/types';

const puzzle = (date_text: string, name: string, solvers: string[], extra: Partial<Puzzle> = {}): Puzzle => ({
  date_text, name, solvers, solution_url: `https://example.test/${name}/solution`, ...extra,
});

describe('published-opportunity Rising stars', () => {
  test('counts both endpoints and anchors to completed data, independent of the client clock', () => {
    const puzzles = [
      puzzle('June 2026', 'June', ['Star']),
      puzzle('July 2026', 'July', ['Star', 'Recent']),
      puzzle('August 2026', 'August', ['Star', 'Recent']),
      puzzle('September 2026', 'Open', ['Star', 'Recent'], { solution_url: '' }),
      puzzle('October 2026', 'Unpublished', []),
    ];
    jest.useFakeTimers().setSystemTime(new Date('2099-01-01T00:00:00Z'));
    try {
      const result = calculateRisingStars(puzzles);
      expect(result.risingStarsAsOf).toBe('Aug 2026');
      expect(result.risingStars).toEqual([{
        name: 'Star', puzzlesSolved: 3, opportunities: 3, solveRate: 1,
        rank: 1, firstAppearance: 'Jun 2026',
      }]);
      jest.setSystemTime(new Date('1900-01-01T00:00:00Z'));
      expect(calculateRisingStars(puzzles)).toEqual(result);
    } finally { jest.useRealTimers(); }
  });

  test('missed published puzzles count; unavailable lists and absent months do not', () => {
    const result = calculateRisingStars([
      puzzle('April 2026', 'A', ['Star']),
      puzzle('May 2026', 'Missing list', []),
      puzzle('July 2026', 'B', ['Other']),
      puzzle('August 2026', 'C', ['Star']),
      puzzle('September 2026', 'D', ['Star']),
    ]);
    expect(result.risingStars[0]).toMatchObject({ puzzlesSolved: 3, opportunities: 4, solveRate: .75 });
  });

  test('uses the inclusive 18 calendar-month debut boundary', () => {
    const result = calculateRisingStars([
      puzzle('February 2025', 'Old debut', ['Old']),
      puzzle('March 2025', 'Window start', ['Old', 'Recent']),
      puzzle('April 2025', 'Second', ['Old', 'Recent']),
      puzzle('August 2026', 'Last', ['Recent']),
    ]);
    expect(result.risingStarsAsOf).toBe('Aug 2026');
    expect(result.risingStars.map((row) => row.name)).toEqual(['Recent']);
    expect(result.risingStars[0]).toMatchObject({ opportunities: 3, puzzlesSolved: 3 });
  });

  test('requires both two distinct solves and three published opportunities', () => {
    const result = calculateRisingStars([
      puzzle('June 2026', 'A', ['Eligible', 'Once', 'Once', 'Once']),
      puzzle('July 2026', 'B', ['Eligible', 'Too soon']),
      puzzle('August 2026', 'C', ['Too soon']),
    ]);
    expect(result.risingStars).toEqual([{
      name: 'Eligible', puzzlesSolved: 2, opportunities: 3, solveRate: 2 / 3,
      firstAppearance: 'Jun 2026', rank: 1,
    }]);
  });

  test('merges duplicate stable IDs, unions names, and includes every distinct debut-month puzzle', () => {
    const source = [
      puzzle('July 2026', 'Before debut in same month', ['Other'], { puzzle_id: 'a' }),
      puzzle('July 2026', 'First', ['Star', 'Star', ''], { puzzle_id: 'b', solution_url: '' }),
      puzzle('August 2026', 'Renamed duplicate', ['Other'], { id: 'b' }),
      puzzle('July 2026', 'Third', ['Star'], { puzzle_url: 'https://example.test/c' }),
      puzzle('July 2026', 'Changed title', ['Star'], { url: 'https://example.test/c' }),
      puzzle('August 2026', 'Fourth', ['Star'], { puzzle_id: 'd' }),
    ];
    const result = calculateRisingStars(source);
    expect(result.risingStars[0]).toMatchObject({ firstAppearance: 'Jul 2026', puzzlesSolved: 3, opportunities: 4, solveRate: .75 });
    expect(calculateRisingStars([...source].reverse())).toEqual(result);
  });

  test('fallback month/name identities merge open and published copies without collapsing distinct puzzles', () => {
    const result = calculateRisingStars([
      puzzle('June 2026', 'Same', ['Star'], { solution_url: '' }),
      puzzle('Jun 2026', 'Same', ['Other']),
      puzzle('June 2026', 'Different', ['Star']),
      puzzle('July 2026', 'Last', ['Star']),
      puzzle('Not a month', 'Invalid', ['Star']),
    ]);
    expect(result.risingStars[0]).toMatchObject({ puzzlesSolved: 3, opportunities: 3, solveRate: 1 });
  });

  test('sorts exact rates then solved counts; identical records receive shared competition ranks', () => {
    const result = calculateRisingStars([
      puzzle('May 2026', 'A', ['Veteran', 'Tail']),
      puzzle('June 2026', 'B', ['Veteran', 'Zoe', 'Ada', 'Partial', 'Tail']),
      puzzle('July 2026', 'C', ['Veteran', 'Zoe', 'Ada', 'Partial']),
      puzzle('August 2026', 'D', ['Veteran', 'Zoe', 'Ada']),
      puzzle('September 2026', 'E', ['Partial', 'Tail']),
    ]);
    expect(result.risingStars.map(({ name, rank }) => ({ name, rank }))).toEqual([
      { name: 'Veteran', rank: 1 }, { name: 'Ada', rank: 2 }, { name: 'Partial', rank: 2 }, { name: 'Zoe', rank: 2 }, { name: 'Tail', rank: 5 },
    ]);
    expect(result.risingStars.map((row) => row.solveRate)).toEqual([.8, .75, .75, .75, .6]);
    const tied = calculateRisingStars([
      puzzle('May 2026', 'A', ['A']), puzzle('June 2026', 'B', ['A', 'B', 'C']),
      puzzle('July 2026', 'C', ['A', 'B', 'C']), puzzle('August 2026', 'D', ['A', 'B', 'C']),
    ]);
    expect(tied.risingStars.map((row) => [row.name, row.rank])).toEqual([['A', 1], ['B', 2], ['C', 2]]);
  });

  test('returns every eligible exact name beyond the old top-20 cap', () => {
    const names = Array.from({ length: 35 }, (_, index) => `Name ${String(index).padStart(2, '0')}`);
    const result = calculateRisingStars(['June 2026', 'July 2026', 'August 2026'].map((date) => puzzle(date, date, names)));
    expect(result.risingStars).toHaveLength(35);
    expect(result.risingStars.every((row) => row.rank === 1 && row.solveRate === 1)).toBe(true);
  });

  test('returns a clear empty snapshot when no completed published record is available', () => {
    expect(calculateRisingStars([puzzle('August 2026', 'Unknown', []), puzzle('September 2026', 'Open', ['A'], { solution_url: '' })]))
      .toEqual({ risingStars: [], risingStarsAsOf: null });
  });
});
