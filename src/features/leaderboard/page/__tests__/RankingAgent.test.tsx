import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createAgent } from '@ui-sdk/react/agent';
import { Tabs } from '@ui-sdk/react/tabs';
import { SelectedRankingTabs } from '../Rankings';
import SolverSearch from '../SolverSearch';

const agent = createAgent();

const solvers = [{ name: 'Ada Lovelace' }, { name: 'Grace Hopper' }, { name: 'Ada' }];

function RankingControls({ onSelect = (_name: string) => {} }) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<string | null>('top');
  return <>
    <Tabs aria-label="Rankings" value={scope} onValueChange={setScope}><SelectedRankingTabs /></Tabs>
    <SolverSearch solvers={solvers} value={query} onChange={setQuery} onSelect={onSelect} />
  </>;
}

test('an agent can find the ranking choices and update the same controls as a reader', async () => {
  render(<RankingControls />);
  const controls = agent.snapshot();
  const rankings = controls.find(control => control.label === 'Rankings');
  const rising = rankings?.items?.find(item => item.label === 'Rising stars');
  expect(rising).toBeDefined();
  expect(controls.some(control => control.label === 'Find a solver')).toBe(true);
  await act(async () => {
    const result = await agent.act({ steps: [
      { ref: 'Rankings', action: 'setValue', args: [rising!.value] },
      { ref: 'Find a solver', action: 'setQuery', args: ['Ada'] },
    ] });
    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
  });
  expect(screen.getByRole('tab', { name: 'Rising stars' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('combobox', { name: 'Find a solver' })).toHaveValue('Ada');
});

test('an exact global match takes precedence over a higher-ranked prefix and Escape preserves the filter', async () => {
  const onSelect = jest.fn();
  render(<RankingControls onSelect={onSelect} />);
  const field = screen.getByRole('combobox', { name: 'Find a solver' });
  fireEvent.click(screen.getByRole('tab', { name: 'Rising stars' }));
  fireEvent.change(field, { target: { value: 'Ada' } });
  const [first, second] = await screen.findAllByRole('option');
  expect(first).toHaveTextContent('AdaOverall #3');
  expect(second).toHaveTextContent('Ada LovelaceOverall #1');
  fireEvent.keyDown(field, { key: 'Escape' });
  expect(field).toHaveValue('Ada');
  expect(onSelect).not.toHaveBeenCalled();
  fireEvent.click(field);
  fireEvent.click((await screen.findAllByRole('option'))[1]);
  expect(onSelect).toHaveBeenCalledWith('Ada Lovelace');
});
