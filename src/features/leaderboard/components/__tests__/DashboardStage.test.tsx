import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import DashboardStage from '../DashboardStage';
import { LeaderboardData, Puzzle } from '../../types';

jest.mock('../../../../utils/analytics', () => ({
  trackEvent: jest.fn(),
  trackOnce: jest.fn(),
}));

jest.mock('../../../../components/charts/Charts', () => ({
  GrowthChartTabs: () => <div>Growth chart loaded</div>,
  MostSolvedPuzzlesTable: ({ data }: { data: LeaderboardData['mostSolvedPuzzles'] }) => (
    <div>
      <span>Puzzle table loaded</span>
      <ol aria-label="Puzzle data">
        {data.map((puzzle) => (
          <li key={puzzle.id} data-puzzle-id={puzzle.id}>
            <span>{puzzle.name}</span><span>{puzzle.solvers} solvers</span>
          </li>
        ))}
      </ol>
    </div>
  ),
}));

const data: LeaderboardData = {
  totalPuzzles: 12,
  uniqueSolvers: 3,
  solverDistribution: { onePuzzle: 1, twoToNine: 1, tenPlus: 1 },
  topSolvers: ['Ada', 'Lin', 'Morgan'].map((name, index) => ({
    name, puzzlesSolved: 12 - index, firstAppearance: 'Jan 2026', lastSolve: 'Aug 2026',
  })),
  longestStreaks: ['Lin', 'Morgan', 'Ada'].map((name, index) => ({
    name, streakLength: 6 - index, startDate: 'Jan 2026', endDate: 'Jun 2026',
  })),
  risingStars: ['Ada', 'Morgan'].map((name, index) => ({
    name, puzzlesSolved: 6 - index, solveRate: 1.5 - index / 2, firstAppearance: 'May 2026',
  })),
  monthlyParticipation: [],
  solversGrowth: [],
  mostSolvedPuzzles: [],
};

function renderStage(compact: boolean, short = false) {
  return render(
    <DashboardStage data={data} rawPuzzles={null} puzzlesLoading={false}
      compact={compact} short={short} onSolverClick={jest.fn()} />
  );
}

function insightTab(name: string) {
  return within(screen.getByRole('tablist', { name: 'Dashboard insights' })).getByRole('tab', { name });
}

describe('DashboardStage', () => {
  test('pairs each solver category with its color, range, and count', () => {
    render(
      <DashboardStage data={{ ...data, solverDistribution: { onePuzzle: 1234, twoToNine: 567, tenPlus: 89 } }}
        rawPuzzles={null} puzzlesLoading={false} compact short={false} onSolverClick={jest.fn()} />
    );
    const groups = within(screen.getByRole('list', { name: 'Solver groups' })).getAllByRole('listitem');
    expect(groups).toHaveLength(3);
    [
      { category: 'One-timers', range: '1 puzzle', count: '1,234', color: 'one-puzzle' },
      { category: 'Enthusiasts', range: '2–9 puzzles', count: '567', color: 'two-nine' },
      { category: 'Masters', range: '10+ puzzles', count: '89', color: 'ten-plus' },
    ].forEach((group, index) => {
      expect(within(groups[index]).getByText(group.category)).toBeVisible();
      expect(within(groups[index]).getByText(group.range)).toBeVisible();
      expect(within(groups[index]).getByText(group.count)).toBeVisible();
      expect(groups[index].querySelector('.legend-color')).toHaveClass(group.color);
    });
  });

  test('keeps all fallback puzzles until raw data supplies the complete ranking with unique solver counts', async () => {
    const fallback = Array.from({ length: 24 }, (_, index) => ({
      id: `fallback-${index}`, name: `Fallback puzzle ${index + 1}`, solvers: 24 - index, solution_url: '',
    }));
    const stageData = { ...data, mostSolvedPuzzles: fallback };
    const props = { data: stageData, compact: true, short: false, onSolverClick: jest.fn() };
    const view = render(<DashboardStage {...props} rawPuzzles={null} puzzlesLoading />);
    await act(async () => { fireEvent.click(insightTab('Puzzles')); });

    expect(within(await screen.findByRole('list', { name: 'Puzzle data' })).getAllByRole('listitem')).toHaveLength(24);
    expect(screen.getByText('Fallback puzzle 24')).toBeVisible();

    const rawPuzzles: Puzzle[] = Array.from({ length: 151 }, (_, index) => ({
      date_text: `January ${1876 + index}`,
      name: `Raw puzzle ${index + 1}`,
      solution_url: '',
      solvers: index === 0 ? Array(200).fill('Repeated solver')
        : Array.from({ length: index + 1 }, (_, solver) => `Solver ${solver}`),
    }));
    view.rerender(<DashboardStage {...props} rawPuzzles={rawPuzzles} puzzlesLoading={false} />);

    const puzzles = within(screen.getByRole('list', { name: 'Puzzle data' })).getAllByRole('listitem');
    expect(puzzles).toHaveLength(151);
    expect(puzzles[0]).toHaveTextContent('Raw puzzle 151');
    expect(puzzles[0]).toHaveTextContent('151 solvers');
    expect(puzzles[0]).toHaveAttribute('data-puzzle-id', '2026-1');
    expect(puzzles[150]).toHaveTextContent('Raw puzzle 1');
    expect(puzzles[150]).toHaveTextContent('1 solvers');
    expect(screen.queryByText('Fallback puzzle 1')).not.toBeInTheDocument();
  });

  test('wide layout exposes the rankings and all three supporting sections', async () => {
    renderStage(false);

    expect(within(screen.getByRole('region', { name: 'Puzzle rankings' })).getByRole('table')).toBeVisible();
    expect(screen.getByRole('region', { name: 'Solvers by puzzles solved' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Solver trends' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Most solved puzzles' })).toBeVisible();
    expect(await screen.findByText('Growth chart loaded')).toBeVisible();
    expect(await screen.findByText('Puzzle table loaded')).toBeVisible();
    expect(screen.queryByRole('tablist', { name: 'Dashboard insights' })).not.toBeInTheDocument();
  });

  test('compact layout switches one insight at a time while preserving the ranking search', async () => {
    renderStage(true);
    const search = screen.getByRole('searchbox', { name: /Search solvers/ });
    fireEvent.change(search, { target: { value: '  mORGAN  ' } });

    for (const name of ['Solvers', 'Trends', 'Puzzles', 'Solvers']) {
      await act(async () => { fireEvent.click(insightTab(name)); });

      expect(screen.getByRole('tabpanel', { name })).toBeVisible();
      for (const other of ['Solvers', 'Trends', 'Puzzles'].filter((label) => label !== name)) {
        expect(screen.queryByRole('tabpanel', { name: other })).not.toBeInTheDocument();
      }
      expect(search).toBeVisible();
      expect(search).toHaveValue('  mORGAN  ');
      const ranking = within(screen.getByRole('region', { name: 'Puzzle rankings' }));
      expect(ranking.getByRole('button', { name: 'Open profile for Morgan' })).toBeVisible();
      expect(within(ranking.getByRole('table')).getAllByRole('button')).toHaveLength(1);
    }
  });

  test('short layout restores the selected ranking and its search after visiting insights', async () => {
    renderStage(true, true);
    fireEvent.click(screen.getByRole('tab', { name: 'Rising stars' }));
    const search = screen.getByRole('searchbox', { name: /Search solvers/ });
    fireEvent.change(search, { target: { value: 'Morgan' } });

    for (const name of ['Solvers', 'Trends', 'Puzzles']) {
      await act(async () => { fireEvent.click(insightTab(name)); });
      expect(screen.getByRole('tabpanel', { name })).toBeVisible();
      expect(screen.queryByRole('tabpanel', { name: 'Rankings' })).not.toBeInTheDocument();
      expect(screen.queryByRole('searchbox', { name: /Search solvers/ })).not.toBeInTheDocument();
    }

    fireEvent.click(insightTab('Rankings'));
    expect(screen.getByRole('tabpanel', { name: 'Rankings' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Rising stars', selected: true })).toBeVisible();
    expect(search).toBeVisible();
    expect(search).toHaveValue('Morgan');
    const ranking = within(screen.getByRole('table', { name: /Rising stars/ }));
    expect(ranking.getByRole('button', { name: 'Open profile for Morgan' })).toBeVisible();
    expect(ranking.getByLabelText('Rank 2')).toBeVisible();
  });

  test.each([false, true])('insight keyboard navigation moves selection and focus (short=%s)', async (short) => {
    renderStage(true, short);
    const switcher = within(screen.getByRole('tablist', { name: 'Dashboard insights' }));
    const tabs = switcher.getAllByRole('tab');
    tabs[0].focus();
    const last = tabs.length - 1;
    const movements: Array<[string, number]> = [
      ['ArrowLeft', last], ['ArrowRight', 0], ['End', last],
      ['Home', 0], ['ArrowRight', 1], ['ArrowLeft', 0],
    ];

    for (const [key, selectedIndex] of movements) {
      await act(async () => { fireEvent.keyDown(document.activeElement!, { key }); });

      expect(tabs[selectedIndex]).toHaveFocus();
      expect(switcher.getAllByRole('tab', { selected: true })).toEqual([tabs[selectedIndex]]);
      tabs.forEach((tab, index) => expect(tab.tabIndex).toBe(index === selectedIndex ? 0 : -1));
      expect(screen.getByRole('tabpanel', { name: tabs[selectedIndex].textContent! })).toBeVisible();
    }
  });
});
