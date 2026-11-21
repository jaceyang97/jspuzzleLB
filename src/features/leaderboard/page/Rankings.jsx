import React, { useId, useMemo } from 'react';
import { Button } from '@ui-sdk/react/button';
import { TabsIndicator, TabsList, TabsTab } from '@ui-sdk/react/tabs';
import { scopes } from './shared';
import WinnerCrown from './WinnerCrown';

const columns = { top: 'Puzzles', streaks: 'Months', rising: 'Solve rate' };

export function SelectedRankingTabs() {
  return <TabsList className="lab-tabs flow-ranking-tabs" aria-label="Rankings">
    {scopes.map(({ id, label }) => <TabsTab key={id} value={id}><span>{label}</span></TabsTab>)}
    <TabsIndicator className="flow-tab-indicator" />
  </TabsList>;
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
  return value === null ? 'New' : value === 0 ? '–' : value > 0 ? `+${value}` : `−${Math.abs(value)}`;
}

function RankChange({ value }) {
  if (value === undefined) return <span className="flow-rank-change" aria-hidden="true" />;
  const label = rankChangeLabel(value);
  const direction = value === null ? 'new' : value === 0 ? 'same' : value > 0 ? 'up' : 'down';
  return <span className="flow-rank-change" data-direction={direction} aria-label={label} title={label}>{rankChangeText(value)}</span>;
}

// Lets CSS shrink a large name until its longest word fits on one line.
function longestWordLength(name) {
  return Math.max(1, ...name.split(/\s+/).map((word) => Array.from(word).length));
}

function RankingRow({ item, lastSeen, onSelect, index, total, fitWord }) {
  const contextId = useId();
  const changeLabel = rankChangeLabel(item.rankChange);
  const unit = item.score === 1 ? item.unit.replace(/s$/, '') : item.unit;
  return <li className={`arena-row${item.rank <= 3 ? ' arena-row--leading' : ''}`} data-rank={item.rank} data-row-index={index} aria-posinset={index + 1} aria-setsize={total} style={{ '--flow-rank-digits': String(item.rank).length, '--flow-change-characters': rankChangeText(item.rankChange).length, '--name-longest-word': fitWord, '--name-own-word': longestWordLength(item.name) }}>
    <Button className="arena-row-target" onClick={() => onSelect(item.name)} aria-label={`Open profile for ${item.name}, rank ${item.rank}, ${item.score} ${unit}${changeLabel ? `, ${changeLabel}` : ''}`} aria-describedby={contextId}>
      <span className="arena-rank flow-rank"><span className="flow-rank-value"><span className="flow-rank-number">{item.rank}</span><RankChange value={item.rankChange} /></span></span>
      <span className="arena-person">{item.rank === 1 && <WinnerCrown />}<span className="arena-name">{item.name}</span><span className="arena-record-context flow-record-context" id={contextId}>{lastSeen ? `Last seen ${lastSeen}` : 'Last seen unavailable'}</span></span>
      <span className="arena-score flow-score"><strong>{item.score}</strong></span>
    </Button>
  </li>;
}

export function SelectedRankedRows({ rows, data, scope, onSelect, start, total }) {
  const seenDates = useMemo(() => new Map(data.topSolvers.map((item) => [item.name, item.lastSolve])), [data.topSolvers]);
  // Podium rows fit to the longest word so far, so a lower rank never renders larger than the one above it.
  const fitWords = useMemo(() => { let podium = 1; return rows.map((item) => { const own = longestWordLength(item.name); if (item.rank > 3) return own; podium = Math.max(podium, own); return podium; }); }, [rows]);
  return <ol className="arena-rows" start={start} aria-label={scopes.find((item) => item.id === scope).label}>
    {rows.map((item, index) => <RankingRow key={item.name} item={item} lastSeen={seenDates.get(item.name)} onSelect={onSelect} index={start + index - 1} total={total} fitWord={fitWords[index]} />)}
  </ol>;
}
