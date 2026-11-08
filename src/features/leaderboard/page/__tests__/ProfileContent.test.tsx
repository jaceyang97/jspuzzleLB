import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProfileContent } from '../shared';
import { useRawPuzzleData } from '../../hooks/useRawPuzzleData';

jest.mock('../../hooks/useRawPuzzleData', () => ({ useRawPuzzleData: jest.fn() }));

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const puzzles = months.map((month, index) => ({ date_text: `${month} 2015`, name: `Puzzle ${index + 1}`, solution_url: `https://example.com/${index + 1}`, solvers: ['Ada Lovelace', 'Grace Hopper'] }));
const data = { topSolvers: [{ name: 'Ada Lovelace', puzzlesSolved: 12, firstAppearance: 'Jan 2015', lastSolve: 'Dec 2015' }] };
const initialWidth = window.innerWidth;
const initialHeight = window.innerHeight;

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1440 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 900 });
  (useRawPuzzleData as jest.Mock).mockReturnValue({ puzzles, loading: false, error: null });
});

afterEach(() => {
  window.innerWidth = initialWidth;
  window.innerHeight = initialHeight;
});

test('pages through every solved puzzle without requiring an inner scroll area', () => {
  render(<ProfileContent data={data} name="Ada Lovelace" onClose={jest.fn()} />);
  const table = screen.getByRole('table');
  expect(within(table).getAllByRole('row')).toHaveLength(11);
  expect(screen.getByText('1–10 of 12')).toBeInTheDocument();
  expect(within(table).getAllByRole('link')[0]).toHaveTextContent('Puzzle 12');
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(within(table).getAllByRole('link').map(link => link.textContent)).toEqual(['Puzzle 2', 'Puzzle 1']);
  expect(screen.getByText('11–12 of 12')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
  expect(within(table).getAllByRole('row')).toHaveLength(11);
});

test('resizing to a smaller page resets the range and keeps records reachable', () => {
  render(<ProfileContent data={data} name="Ada Lovelace" onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  window.innerWidth = 390;
  fireEvent(window, new Event('resize'));
  const table = screen.getByRole('table');
  expect(within(table).getAllByRole('link').map(link => link.textContent)).toEqual(['Puzzle 12', 'Puzzle 11', 'Puzzle 10']);
  expect(screen.getByText('1–3 of 12')).toBeInTheDocument();
  expect(screen.getByText('1 / 4')).toBeInTheDocument();
  window.innerWidth = 1440;
  fireEvent(window, new Event('resize'));
  expect(within(table).getAllByRole('row')).toHaveLength(11);
  expect(screen.getByText('1–10 of 12')).toBeInTheDocument();
});
