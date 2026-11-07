import React, { useId, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { scopes } from './shared';
import WinnerCrown from './WinnerCrown';

const columns = { top: 'Puzzles', streaks: 'Months', rising: 'Solve rate' };

export function SelectedRankingTabs({ scope, onChange }) {
  const indicatorId = useId();
  const tabs = useRef(null);
  const reduceMotion = useReducedMotion();
  const [keyboard, setKeyboard] = useState(false);
  return <motion.div layoutScroll ref={tabs} className="lab-tabs flow-ranking-tabs" role="tablist" aria-label="Rankings" aria-orientation="horizontal">
    {scopes.map((item, index) => <button key={item.id} id={`tab-${item.id}`} type="button" role="tab" aria-selected={scope === item.id} aria-controls="ranking-results" tabIndex={scope === item.id ? 0 : -1} onClick={() => { setKeyboard(false); onChange(item.id); }} onKeyDown={(event) => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % scopes.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + scopes.length) % scopes.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = scopes.length - 1;
      else return;
      event.preventDefault(); event.stopPropagation(); setKeyboard(true); onChange(scopes[next].id);
      const target = tabs.current.querySelectorAll('[role="tab"]')[next];
      target.focus(); target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }}><span>{item.label}</span>{scope === item.id && <motion.span className="flow-tab-indicator" layoutId={indicatorId} aria-hidden="true" transition={reduceMotion || keyboard ? { duration: 0 } : { type: 'spring', duration: .28, bounce: 0 }} />}</button>)}
  </motion.div>;
}

export function SelectedRankingHeader({ scope }) {
  return <div className="arena-columns flow-columns" aria-hidden="true"><span>Rank</span><span>Solver</span><span>{columns[scope]}</span></div>;
}

function rankChangeLabel(value) {
  if (value === undefined) return '';
  return value === null ? 'Not ranked last month' : value === 0 ? 'No change since last month' : `${value > 0 ? 'Up' : 'Down'} ${Math.abs(value)} since last month`;
}

function rankChangeText(value) {
  if (value === undefined) return '';
  return value === null ? 'New' : value === 0 ? '-' : value > 0 ? `+${value}` : String(value);
}

function RankChange({ value }) {
  if (value === undefined) return <span className="flow-rank-change" aria-hidden="true" />;
  const label = rankChangeLabel(value);
  const direction = value === null ? 'new' : value === 0 ? 'same' : value > 0 ? 'up' : 'down';
  return <span className="flow-rank-change" data-direction={direction} aria-label={label} title={label}>{rankChangeText(value)}</span>;
}

function RankingRow({ item, lastSeen, onSelect, index, total }) {
  const contextId = useId();
  const changeLabel = rankChangeLabel(item.rankChange);
  const unit = item.score === 1 ? item.unit.replace(/s$/, '') : item.unit;
  return <li className={`arena-row${item.rank <= 3 ? ' arena-row--leading' : ''}`} data-rank={item.rank} data-row-index={index} aria-posinset={index + 1} aria-setsize={total} style={{ '--flow-rank-digits': String(item.rank).length, '--flow-change-characters': rankChangeText(item.rankChange).length }}>
    <button type="button" className="arena-row-target" onClick={() => onSelect(item.name)} aria-label={`Open profile for ${item.name}, rank ${item.rank}, ${item.score} ${unit}${changeLabel ? `, ${changeLabel}` : ''}`} aria-describedby={contextId}>
      <span className="arena-rank flow-rank"><span className="flow-rank-value"><span className="flow-rank-number">{item.rank}</span><RankChange value={item.rankChange} /></span></span>
      <span className="arena-person">{item.rank === 1 && <WinnerCrown />}<span className="arena-name">{item.name}</span><span className="arena-record-context flow-record-context" id={contextId}>{lastSeen ? `Last seen ${lastSeen}` : 'Last seen unavailable'}</span></span>
      <span className="arena-score flow-score"><strong>{item.score}</strong></span>
    </button>
  </li>;
}

export function SelectedRankedRows({ rows, data, scope, onSelect, start, total }) {
  const seenDates = useMemo(() => new Map(data.topSolvers.map((item) => [item.name, item.lastSolve])), [data.topSolvers]);
  return <ol className="arena-rows" start={start} aria-label={scopes.find((item) => item.id === scope).label}>
    {rows.map((item, index) => <RankingRow key={item.name} item={item} lastSeen={seenDates.get(item.name)} onSelect={onSelect} index={start + index - 1} total={total} />)}
  </ol>;
}
