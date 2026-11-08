import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommunityCard } from '../Insights';

test('uses Masters as one square and grows the grid with the other populations', () => {
  const { container, rerender } = render(<CommunityCard data={{ solverDistribution: { onePuzzle: 13151, twoToNine: 4208, tenPlus: 296 } }} />);
  expect(container.querySelectorAll('rect[data-group="onePuzzle"]')).toHaveLength(44);
  expect(container.querySelectorAll('rect[data-group="twoToNine"]')).toHaveLength(14);
  expect(container.querySelectorAll('rect[data-group="tenPlus"]')).toHaveLength(1);
  expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 118 48');
  expect(screen.queryByText(/solvers per square/)).not.toBeInTheDocument();

  rerender(<CommunityCard data={{ solverDistribution: { onePuzzle: 26240, twoToNine: 4208, tenPlus: 296 } }} />);
  expect(container.querySelectorAll('rect[data-group="onePuzzle"]')).toHaveLength(89);
  expect(container.querySelectorAll('rect[data-group="tenPlus"]')).toHaveLength(1);
  expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 118 88');
});

test('handles a community with no Masters and an empty community', () => {
  const { container, rerender } = render(<CommunityCard data={{ solverDistribution: { onePuzzle: 100, twoToNine: 10, tenPlus: 0 } }} />);
  expect(container.querySelectorAll('rect[data-group="onePuzzle"]')).toHaveLength(10);
  expect(container.querySelectorAll('rect[data-group="twoToNine"]')).toHaveLength(1);
  expect(container.querySelectorAll('rect[data-group="tenPlus"]')).toHaveLength(0);
  expect(container.querySelector('svg')).toHaveAttribute('viewBox', '0 0 118 8');
  rerender(<CommunityCard data={{ solverDistribution: { onePuzzle: 0, twoToNine: 0, tenPlus: 0 } }} />);
  expect(container.querySelector('svg')).not.toBeInTheDocument();
  expect(screen.getByText('Solver distribution is unavailable.')).toBeInTheDocument();
});
