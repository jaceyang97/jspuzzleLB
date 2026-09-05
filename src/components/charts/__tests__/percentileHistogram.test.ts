import { buildPercentileHistogram } from '../AdvancedCharts';
import { Puzzle } from '../../../features/leaderboard/types';
import { computeAveragePercentile, findSolverPlacement } from '../../../utils/leaderboardUtils';

jest.mock('../../../utils/analytics', () => ({ trackEvent: jest.fn() }));

const puzzle = (name: string, solvers: string[]): Puzzle => ({
  name, date_text: 'January 2026', solution_url: '', solvers,
});

describe('buildPercentileHistogram', () => {
  test('duplicate names within one puzzle do not qualify as repeat solvers', () => {
    const result = buildPercentileHistogram([
      puzzle('Single appearance', ['Ada', 'Lin', 'Ada', 'Lin']),
    ]);

    expect(result.totalSolvers).toBe(0);
    expect(result.bins.every((bin) => bin.count === 0)).toBe(true);
  });

  test('counts each puzzle once while preserving the profile first-position percentile', () => {
    const puzzles = [
      puzzle('First puzzle', ['First', 'Ada', 'First', 'Lin', 'Ada', 'Only once', 'Only once']),
      puzzle('Second puzzle', ['Ada', 'Middle', 'Lin', 'First']),
    ];
    const result = buildPercentileHistogram(puzzles);

    expect(result.totalSolvers).toBe(3);
    expect(result.bins.filter((bin) => bin.count > 0).map(({ binLabel, count }) => ({ binLabel, count })))
      .toEqual([
        { binLabel: '40–50', count: 1 },
        { binLabel: '50–60', count: 1 },
        { binLabel: '90–100', count: 1 },
      ]);

    // Dropping duplicate rows before ranking would move Ada and Lin into
    // different bins. These are the same first placements used by profiles.
    const profilePercentile = (name: string) => computeAveragePercentile(
      puzzles.map((record) => findSolverPlacement(name, record)!)
    )!.value;
    expect(profilePercentile('Ada')).toBeCloseTo(91.6667, 3);
    expect(profilePercentile('Lin')).toBeCloseTo(41.6667, 3);
    expect(profilePercentile('First')).toBe(50);
  });
});
