import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import LeaderboardWorkspace from '../LeaderboardWorkspace';
import { LeaderboardData } from '../../types';

jest.mock('../../../../utils/analytics', () => ({
  trackEvent: jest.fn(),
  trackOnce: jest.fn(),
}));

const data: LeaderboardData = {
  totalPuzzles: 12,
  uniqueSolvers: 3,
  topSolvers: ['Ada', 'Lin', 'Morgan'].map((name, index) => ({
    name,
    puzzlesSolved: 12 - index,
    firstAppearance: 'Jan 2026',
    lastSolve: 'Aug 2026',
  })),
  longestStreaks: ['Lin', 'Morgan', 'Ada'].map((name, index) => ({
    name,
    streakLength: 6 - index,
    startDate: 'Jan 2026',
    endDate: 'Jun 2026',
  })),
  risingStars: ['Ada', 'Morgan'].map((name, index) => ({
    name,
    puzzlesSolved: 6 - index,
    solveRate: 1.5 - index / 2,
    firstAppearance: 'May 2026',
  })),
  monthlyParticipation: [],
  solversGrowth: [],
  mostSolvedPuzzles: [],
};

const views = [
  { label: 'Top solvers', source: 'top-solvers', tableName: /Top puzzle solvers/, morganRank: 3 },
  { label: 'Longest streaks', source: 'streaks', tableName: /longest consecutive monthly/, morganRank: 2 },
  { label: 'Rising stars', source: 'rising-stars', tableName: /Rising stars/, morganRank: 2 },
];

describe('LeaderboardWorkspace', () => {
  test('shows exactly one ranking table as the selected view changes', () => {
    render(<LeaderboardWorkspace data={data} onSolverClick={jest.fn()} />);

    expect(screen.queryByRole('heading', { name: 'Leaderboard' })).not.toBeInTheDocument();
    for (const view of views) {
      fireEvent.click(screen.getByRole('tab', { name: view.label }));

      expect(screen.getAllByRole('table')).toHaveLength(1);
      expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
      expect(screen.getByRole('tab', { name: view.label, selected: true })).toBeVisible();
      const panel = screen.getByRole('tabpanel', { name: view.label });
      expect(within(panel).getByRole('table', { name: view.tableName })).toBeVisible();
      const solverHeader = within(panel).getByRole('columnheader', { name: /^Solver / });
      expect(within(solverHeader).getByText('Select a solver to view their record', { selector: '.solver-column-hint' })).toBeVisible();
      const solverLabel = within(solverHeader).getByText('Solver', { selector: '.solver-column-label' });
      fireEvent.focus(solverLabel);
      expect(screen.getByRole('tooltip')).toHaveTextContent('Select a solver to view their record');
      fireEvent.blur(solverLabel);
      const description = document.getElementById(panel.getAttribute('aria-describedby')!);
      expect(description).toHaveClass('sr-only');
      const help = screen.getByRole('button', { name: 'How this ranking works' });
      expect(help).toHaveAccessibleDescription(description!.textContent!);
      fireEvent.focus(help);
      expect(screen.getByRole('tooltip')).toHaveTextContent(description!.textContent!);
      fireEvent.blur(help);
    }
  });

  test('explains Rising stars on tab hover and keyboard focus without selecting it', () => {
    jest.useFakeTimers();
    render(<LeaderboardWorkspace data={data} onSolverClick={jest.fn()} />);
    const tab = screen.getByRole('tab', { name: 'Rising stars' });
    const anchor = tab.closest('.leaderboard-tab-tooltip')!;

    fireEvent.mouseEnter(anchor);
    act(() => { jest.advanceTimersByTime(400); });
    expect(screen.getByRole('tooltip')).toHaveTextContent(/First recorded solve within the last 12 calendar months, with at least 3 solves/);
    expect(tab).toHaveAttribute('aria-selected', 'false');
    fireEvent.mouseLeave(anchor);

    fireEvent.focus(tab);
    expect(screen.getByRole('tooltip')).toHaveTextContent(/total solves divided by elapsed months since the first solve/);
    expect(tab).toHaveAttribute('aria-selected', 'false');
    fireEvent.blur(tab);
    jest.useRealTimers();
  });

  test('arrow keys wrap between tabs and Home/End move selection and keyboard focus', () => {
    render(<LeaderboardWorkspace data={data} onSolverClick={jest.fn()} />);
    const tabs = screen.getAllByRole('tab');
    act(() => { tabs[0].focus(); });

    const movements: Array<[string, number]> = [
      ['ArrowRight', 1],
      ['ArrowRight', 2],
      ['ArrowRight', 0],
      ['ArrowLeft', 2],
      ['Home', 0],
      ['End', 2],
      ['ArrowLeft', 1],
    ];

    for (const [key, selectedIndex] of movements) {
      fireEvent.keyDown(document.activeElement!, { key });

      expect(tabs[selectedIndex]).toHaveFocus();
      expect(screen.getAllByRole('tab', { selected: true })).toEqual([tabs[selectedIndex]]);
      tabs.forEach((tab, index) => {
        expect(tab.tabIndex).toBe(index === selectedIndex ? 0 : -1);
      });
      expect(screen.getAllByRole('table')).toHaveLength(1);
      expect(screen.getByRole('tabpanel', { name: views[selectedIndex].label })).toBeVisible();
    }
  });

  test('preserves a trimmed, case-insensitive search across views, including empty results and clearing', () => {
    render(<LeaderboardWorkspace data={data} onSolverClick={jest.fn()} />);
    const search = screen.getByRole('searchbox', { name: /Search solvers/ });
    fireEvent.change(search, { target: { value: '  lIN  ' } });
    const results = screen.getByRole('status', { name: 'Solver search results' });

    expect(results).toHaveClass('sr-only');
    expect(results).toHaveAttribute('aria-atomic', 'true');
    expect(results).toHaveTextContent('1 of 3 solvers');
    expect(screen.getByRole('button', { name: 'Open profile for Lin' })).toBeVisible();
    expect(within(screen.getByRole('table')).getAllByRole('button')).toHaveLength(1);

    fireEvent.click(screen.getByRole('tab', { name: 'Longest streaks' }));
    expect(search).toHaveValue('  lIN  ');
    expect(screen.getByRole('button', { name: 'Open profile for Lin' })).toBeVisible();
    expect(within(screen.getByRole('table')).getAllByRole('button')).toHaveLength(1);

    fireEvent.click(screen.getByRole('tab', { name: 'Rising stars' }));
    expect(search).toHaveValue('  lIN  ');
    expect(within(screen.getByRole('table')).getByRole('status')).toHaveTextContent(/No solvers match/);
    expect(results).toHaveTextContent('0 of 2 solvers');

    fireEvent.click(screen.getByRole('tab', { name: 'Top solvers' }));
    expect(search).toHaveValue('  lIN  ');
    expect(screen.getByRole('button', { name: 'Open profile for Lin' })).toBeVisible();

    fireEvent.click(screen.getByRole('tab', { name: 'Rising stars' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear solver search' }));
    expect(search).toHaveValue('');
    expect(within(screen.getByRole('table')).getAllByRole('button')).toHaveLength(2);
    expect(within(screen.getByRole('table')).queryByRole('status')).not.toBeInTheDocument();
    expect(results).toHaveTextContent('2 solvers');

    fireEvent.click(screen.getByRole('tab', { name: 'Top solvers' }));
    expect(search).toHaveValue('');
    expect(within(screen.getByRole('table')).getAllByRole('button')).toHaveLength(3);
  });

  test.each(views)('$label keeps the original rank after filtering and opens the profile with the correct source', (view) => {
    const onSolverClick = jest.fn();
    render(<LeaderboardWorkspace data={data} onSolverClick={onSolverClick} />);
    fireEvent.click(screen.getByRole('tab', { name: view.label }));
    fireEvent.change(screen.getByRole('searchbox', { name: /Search solvers/ }), {
      target: { value: '  mORGAN  ' },
    });

    const table = within(screen.getByRole('table'));
    expect(table.getByLabelText(`Rank ${view.morganRank}`)).toBeVisible();
    expect(table.getAllByRole('button')).toHaveLength(1);
    fireEvent.click(table.getByRole('button', { name: 'Open profile for Morgan' }));
    expect(onSolverClick).toHaveBeenCalledTimes(1);
    expect(onSolverClick).toHaveBeenLastCalledWith('Morgan', view.source);

    fireEvent.click(table.getByRole('row', { name: /Morgan/ }));
    expect(onSolverClick).toHaveBeenCalledTimes(2);
    expect(onSolverClick).toHaveBeenLastCalledWith('Morgan', view.source);
  });
});
