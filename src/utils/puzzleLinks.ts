export const CURRENT_PUZZLE_URL = 'https://www.janestreet.com/puzzles/current-puzzle/';

export function solverPlacementUrl(solutionUrl: string, solverName: string): string {
  const page = (solutionUrl || CURRENT_PUZZLE_URL).split('#')[0];
  // Hyphens delimit text-fragment context, so encode them along with punctuation.
  const text = encodeURIComponent(solverName).replace(/[-!'()*]/g, character =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${page}#correct-submissions-from:~:text=${text}`;
}
