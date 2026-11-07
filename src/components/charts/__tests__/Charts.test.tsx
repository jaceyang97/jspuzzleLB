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
  afterEach(() => jest.useRealTimers());

  test('opens with cumulative total solvers and offers only the two selected views', () => {
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
      'Total solvers', 'New & returning',
    ]);
  });

  test('explains unavailable solver history without the old community wording', () => {
    render(<GrowthChartTabs solversGrowthData={[]} />);

    expect(screen.getByText('Solver history is unavailable.')).toBeVisible();
    expect(screen.queryByText(/Community/)).not.toBeInTheDocument();
  });

  test('shows new and returning counts without date or range captions', () => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date('2026-11-07T12:00:00Z'));
    render(<GrowthChartTabs solversGrowthData={[]} rawPuzzles={[
      { name: 'September', date_text: 'Sep 2026', solution_url: '', solvers: ['Ada'] },
      { name: 'October', date_text: 'Oct 2026', solution_url: '', solvers: ['Ada', 'Lin', 'Lin'] },
      { name: 'October unpublished', date_text: 'Oct 2026', solution_url: '', solvers: [] },
      { name: 'November', date_text: 'Nov 2026', solution_url: '', solvers: ['Ada', 'Grace', 'New in November'] },
    ]} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Trend view' }), { target: { value: 'monthly' } });

    expect(screen.getByText('Returning')).toBeVisible();
    expect(screen.getByText('New')).toBeVisible();
    expect(screen.getAllByText('1', { selector: 'dd' })).toHaveLength(2);
    expect(screen.queryByText(/lists published|Last 12 completed months/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Oct 2026/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nov 2026/)).not.toBeInTheDocument();
  });

  test('keeps an unpublished latest month visible as unknown instead of reusing older counts', () => {
    jest.useFakeTimers('modern');
    jest.setSystemTime(new Date('2026-11-07T12:00:00Z'));
    render(<GrowthChartTabs solversGrowthData={[]} rawPuzzles={[
      { name: 'September', date_text: 'Sep 2026', solution_url: '', solvers: ['Ada'] },
      { name: 'October', date_text: 'Oct 2026', solution_url: '', solvers: [] },
    ]} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Trend view' }), { target: { value: 'monthly' } });

    expect(screen.getAllByText('N/A', { selector: 'dd' })).toHaveLength(2);
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
