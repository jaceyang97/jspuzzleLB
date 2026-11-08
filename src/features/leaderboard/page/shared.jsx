import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Tooltip from '../../../components/Tooltip';
import { useRawPuzzleData } from '../hooks/useRawPuzzleData';
import { computeAveragePercentile, findSolverPlacement, formatDate } from '../../../utils/leaderboardUtils';
import { solverInitial } from '../../../utils/solverInitial';

export const scopes = [
  { id: 'top', label: 'Top solvers', description: 'All-time standings, ranked by total puzzles solved.' },
  { id: 'streaks', label: 'Longest streaks', description: 'The longest run of consecutive months with a solve.' },
  { id: 'rising', label: 'Rising stars', description: 'New solvers, ranked by solve rate across eligible published puzzles.' },
];

export function Icon({ name, size = 20 }) {
  const paths = {
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></>,
    moon: <path d="M20.5 13A8.6 8.6 0 0 1 11 3.5 8.6 8.6 0 1 0 20.5 13Z" />,
    chevron: <path d="m9 5 7 7-7 7" />,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}


export function SearchField({ value, onChange, compact = false, onSubmit }) {
  const input = useRef(null);
  useEffect(() => {
    const focusSearch = (event) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable || event.target.closest('dialog[open]')) return;
      event.preventDefault(); input.current?.focus();
    };
    document.addEventListener('keydown', focusSearch);
    return () => document.removeEventListener('keydown', focusSearch);
  }, []);
  return <form className={`lab-search${compact ? ' lab-search--compact' : ''}`} role="search" onSubmit={(event) => { event.preventDefault(); onSubmit?.(); }}>
    <label htmlFor="solver-search">Find a solver</label>
    <div className="lab-search-field"><Icon name="search" /><input ref={input} id="solver-search" type="search" placeholder="Search by name…" value={value} onChange={(event) => onChange(event.target.value)} autoComplete="off" spellCheck="false" data-1p-ignore="true" />
      {value ? <button type="button" aria-label="Clear search" onClick={() => { onChange(''); input.current?.focus(); }}><Icon name="close" size={17} /></button> : <kbd aria-hidden="true">/</kbd>}
    </div>
  </form>;
}


export function useRankings(data, scope, search) {
  const all = useMemo(() => {
    if (scope === 'top') return data.topSolvers.map((item, index) => ({ ...item, rank: index + 1, score: item.puzzlesSolved, unit: 'puzzles', extra: item.lastSolve }));
    if (scope === 'streaks') return data.longestStreaks.map((item, index) => ({ ...item, rank: index + 1, score: item.streakLength, unit: 'months', extra: item.endDate }));
    return data.risingStars.map((item) => ({ ...item, score: `${Number((item.solveRate * 100).toFixed(1))}%`, unit: 'solve rate', extra: item.firstAppearance }));
  }, [data, scope]);
  const query = search.trim().toLocaleLowerCase();
  const filtered = useMemo(() => all.filter((item) => item.name.toLocaleLowerCase().includes(query)), [all, query]);
  return { all, filtered, count: filtered.length };
}


export function EmptyState({ search, onClear }) {
  return <div className="lab-empty"><Icon name="search" size={28} /><h3>No matching solvers</h3><p>We couldn’t find “{search.trim()}”. Try a shorter name or a different spelling.</p><button type="button" className="lab-button" onClick={onClear}>Clear search</button></div>;
}

export function Pagination({ page, pages, setPage, count, pageSize = 40, busy = false }) {
  return <nav className="lab-pagination" aria-label="Results pages"><span role="status" aria-atomic="true">{count ? `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, count)} of ${count.toLocaleString()}` : '0 results'}</span><div><button type="button" disabled={busy || page === 0} onClick={() => setPage(page - 1)} aria-label="Previous page">←</button><span>{page + 1} / {Math.max(pages, 1)}</span><button type="button" disabled={busy || page >= pages - 1} onClick={() => setPage(page + 1)} aria-label="Next page">→</button></div></nav>;
}

function PlacementHelp() {
  return <Tooltip content="Position in Jane Street’s published solver list, in submission order." className="lab-placement-help" surfaceClassName="puzzle-info-tooltip" openDelay={0}>
    <button type="button" className="lab-placement-trigger" aria-label="About placement"><span className="panel-info-marker" aria-hidden="true">i</span></button>
  </Tooltip>;
}

function HistoryRows({ placements, measure = false }) {
  return placements.map((item) => <tr key={`${item.puzzle.date_text}-${item.puzzle.name}`}><td>{formatDate(item.puzzle.date_text)}</td><td>{measure ? <span className="lab-history-link">{item.puzzle.name}</span> : <a className="lab-history-link" href={item.puzzle.solution_url} target="_blank" rel="noreferrer">{item.puzzle.name}</a>}</td><td className="lab-number">{item.rank.toLocaleString()} <span>/ {item.total.toLocaleString()}</span></td></tr>);
}

export function ProfileContent({ data, name, onClose }) {
  const { puzzles, loading, error } = useRawPuzzleData(!!name);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(1);
  const history = useRef(null);
  const measurement = useRef(null);
  const rank = useMemo(() => data.topSolvers.findIndex((item) => item.name === name) + 1, [data, name]);
  const standing = rank ? data.topSolvers[rank - 1] : null;
  const placements = useMemo(() => (puzzles || []).map((puzzle) => findSolverPlacement(name, puzzle)).filter(Boolean).sort((a, b) => new Date(b.puzzle.date_text) - new Date(a.puzzle.date_text)), [puzzles, name]);
  const percentile = useMemo(() => computeAveragePercentile(placements), [placements]);
  useLayoutEffect(() => {
    let active = true;
    const resize = () => {
      if (!active) return;
      const available = history.current.getBoundingClientRect().height;
      if (!available) return;
      const table = measurement.current;
      const rowHeight = Math.max(45, ...Array.from(table.tBodies[0].rows, (row) => row.getBoundingClientRect().height));
      const next = Math.max(1, Math.min(10, Math.floor((available - table.tHead.getBoundingClientRect().height) / rowHeight)));
      if (pageSize !== next) { setPageSize(next); setPage(0); }
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(history.current);
    observer.observe(measurement.current);
    window.addEventListener('resize', resize);
    document.fonts?.ready.then(resize);
    return () => { active = false; observer.disconnect(); window.removeEventListener('resize', resize); };
  }, [placements, pageSize]);
  const count = loading ? standing?.puzzlesSolved ?? 0 : placements.length;
  return <article className="lab-record" aria-label={`Record for ${name}`}>
    {onClose && <button type="button" className="lab-icon-button lab-profile-close" aria-label="Close profile" onClick={onClose}><Icon name="close" /></button>}
    <header className="lab-record-header"><span className="lab-eyebrow">Solver record</span>
      <div className="lab-record-identity">
        <svg className="lab-avatar" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false">
          <circle className="lab-avatar-felt" cx="32" cy="32" r="29" />
          <circle className="lab-avatar-stitch" cx="32" cy="32" r="25.5" />
          <text className="lab-avatar-initial" x="32" y="42.5" textAnchor="middle">{solverInitial(name)}</text>
        </svg>
        <h2>{name}</h2>
      </div>
      <dl className="lab-record-metrics"><div><dt>Overall rank</dt><dd className="lab-record-count">{rank ? `#${rank.toLocaleString()}` : '—'}</dd></div><div><dt>Puzzles solved</dt><dd className="lab-record-count">{standing?.puzzlesSolved ?? (loading ? '…' : placements.length)}</dd></div><div><dt>First recorded</dt><dd>{standing?.firstAppearance || (placements.length ? formatDate(placements[placements.length - 1].puzzle.date_text) : loading ? '…' : '—')}</dd></div><div><dt>Latest solve</dt><dd>{standing?.lastSolve || (placements.length ? formatDate(placements[0].puzzle.date_text) : '—')}</dd></div></dl>
      <p className="lab-record-footnote">Average submission percentile <span>{percentile ? `${percentile.value.toFixed(1)}%` : loading ? '…' : '—'}</span>. Higher means earlier in the published solver list.</p>
    </header>
    <section className="lab-record-history"><div className="lab-record-history-title"><h3>Solved puzzles</h3></div>
      <div ref={history} className="lab-history-page">
        <div className="lab-history-measure" aria-hidden="true"><table ref={measurement} className="lab-history-table"><thead><tr><th>Month</th><th>Puzzle</th><th className="lab-number"><span className="lab-placement-heading">Placement<span className="lab-placement-size" /></span></th></tr></thead><tbody><HistoryRows placements={placements} measure /></tbody></table></div>
        {loading ? <p className="lab-record-message" role="status">Loading puzzle history…</p> : error ? <p className="lab-record-message" role="alert">Puzzle history couldn’t load. Close and reopen this record to try again.</p> : !placements.length ? <p className="lab-record-message">No published puzzle history for this name.</p> : <table className="lab-history-table"><thead><tr><th scope="col">Month</th><th scope="col">Puzzle</th><th scope="col" className="lab-number"><span className="lab-placement-heading">Placement<PlacementHelp /></span></th></tr></thead><tbody><HistoryRows placements={placements.slice(page * pageSize, (page + 1) * pageSize)} /></tbody></table>}
      </div>
      <Pagination page={page} pages={Math.ceil(count / pageSize)} count={count} pageSize={pageSize} setPage={setPage} busy={loading || !!error} />
    </section>
  </article>;
}

export function ProfileDialog({ data, name, onClose }) {
  const dialog = useRef(null);
  useEffect(() => {
    if (name && !dialog.current.open) dialog.current.showModal();
    if (!name && dialog.current.open) dialog.current.close();
  }, [name]);
  return <dialog ref={dialog} className="lab-profile-dialog" aria-label={name ? `Profile for ${name}` : 'Solver profile'} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === dialog.current) { const rect = dialog.current.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    {name && <ProfileContent key={name} data={data} name={name} onClose={onClose} />}
  </dialog>;
}
