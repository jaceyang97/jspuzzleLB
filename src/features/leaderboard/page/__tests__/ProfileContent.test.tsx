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
const initialResizeObserver = window.ResizeObserver;
let availableHeight = 520;

beforeEach(() => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1440 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 900 });
  (useRawPuzzleData as jest.Mock).mockReturnValue({ puzzles, loading: false, error: null });
  availableHeight = 520;
  window.ResizeObserver = jest.fn().mockImplementation(() => ({ observe: jest.fn(), disconnect: jest.fn() }));
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const height = this.classList.contains('lab-history-page') ? availableHeight : this.tagName === 'THEAD' ? 44 : this.tagName === 'TR' ? 45 : 0;
    return { x: 0, y: 0, width: 600, height, top: 0, left: 0, right: 600, bottom: height, toJSON: () => ({}) };
  });
});

afterEach(() => {
  window.innerWidth = initialWidth;
  window.innerHeight = initialHeight;
  window.ResizeObserver = initialResizeObserver;
  jest.restoreAllMocks();
});

test('pages through every solved puzzle without requiring an inner scroll area', () => {
  render(<ProfileContent data={data} name="Ada Lovelace" onClose={jest.fn()} />);
  const table = screen.getByRole('table');
  expect(within(table).getAllByRole('row')).toHaveLength(11);
  expect(screen.getByText('1–10 of 12')).toBeInTheDocument();
  expect(within(table).getAllByRole('link', { name: /^Puzzle \d+$/ })[0]).toHaveTextContent('Puzzle 12');
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  expect(within(table).getAllByRole('link', { name: /^Puzzle \d+$/ }).map(link => link.textContent)).toEqual(['Puzzle 2', 'Puzzle 1']);
  expect(screen.getByText('11–12 of 12')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
  expect(within(table).getAllByRole('row')).toHaveLength(11);
});

test('resizing to a smaller page resets the range and keeps records reachable', () => {
  render(<ProfileContent data={data} name="Ada Lovelace" onClose={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  window.innerWidth = 390;
  availableHeight = 180;
  fireEvent(window, new Event('resize'));
  const table = screen.getByRole('table');
  expect(within(table).getAllByRole('link', { name: /^Puzzle \d+$/ }).map(link => link.textContent)).toEqual(['Puzzle 12', 'Puzzle 11', 'Puzzle 10']);
  expect(screen.getByText('1–3 of 12')).toBeInTheDocument();
  expect(screen.getByText('1 / 4')).toBeInTheDocument();
  window.innerWidth = 1440;
  availableHeight = 520;
  fireEvent(window, new Event('resize'));
  expect(within(table).getAllByRole('row')).toHaveLength(11);
  expect(screen.getByText('1–10 of 12')).toBeInTheDocument();
});

test('keeps pagination present and disabled while puzzle history is loading', () => {
  (useRawPuzzleData as jest.Mock).mockReturnValue({ puzzles: null, loading: true, error: null });
  render(<ProfileContent data={data} name="Ada Lovelace" onClose={jest.fn()} />);
  expect(screen.getByText('Loading puzzle history…')).toBeVisible();
  expect(screen.getByRole('navigation', { name: 'Results pages' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
});

test('links placements to the current solver while keeping the puzzle title link', () => {
  render(<ProfileContent data={data} name="Ada Lovelace" onClose={jest.fn()} />);
  const link = screen.getByRole('link', { name: 'Find Ada Lovelace in the published solver list for Puzzle 12' });
  expect(link).toHaveTextContent('1 / 2');
  expect(link).toHaveAttribute('href', 'https://example.com/12#correct-submissions-from:~:text=Ada%20Lovelace');
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  expect(screen.getByRole('link', { name: 'Puzzle 12' })).toHaveAttribute('href', 'https://example.com/12');
});

test('keeps current puzzle links usable before a solution URL exists', () => {
  (useRawPuzzleData as jest.Mock).mockReturnValue({
    puzzles: [{ ...puzzles[11], solution_url: '' }], loading: false, error: null,
  });
  render(<ProfileContent data={data} name="Ada Lovelace" onClose={jest.fn()} />);
  expect(screen.getByRole('link', { name: 'Puzzle 12' })).toHaveAttribute('href', 'https://www.janestreet.com/puzzles/current-puzzle/');
  expect(screen.getByRole('link', { name: 'Find Ada Lovelace in the published solver list for Puzzle 12' })).toHaveAttribute('href', 'https://www.janestreet.com/puzzles/current-puzzle/#correct-submissions-from:~:text=Ada%20Lovelace');
});

test('placement help opens immediately on hover and Escape closes only the explanation', () => {
  const onClose = jest.fn();
  render(<ProfileContent data={data} name="Ada Lovelace" onClose={onClose} />);
  const trigger = screen.getByRole('button', { name: 'About placement' });
  fireEvent.mouseEnter(within(trigger).getByText('Placement'));
  expect(screen.getByRole('tooltip')).toBeVisible();
  fireEvent.pointerDown(screen.getByRole('heading', { name: 'Solved puzzles' }));
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  fireEvent.focus(trigger);
  fireEvent.keyDown(trigger, { key: 'Escape' });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  expect(onClose).not.toHaveBeenCalled();
});
