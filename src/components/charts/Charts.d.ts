import React from 'react';

interface SolversGrowthDataPoint {
  month: string;
  totalSolvers: number;
  isCurrentMonth?: boolean;
}

interface PuzzleData {
  id: string;
  name: string;
  solvers: number;
  solution_url: string;
}

interface ChartsProps {
  solversGrowthData: SolversGrowthDataPoint[];
  mostSolvedPuzzlesData?: PuzzleData[];
}

declare const Charts: React.FC<ChartsProps>;

export default Charts;
export type { SolversGrowthDataPoint, PuzzleData, ChartsProps }; 