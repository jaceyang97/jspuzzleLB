import { buildMonthlyParticipation } from '../AdvancedCharts';
import { Puzzle } from '../../../features/leaderboard/types';

const puzzle = (date_text: string, solvers: string[]): Puzzle => ({
  name: date_text, date_text, solvers, solution_url: '',
});

describe('monthly new and returning solvers', () => {
  test('uses chronological first appearances and counts each person once per month', () => {
    const data = buildMonthlyParticipation([
      puzzle('Mar 2026', ['Ada', 'Lin', 'Lin']),
      puzzle('Jan 2026', ['Ada', 'Ada']),
      puzzle('Feb 2026', ['Ada', 'Grace']),
      puzzle('Feb 2026', ['Grace', 'Lin', 'Lin']),
    ]);

    expect(data.map(({ month, solvers, newSolvers, returningSolvers }) => ({ month, solvers, newSolvers, returningSolvers }))).toEqual([
      { month: 'Jan 2026', solvers: 1, newSolvers: 1, returningSolvers: 0 },
      { month: 'Feb 2026', solvers: 3, newSolvers: 2, returningSolvers: 1 },
      { month: 'Mar 2026', solvers: 2, newSolvers: 0, returningSolvers: 2 },
    ]);
  });

  test('leaves absent and unpublished months unknown without resetting first appearances', () => {
    const data = buildMonthlyParticipation([
      puzzle('Jan 2026', ['Ada']),
      puzzle('Mar 2026', []),
      puzzle('Apr 2026', ['Ada', 'Lin']),
    ]);

    expect(data[1]).toMatchObject({ month: 'Feb 2026', solvers: null, newSolvers: null, returningSolvers: null, totalLists: 0 });
    expect(data[2]).toMatchObject({ month: 'Mar 2026', solvers: null, newSolvers: null, returningSolvers: null, totalLists: 1, publishedLists: 0 });
    expect(data[3]).toMatchObject({ solvers: 2, newSolvers: 1, returningSolvers: 1 });
  });

  test('keeps observed counts and publication coverage when only some lists are available', () => {
    const data = buildMonthlyParticipation([
      puzzle('Oct 2026', []),
      puzzle('Oct 2026', ['Ada', 'Ada']),
    ]);

    expect(data[0]).toMatchObject({ solvers: 1, newSolvers: 1, returningSolvers: 0, publishedLists: 1, totalLists: 2 });
    expect(buildMonthlyParticipation([])).toEqual([]);
    expect(buildMonthlyParticipation([puzzle('invalid date', ['Ada'])])).toEqual([]);
  });
});
