import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ParetoChart, { articleParetoData, ParetoDataset, ParetoRow } from '../ParetoChart';

const row = (configId: string, values: Partial<ParetoRow> = {}): ParetoRow => ({
  config_id: configId, window_months: 12, min_solves: 3, min_opportunities: 1,
  ranking: 'raw', future_quality: .33, average_post_debut_exposure: 4,
  annualized_unique_reach: 90, list_fill: 1, meets_95pct_fill: true,
  equivalent_config_ids: [configId], pareto_3d: false, ...values,
});

const rows = [
  row('chosen', { pareto_3d: true, equivalent_config_ids: ['chosen', 'same-choice'] }),
  row('short', { ranking: 'count', window_months: 6, average_post_debut_exposure: 2, future_quality: .30, annualized_unique_reach: 120 }),
  row('long', { ranking: 'wilson', window_months: 18, average_post_debut_exposure: 8, future_quality: .35, annualized_unique_reach: 60, pareto_3d: true }),
  row('underfilled', { ranking: 'beta', average_post_debut_exposure: 1, future_quality: .5, annualized_unique_reach: 30, list_fill: .8, meets_95pct_fill: false }),
];
const fixture: ParetoDataset = {
  metadata: { chosen_config_id: 'chosen', top_k: 20, fill_floor: .95, counts: { configurations: 5, distinct_behaviors: 4 } },
  rows,
};

test('starts with the full-list rules and exposes every tested rule without losing frontier membership', () => {
  const { container } = render(<ParetoChart />);
  const inspector = screen.getByRole('slider', { name: 'Inspect a ranking rule' });
  expect(screen.getByText('10,400 rules compared')).toBeInTheDocument();
  expect(container.querySelectorAll('[data-config-id]')).toHaveLength(2104);
  expect(inspector).toHaveAttribute('aria-valuemax', '2104');
  expect(screen.getByRole('region', { name: 'Selected rule details' })).toHaveTextContent('37.67%');
  expect(screen.getByRole('region', { name: 'Selected rule details' })).toHaveTextContent('18 months · 2 solves minimum · 3 published puzzles minimum');
  const markedIds = Array.from(container.querySelectorAll('[data-frontier-id]')).map((point) => point.getAttribute('data-frontier-id'));
  expect(markedIds).toHaveLength(97);
  expect(markedIds).toEqual(articleParetoData.rows.filter((point) => point.pareto_3d && point.meets_95pct_fill).map((point) => point.config_id));
  expect(markedIds).toContain('W18-S2-E3-raw');
  expect(articleParetoData.rows.flatMap((point) => point.equivalent_config_ids)).toHaveLength(10400);

  fireEvent.click(screen.getByRole('button', { name: 'Names/year' }));
  expect(screen.getByRole('button', { name: 'Names/year' })).toHaveAttribute('aria-pressed', 'true');
  // Both projections highlight the full three-goal frontier.
  expect(screen.getByRole('region', { name: 'Selected rule details' })).toHaveTextContent('On the frontier across all three goals.');
  expect(container.querySelector('[data-frontier-id="W18-S2-E3-raw"]')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('checkbox', { name: 'Show rules with fewer names' }));
  expect(container.querySelectorAll('[data-config-id]')).toHaveLength(6079);
  expect(inspector).toHaveAttribute('aria-valuemax', '6079');
  expect(screen.getByRole('region', { name: 'Selected rule details' })).toHaveTextContent('37.67%');
});

test('keyboard navigation visits distinct results, preserves selection across axes, and can restore our choice', () => {
  render(<ParetoChart data={fixture} />);
  const inspector = screen.getByRole('slider');
  const details = screen.getByRole('region', { name: 'Selected rule details' });
  expect(inspector).toHaveAttribute('aria-valuenow', '2');
  expect(inspector).toHaveAttribute('aria-valuemax', '3');
  expect(within(details).getByText('2 rules give the same results')).toBeInTheDocument();
  fireEvent.keyDown(inspector, { key: 'ArrowRight' });
  expect(details).toHaveTextContent('Conservative solve rate');
  fireEvent.keyDown(inspector, { key: 'ArrowLeft' });
  expect(details).toHaveTextContent('12 months');
  fireEvent.keyDown(inspector, { key: 'Home' });
  expect(details).toHaveTextContent('Total solves');
  fireEvent.keyDown(inspector, { key: 'End' });
  expect(details).toHaveTextContent('Conservative solve rate');
  fireEvent.click(screen.getByRole('button', { name: 'Names/year' }));
  expect(details).toHaveTextContent('Conservative solve rate');
  expect(inspector).toHaveAttribute('aria-valuenow', '1');
  fireEvent.click(within(details).getByRole('button', { name: 'Our choice' }));
  expect(details).toHaveTextContent('12 months');
  expect(within(details).getByRole('button', { name: 'Our choice' })).toBeDisabled();
});

test('tap selects the nearest point and hiding a selected sparse rule returns to our choice', () => {
  const rect = jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    x: 0, y: 0, left: 0, top: 0, right: 600, bottom: 350, width: 600, height: 350, toJSON: () => ({}),
  });
  try {
    const { container } = render(<ParetoChart data={fixture} />);
    const inspector = screen.getByRole('slider');
    const point = container.querySelector('[data-config-id="long"]')!;
    fireEvent.click(inspector, { clientX: Number(point.getAttribute('cx')) - 2, clientY: Number(point.getAttribute('cy')) + 2 });
    expect(screen.getByRole('region', { name: 'Selected rule details' })).toHaveTextContent('Conservative solve rate');
    expect(inspector).toHaveFocus();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show rules with fewer names' }));
    fireEvent.keyDown(inspector, { key: 'Home' });
    expect(screen.getByRole('region', { name: 'Selected rule details' })).toHaveTextContent('Fills fewer than 95% of places');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show rules with fewer names' }));
    expect(screen.getByRole('region', { name: 'Selected rule details' })).toHaveTextContent('12 months');
    expect(screen.getByRole('region', { name: 'Selected rule details' })).not.toHaveTextContent('Fills fewer');
    expect(inspector).toHaveAttribute('aria-valuenow', '2');
  } finally { rect.mockRestore(); }
});
