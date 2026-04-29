import React, { useMemo } from 'react';
import { SolverDistribution } from '../types';

interface SolverDistributionChartProps {
  data: SolverDistribution | undefined;
}

const SolverDistributionChart: React.FC<SolverDistributionChartProps> = React.memo(({ data }) => {
  const distribution = useMemo(() => {
    if (!data) return null;

    const { onePuzzle, twoToNine, tenPlus } = data;
    const total = onePuzzle + twoToNine + tenPlus;
    if (total === 0) return null;

    const onePuzzlePercent = (onePuzzle / total) * 100;
    const twoToNinePercent = (twoToNine / total) * 100;
    const tenPlusPercent = (tenPlus / total) * 100;

    const roundedOne = Math.round(onePuzzlePercent);
    const roundedTwo = Math.round(twoToNinePercent);
    const roundedTen = Math.round(tenPlusPercent);

    // Adjust percentages to sum to exactly 100%
    const decimals = [
      { value: onePuzzlePercent - roundedOne, index: 'onePuzzle' },
      { value: twoToNinePercent - roundedTwo, index: 'twoToNine' },
      { value: tenPlusPercent - roundedTen, index: 'tenPlus' },
    ];

    const largestDecimal = decimals.reduce((max, current) =>
      current.value > max.value ? current : max
    );

    let adjustedOne = roundedOne;
    let adjustedTwo = roundedTwo;
    let adjustedTen = roundedTen;

    if (largestDecimal.index === 'onePuzzle') {
      adjustedOne = 100 - roundedTwo - roundedTen;
    } else if (largestDecimal.index === 'twoToNine') {
      adjustedTwo = 100 - roundedOne - roundedTen;
    } else {
      adjustedTen = 100 - roundedOne - roundedTwo;
    }

    return {
      onePuzzle: { count: onePuzzle, percentage: adjustedOne },
      twoToNine: { count: twoToNine, percentage: adjustedTwo },
      tenPlus: { count: tenPlus, percentage: adjustedTen },
    };
  }, [data]);

  if (!distribution) return <div>No data available</div>;

  return (
    <div className="solver-distribution">
      <div className="distribution-chart">
        <div className="distribution-bar">
          <div
            className="bar-segment one-puzzle"
            style={{ width: `${distribution.onePuzzle.percentage}%` }}
          >
            <div className="segment-label">
              <span className="percentage">{distribution.onePuzzle.percentage}%</span>
            </div>
          </div>
          <div
            className="bar-segment two-nine"
            style={{ width: `${distribution.twoToNine.percentage}%` }}
          >
            <div className="segment-label">
              <span className="percentage">{distribution.twoToNine.percentage}%</span>
            </div>
          </div>
          <div
            className="bar-segment ten-plus"
            style={{ width: `${distribution.tenPlus.percentage}%` }}
          >
            <div className="segment-label">
              <span className="percentage">{distribution.tenPlus.percentage}%</span>
            </div>
          </div>
        </div>
      </div>
      <div className="distribution-legend">
        <div className="legend-item" title="Solvers who completed exactly 1 puzzle">
          <span className="legend-color one-puzzle"></span>
          <span className="legend-text">One-Timers</span>
        </div>
        <div className="legend-item" title="Solvers who completed 2–9 puzzles">
          <span className="legend-color two-nine"></span>
          <span className="legend-text">Enthusiasts</span>
        </div>
        <div className="legend-item" title="Solvers who completed 10 or more puzzles">
          <span className="legend-color ten-plus"></span>
          <span className="legend-text">Masters</span>
        </div>
      </div>
    </div>
  );
});

export default SolverDistributionChart;


