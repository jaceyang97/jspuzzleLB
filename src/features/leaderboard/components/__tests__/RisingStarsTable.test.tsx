import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import RisingStarsTable from '../RisingStarsTable';
import { RisingStar } from '../../types';

jest.mock('../../../../utils/analytics', () => ({ trackOnce: jest.fn() }));

const row = (name: string, rank: number, solved: number, opportunities: number): RisingStar => ({
  name, rank, puzzlesSolved: solved, opportunities, solveRate: solved / opportunities, firstAppearance: 'May 2026',
});

test('shows bounded percentages, accessible records, and shared ranks that survive filtering', () => {
  const data = [row('Ada', 1, 4, 4), row('Lin', 2, 3, 3), row('Morgan', 2, 3, 3), row('Zoe', 4, 3, 4)];
  const onSolverClick = jest.fn();
  const { rerender } = render(<RisingStarsTable data={data} onSolverClick={onSolverClick} />);
  expect(screen.getByRole('columnheader', { name: 'Solve rate' })).toBeVisible();
  expect(screen.getByRole('columnheader', { name: 'Record' })).toBeVisible();
  expect(screen.getAllByLabelText('Rank 2')).toHaveLength(2);
  expect(screen.getByRole('cell', { name: '3 of 4 published puzzles solved' })).toHaveTextContent('3/4');
  expect(screen.getByText('75%')).toBeVisible();
  expect(screen.getAllByText('100%')).toHaveLength(3);
  rerender(<RisingStarsTable data={data} searchTerm="  MORGAN " onSolverClick={onSolverClick} />);
  expect(screen.getByLabelText('Rank 2')).toBeVisible();
  expect(screen.queryByLabelText('Rank 1')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open profile for Morgan' }));
  expect(onSolverClick).toHaveBeenCalledTimes(1);
  expect(onSolverClick).toHaveBeenCalledWith('Morgan');
});

test('search includes names beyond the initial page and scrolling keeps the whole tied group accessible', () => {
  const data = Array.from({ length: 35 }, (_, index) => row(`Solver ${String(index).padStart(2, '0')}`, 8, 4, 4));
  const onSolverClick = jest.fn();
  const { rerender } = render(<RisingStarsTable data={data} onSolverClick={onSolverClick} />);
  const table = screen.getByRole('table', { name: /Rising stars/ });
  expect(within(table).getAllByRole('button', { name: /^Open profile/ })).toHaveLength(20);
  fireEvent.scroll(table.parentElement!);
  fireEvent.scroll(table.parentElement!);
  expect(within(table).getAllByRole('button', { name: /^Open profile/ })).toHaveLength(35);
  rerender(<RisingStarsTable data={data} searchTerm="solver 34" onSolverClick={onSolverClick} />);
  expect(screen.getByRole('button', { name: 'Open profile for Solver 34' })).toBeVisible();
  expect(screen.getByLabelText('Rank 8')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Open profile for Solver 34' }).closest('tr')!);
  expect(onSolverClick).toHaveBeenCalledWith('Solver 34');
  rerender(<RisingStarsTable data={data} searchTerm="Nobody" onSolverClick={onSolverClick} />);
  expect(screen.getByRole('status')).toHaveTextContent('No solvers match');
});
