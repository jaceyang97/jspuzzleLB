import { CURRENT_PUZZLE_URL, solverPlacementUrl } from '../puzzleLinks';

const solution = 'https://www.janestreet.com/puzzles/it-s-a-metric-too-solution/';

test('targets the solver on the solution page and keeps a solver-list anchor fallback', () => {
  expect(solverPlacementUrl(solution, 'Calvin Pozderac')).toBe(
    `${solution}#correct-submissions-from:~:text=Calvin%20Pozderac`);
});

test('uses the current puzzle when no solution has been published', () => {
  expect(solverPlacementUrl('', 'Ada Lovelace')).toBe(
    `${CURRENT_PUZZLE_URL}#correct-submissions-from:~:text=Ada%20Lovelace`);
});

test.each([
  ['Anne-Marie', 'Anne%2DMarie'],
  ['Smith, Jr.', 'Smith%2C%20Jr.'],
  ["O'Neil & Co", 'O%27Neil%20%26%20Co'],
  ['陈家苇', '%E9%99%88%E5%AE%B6%E8%8B%87'],
  ['100% Solver', '100%25%20Solver'],
])('keeps %s as a single literal text target', (name, encoded) => {
  expect(solverPlacementUrl(solution, name)).toBe(
    `${solution}#correct-submissions-from:~:text=${encoded}`);
});

test('replaces existing fragments without dropping the source query', () => {
  expect(solverPlacementUrl(`${solution}?view=full#old`, 'Ada')).toBe(
    `${solution}?view=full#correct-submissions-from:~:text=Ada`);
});
