import React, { useEffect, useLayoutEffect, useRef } from 'react';
import HelpTooltip from '../../../components/Tooltip';
import { MONTH_CODES } from '../../../utils/leaderboardUtils';
import useInfiniteWindow from './useInfiniteWindow';

export { default as TotalSolversCard } from './TotalSolversCard';
export { default as NewReturningCard } from './NewReturningCard';
export { default as ProjectInfoCard } from './ProjectInfoCard';

const number = (value) => value.toLocaleString('en-US');
const groups = [
  { key: 'onePuzzle', label: 'One-timers', range: '1 puzzle', color: 'var(--text-muted)' },
  { key: 'twoToNine', label: 'Enthusiasts', range: '2–9 puzzles', color: 'var(--text-secondary)' },
  { key: 'tenPlus', label: 'Masters', range: '10+ puzzles', color: 'var(--accent-primary)' },
];

export function CommunityCard({ data, id = 'community-data' }) {
  const distribution = data.solverDistribution;
  const total = distribution ? groups.reduce((sum, group) => sum + distribution[group.key], 0) : 0;
  const allocations = total > 0 ? groups.map((group) => {
    const share = distribution[group.key] / total * 60;
    return { ...group, cells: Math.floor(share), remainder: share % 1 };
  }) : [];
  const remaining = 60 - allocations.reduce((sum, group) => sum + group.cells, 0);
  [...allocations].sort((a, b) => b.remainder - a.remainder).slice(0, remaining).forEach((group) => { group.cells += 1; });
  const cells = allocations.flatMap((group) => Array.from({ length: group.cells }, () => group));
  return <section className="ladder-insight flow-card flow-community selected-sidebar-card" id={id} aria-label="Solvers by puzzles solved">
    {total > 0 ? <>
      <figure className="selected-population">
        <svg viewBox="0 0 118 48" preserveAspectRatio="xMidYMid meet" aria-hidden="true">{cells.map((group, index) => <rect key={index} data-group={group.key} x={index % 12 * 10} y={Math.floor(index / 12) * 10} width="8" height="8" rx=".35" fill={group.color}><title>{group.label}: {number(distribution[group.key])} solvers</title></rect>)}</svg>
        <figcaption>≈ {number(Math.round(total / 60))} solvers per square</figcaption>
      </figure>
      <ul className="selected-distribution-key" aria-label="Solver categories">{groups.map((group) => <li key={group.key}><span className="selected-distribution-swatch" style={{ background: group.color }} aria-hidden="true" /><span className="selected-distribution-label">{group.label}<span>{group.range}</span></span><span className="selected-distribution-count">{number(distribution[group.key])}</span></li>)}</ul>
    </> : <p className="flow-data-note">Solver distribution is unavailable.</p>}
  </section>;
}

function PuzzleCount({ puzzle }) {
  if (puzzle.solvers <= 0) return <HelpTooltip content="Solver list not published" rich tabIndex={0} aria-label="N/A: Solver list not published">N/A</HelpTooltip>;
  return <span className="selected-puzzle-count" aria-label={`${number(puzzle.solvers)} solvers`}>{number(puzzle.solvers)}</span>;
}

function PuzzleRow({ puzzle, index, total }) {
  const [year, month] = puzzle.id.split('-');
  const date = MONTH_CODES[Number(month) - 1] ? `${MONTH_CODES[Number(month) - 1]} ${year}` : 'N/A';
  const href = puzzle.solution_url ? puzzle.solution_url.replace('-solution', '-index') : 'https://www.janestreet.com/puzzles/current-puzzle/';
  return <li className="selected-puzzle-entry" data-row-index={index} aria-posinset={index + 1} aria-setsize={total}>
    <div className="selected-puzzle-name"><a href={href} target="_blank" rel="noreferrer" title={puzzle.name}>{puzzle.name}</a></div>
    <span className="selected-puzzle-date">{date}</span>
    <PuzzleCount puzzle={puzzle} />
  </li>;
}

export function PuzzlesCard({ rows, error, totalPuzzles, totalMonths }) {
  const windowed = useInfiniteWindow({ count: rows.length, estimate: 44, batch: 20, fallbackHeight: 420 });
  const card = useRef(null);
  const idle = useRef(null);
  useEffect(() => () => window.clearTimeout(idle.current), []);
  useLayoutEffect(() => {
    const viewport = windowed.viewport.current;
    const update = () => card.current.style.setProperty('--puzzle-scrollbar-gap', `${viewport.offsetWidth - viewport.clientWidth}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [windowed.viewport]);
  const scroll = () => {
    windowed.onScroll();
    const element = windowed.viewport.current;
    if (!element) return;
    element.dataset.scrolling = 'true';
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => delete element.dataset.scrolling, 650);
  };
  return <section ref={card} className="ladder-insight flow-card flow-puzzles selected-sidebar-card" aria-label="Most solved puzzles">
    <header className="selected-puzzles-header"><h2>Most solved puzzles</h2></header>
    {error && <p className="flow-data-note" role="status">Showing summary data; full puzzle history could not load.</p>}
    <div className="selected-puzzle-table">
      <div className="selected-puzzle-columns" aria-hidden="true"><span>Puzzle</span><span>Month</span><span>Solvers</span></div>
      <div className="central-puzzle-viewport selected-puzzle-viewport" ref={windowed.viewport} onScroll={scroll} tabIndex={0} data-loaded={windowed.loaded} data-total={rows.length} role="region" aria-label="Puzzles ranked by solver count. Scroll to see all puzzles.">
        <div style={{ paddingTop: windowed.before, paddingBottom: windowed.after }}><ol className="selected-puzzle-list" start={windowed.first + 1} aria-label="Most solved puzzles">{rows.slice(windowed.first, windowed.end).map((puzzle, index) => <PuzzleRow key={puzzle.id} puzzle={puzzle} index={windowed.first + index} total={rows.length} />)}</ol></div>
        {!rows.length && <p className="flow-data-note">No puzzle data available.</p>}
      </div>
    </div>
    <footer className="selected-puzzles-summary" aria-label="Puzzle archive totals"><div><strong>{number(totalPuzzles)}</strong><span>puzzles</span></div><div><strong>{totalMonths == null ? 'N/A' : number(totalMonths)}</strong><span>months</span></div></footer>
  </section>;
}
