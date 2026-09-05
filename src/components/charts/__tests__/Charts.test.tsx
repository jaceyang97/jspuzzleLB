import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { GrowthChartTabs, MostSolvedPuzzlesTable } from '../Charts';

jest.mock('recharts', () => ({
  ...jest.requireActual('recharts'),
  ResponsiveContainer: () => null,
}));
jest.mock('../../../utils/analytics', () => ({ trackEvent: jest.fn() }));

describe('GrowthChartTabs', () => {
  test('opens with cumulative total solvers and keeps the other views available', () => {
    render(<GrowthChartTabs solversGrowthData={[
      { month: 'Jul 2026', totalSolvers: 1200 },
      { month: 'Aug 2026', totalSolvers: 1234 },
    ]} />);

    expect(screen.getByRole('combobox', { name: 'Trend view' })).toHaveValue('growth');
    expect(screen.getByRole('option', { name: 'Total solvers', selected: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'About total solvers' })).toBeVisible();
    expect(screen.getByText('1,234')).toBeVisible();
    expect(screen.getByText('Recorded through Aug 2026')).toBeVisible();
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Total solvers', 'Monthly activity', 'New solvers', 'Rank distribution',
    ]);
  });

  test('explains unavailable solver history without the old community wording', () => {
    render(<GrowthChartTabs solversGrowthData={[]} />);

    expect(screen.getByText('Solver history is unavailable.')).toBeVisible();
    expect(screen.queryByText(/Community/)).not.toBeInTheDocument();
  });
});

describe('MostSolvedPuzzlesTable', () => {
  test('sorts published counts first and explains unpublished counts as N/A', () => {
    const data = [
      { id: '2026-09', name: 'Unpublished puzzle', solvers: 0, solution_url: '' },
      { id: '2026-07', name: 'Fewer solvers', solvers: 12, solution_url: 'https://example.com/july-solution/' },
      { id: '2026-08', name: 'More solvers', solvers: 1200, solution_url: 'https://example.com/august-solution/' },
    ];
    render(<MostSolvedPuzzlesTable data={data} />);

    const table = screen.getByRole('table', { name: 'Puzzles ranked by number of solvers' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows.map((row) => within(row).getByRole('link').textContent)).toEqual([
      'More solvers', 'Fewer solvers', 'Unpublished puzzle',
    ]);
    expect(within(rows[0]).getByRole('cell', { name: '1,200' })).toBeVisible();
    expect(within(rows[1]).getByRole('cell', { name: '12' })).toBeVisible();
    expect(within(rows[2]).queryByText('0')).not.toBeInTheDocument();
    const unavailable = within(rows[2]).getByLabelText('N/A: Solver list not published');
    expect(unavailable).toHaveTextContent('N/A');
    expect(unavailable).toHaveAttribute('tabindex', '0');
    fireEvent.focus(unavailable);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Solver list not published');
    fireEvent.blur(unavailable);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Unpublished puzzle' })).toHaveAttribute(
      'href', 'https://www.janestreet.com/puzzles/current-puzzle/'
    );
    expect(data[0].name).toBe('Unpublished puzzle');
  });
});
