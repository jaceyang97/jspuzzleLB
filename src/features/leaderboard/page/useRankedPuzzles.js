import { useMemo } from 'react';
import { format, isValid, parse } from 'date-fns';
import { useRawPuzzleData } from '../hooks/useRawPuzzleData';

export default function useRankedPuzzles(data) {
  const { puzzles, loading, error } = useRawPuzzleData(true);
  const { rankedPuzzles, totalMonths } = useMemo(() => {
    if (!puzzles) return { rankedPuzzles: data.mostSolvedPuzzles, totalMonths: null };
    const months = new Set();
    const rankedPuzzles = puzzles.map((puzzle, index) => {
      const date = parse(puzzle.date_text, 'MMMM yyyy', new Date(2000, 0, 1));
      const month = isValid(date) ? format(date, 'yyyy-M') : null;
      if (month) months.add(month);
      return { id: `${month ?? puzzle.date_text}-${index}`, name: puzzle.name, solvers: new Set(puzzle.solvers || []).size, solution_url: puzzle.solution_url };
    }).sort((a, b) => b.solvers - a.solvers);
    return { rankedPuzzles, totalMonths: months.size };
  }, [puzzles, data.mostSolvedPuzzles]);
  return { puzzles, loading, error, rankedPuzzles, totalMonths };
}
