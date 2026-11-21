import React, { useMemo, useRef, useState } from 'react';
import {
  Combobox, ComboboxClear, ComboboxContent, ComboboxInput, ComboboxItem,
  ComboboxLabel, ComboboxList,
} from '@ui-sdk/react/combobox';
import { useShortcut } from '@ui-sdk/react/shortcuts';
import { useSavedSolver } from '../hooks/useSavedSolver';
import { Icon } from './shared';

function rankingChange(value) {
  if (value === null) return 'New this month';
  if (value === undefined) return '';
  if (value === 0) return 'No change since last month';
  return `${value > 0 ? 'Up' : 'Down'} ${Math.abs(value)} since last month`;
}

export default function SolverSearch({ solvers, value, onChange, onSelect }) {
  const input = useRef(null);
  const [open, setOpen] = useState(false);
  const saved = useSavedSolver();
  const index = useMemo(() => solvers.map((entry, i) => ({
    name: entry.name, key: entry.name.toLocaleLowerCase(), rank: i + 1, change: entry.rankChange,
  })), [solvers]);
  const query = value.trim().toLocaleLowerCase();
  const options = useMemo(() => {
    if (!query) return saved ? index.filter(item => item.name === saved) : [];
    const exact = [], starts = [], contains = [];
    for (const item of index) {
      if (item.key === query) exact.push(item);
      else if (item.key.startsWith(query) && starts.length < 6) starts.push(item);
      else if (item.key.includes(query) && contains.length < 6) contains.push(item);
    }
    return [...exact, ...starts, ...contains].slice(0, 6);
  }, [index, query, saved]);
  useShortcut('/', () => input.current?.focus(), {
    description: 'Find a solver',
    when: () => !document.querySelector('[aria-modal="true"]:not([hidden]), dialog[open]'),
  });

  return <div role="search" className="lab-search lab-search--compact">
    <Combobox aria-label="Find a solver" value={null} query={value} filter={false} autoHighlight
      open={open && options.length > 0} onOpenChange={setOpen}
      onQueryChange={(next, details) => {
        if (['input-change', 'clear-press', 'imperative'].includes(details.reason)) {
          onChange(next);
          setOpen(true);
        }
      }}
      onValueChange={(name) => { if (name) { setOpen(false); onSelect(name); } }}>
      <ComboboxLabel>Find a solver</ComboboxLabel>
      <div className="lab-search-field">
        <Icon name="search" />
        <ComboboxInput ref={input} placeholder="Search by name…" aria-keyshortcuts="/" autoComplete="off"
          spellCheck={false} data-1p-ignore="true" onFocus={() => setOpen(true)} onClick={() => setOpen(true)} />
        {value && <ComboboxClear aria-label="Clear search"><Icon name="close" size={17} /></ComboboxClear>}
        {!value && <kbd aria-hidden="true">/</kbd>}
      </div>
      <ComboboxContent className="solver-search-options" align="start" sideOffset={5}>
        <div className="solver-search-caption">{query ? 'All solvers' : 'My profile'}</div>
        <ComboboxList>
          {options.map(item => <ComboboxItem key={item.name} value={item.name} label={item.name}>
            <span className="solver-option-name">{item.name}</span>
            <span className="solver-option-rank">Overall #{item.rank.toLocaleString('en-US')}</span>
            {!query && <small>{rankingChange(item.change)}</small>}
          </ComboboxItem>)}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  </div>;
}
