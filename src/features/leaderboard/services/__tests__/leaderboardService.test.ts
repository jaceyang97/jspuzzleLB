import { loadLeaderboardData } from '../leaderboardService';
import { RISING_STARS_RULE } from '../../../../utils/risingStars';

const originalFetch = global.fetch;
const response = (data: unknown) => ({ ok: true, json: async () => data } as Response);
const base = { totalPuzzles: 100, uniqueSolvers: 200, topSolvers: [], longestStreaks: [] };

afterEach(() => { global.fetch = originalFetch; });

test('maps the published-opportunity schema without fetching the raw archive', async () => {
  global.fetch = jest.fn().mockResolvedValue(response({ ...base,
    risingStarsRule: RISING_STARS_RULE,
    risingStarsAsOf: 'August 2026',
    risingStars: [{ solver: 'Ada', puzzlesSolved: 2, opportunities: 3, solveRate: 2 / 3, rank: 8, firstAppearance: 'June 2026' }],
  }));
  const data = await loadLeaderboardData();
  expect(global.fetch).toHaveBeenCalledTimes(1);
  expect(data.risingStarsAsOf).toBe('Aug 2026');
  expect(data.risingStars[0]).toEqual({ name: 'Ada', puzzlesSolved: 2, opportunities: 3, solveRate: 2 / 3, rank: 8, firstAppearance: 'Jun 2026' });
});

test('rebuilds a previous policy even when its bounded rates use the same schema', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce(response({ ...base, risingStarsRule: 'W12-S3-E1-raw', risingStarsAsOf: 'Aug 2026',
      risingStars: [{ solver: 'Ada', puzzlesSolved: 3, opportunities: 3, solveRate: 1, rank: 1, firstAppearance: 'June 2026' }],
    }))
    .mockResolvedValueOnce(response([
      { date_text: 'June 2026', name: 'A', solvers: ['Newly eligible'], solution_url: 'https://example.test/a' },
      { date_text: 'July 2026', name: 'B', solvers: ['Newly eligible'], solution_url: 'https://example.test/b' },
      { date_text: 'August 2026', name: 'C', solvers: ['Other'], solution_url: 'https://example.test/c' },
    ]));
  const data = await loadLeaderboardData();
  expect(global.fetch).toHaveBeenNthCalledWith(2, '/data/data.json');
  expect(data.risingStars).toEqual([{
    name: 'Newly eligible', puzzlesSolved: 2, opportunities: 3, solveRate: 2 / 3,
    rank: 1, firstAppearance: 'Jun 2026',
  }]);
});

test('rebuilds legacy cached Rising stars instead of displaying their impossible interval rates', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce(response({ ...base, risingStars: [{ solver: 'Ada', puzzlesSolved: 3, solveRate: 1.5, firstAppearance: 'June 2026' }] }))
    .mockResolvedValueOnce(response(['June 2026', 'July 2026', 'August 2026'].map((date_text) => ({
      date_text, name: date_text, solvers: ['Ada'], solution_url: `https://example.test/${date_text}`,
    }))));
  const data = await loadLeaderboardData();
  expect(global.fetch).toHaveBeenNthCalledWith(2, '/data/data.json');
  expect(data.totalPuzzles).toBe(100);
  expect(data.risingStarsAsOf).toBe('Aug 2026');
  expect(data.risingStars[0]).toMatchObject({ solveRate: 1, puzzlesSolved: 3, opportunities: 3, rank: 1 });
});
