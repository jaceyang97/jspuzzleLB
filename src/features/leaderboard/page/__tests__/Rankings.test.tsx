import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SelectedRankedRows, SelectedRankingTabs } from '../Rankings';
import { useRankings } from '../shared';

jest.mock('motion/react', () => ({
  ...jest.requireActual('motion/react'),
  useReducedMotion: () => true,
}));

const data = {
  topSolvers: [
    { name: 'Ada', puzzlesSolved: 12, lastSolve: 'Oct 2026' },
    { name: 'Morgan', puzzlesSolved: 4, lastSolve: 'Sep 2026' },
  ],
  risingStars: [
    { name: 'Lin', rank: 1, puzzlesSolved: 4, opportunities: 4, solveRate: 1 },
    { name: 'Morgan', rank: 2, puzzlesSolved: 3, opportunities: 4, solveRate: .75 },
    { name: 'Zoe', rank: 2, puzzlesSolved: 3, opportunities: 4, solveRate: .75 },
  ],
};

test('keeps tied Rising stars ranks after filtering and opens the selected profile', () => {
  const onSelect = jest.fn();
  function Results({ search }: { search: string }) {
    const { filtered } = useRankings(data, 'rising', search);
    return <SelectedRankedRows rows={filtered} data={data} scope="rising" onSelect={onSelect} start={1} total={filtered.length} />;
  }
  const { rerender } = render(<Results search="" />);
  expect(screen.getByRole('button', { name: 'Open profile for Morgan, rank 2, 75% solve rate' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Open profile for Zoe, rank 2, 75% solve rate' })).toBeVisible();
  rerender(<Results search="  MORGAN " />);
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Open profile for Morgan, rank 2, 75% solve rate' }));
  expect(onSelect).toHaveBeenCalledWith('Morgan');
  expect(screen.queryByText('Lin')).not.toBeInTheDocument();
});

test('exposes rank movement and singular puzzle counts in the active row layout', () => {
  const rows = [
    { name: 'Ada', rank: 1, score: 1, unit: 'puzzles', rankChange: null },
    { name: 'Morgan', rank: 2, score: 4, unit: 'puzzles', rankChange: -2 },
  ];
  render(<SelectedRankedRows rows={rows} data={data} scope="top" onSelect={jest.fn()} start={1} total={2} />);
  expect(screen.getByRole('button', { name: 'Open profile for Ada, rank 1, 1 puzzle, Not ranked last month' })).toBeVisible();
  expect(screen.getByLabelText('Down 2 since last month')).toHaveTextContent('-2');
  expect(screen.getByRole('button', { name: /Open profile for Morgan/ })).toHaveAccessibleDescription('Last seen Sep 2026');
});

test('arrow, Home, and End keys change the selected ranking and move focus', () => {
  const previousScroll = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = jest.fn();
  function Tabs() {
    const [scope, setScope] = useState('top');
    return <SelectedRankingTabs scope={scope} onChange={setScope} />;
  }
  try {
    render(<Tabs />);
    const top = screen.getByRole('tab', { name: 'Top solvers' });
    const streaks = screen.getByRole('tab', { name: 'Longest streaks' });
    const rising = screen.getByRole('tab', { name: 'Rising stars' });
    top.focus();
    fireEvent.keyDown(top, { key: 'ArrowRight' });
    expect(streaks).toHaveFocus();
    expect(streaks).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(streaks, { key: 'End' });
    expect(rising).toHaveFocus();
    expect(rising).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(rising, { key: 'Home' });
    expect(top).toHaveFocus();
    expect(top).toHaveAttribute('aria-selected', 'true');
  } finally {
    HTMLElement.prototype.scrollIntoView = previousScroll;
  }
});
