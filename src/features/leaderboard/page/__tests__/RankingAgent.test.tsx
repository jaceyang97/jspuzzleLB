import React, { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { createAgent } from '@ui-sdk/react/agent';
import { Tabs } from '@ui-sdk/react/tabs';
import { SelectedRankingTabs } from '../Rankings';
import { SearchField } from '../shared';

const agent = createAgent();

function RankingControls() {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<string | null>('top');
  return <>
    <Tabs aria-label="Rankings" value={scope} onValueChange={setScope}><SelectedRankingTabs /></Tabs>
    <SearchField value={query} onChange={setQuery} onSubmit={() => undefined} />
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
      { ref: 'Find a solver', action: 'setValue', args: ['Ada'] },
    ] });
    expect(result.error).toBeUndefined();
    expect(result.ok).toBe(true);
  });
  expect(screen.getByRole('tab', { name: 'Rising stars' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('searchbox')).toHaveValue('Ada');
});
