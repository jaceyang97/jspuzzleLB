import React, { useEffect, useRef, useState } from 'react';
import { SelectedRankedRows, SelectedRankingHeader, SelectedRankingTabs } from './Rankings';
import { EmptyState, Icon, SearchField, useRankings } from './shared';
import { CommunityCard, TotalSolversCard, NewReturningCard, ProjectInfoCard, PuzzlesCard } from './Insights';
import useRankedPuzzles from './useRankedPuzzles';
import usePageWindow from './usePageWindow';
import useSidebarGrid from './useSidebarGrid';
import LeaderboardHeader from './LeaderboardHeader';
import useElevator from './useElevator';
import ElevatorMessages from './ElevatorMessages';
import ElevatorUpIcon from './ElevatorUpIcon';
import { preloadElevatorAudio } from './elevatorSound';

function BackToTop({ onClick, riding, departed }) {
  const visibleAt = (wasVisible = false) => window.scrollY > window.innerHeight * (wasVisible ? 6 : 8);
  const [visible, setVisible] = useState(visibleAt);
  const current = useRef(visible);
  useEffect(() => {
    if (visible && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Speculative loading may fail; clicking retries the request.
      preloadElevatorAudio().catch(() => {});
    }
  }, [visible]);
  useEffect(() => {
    const update = () => {
      const next = visibleAt(current.current);
      if (next !== current.current) { current.current = next; setVisible(next); }
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, []);
  const shown = visible && !departed;
  return <button type="button" className="flow-back-top" data-visible={shown ? '' : undefined} data-elevating={departed ? '' : undefined} disabled={riding} aria-label="Back to top" title={riding ? 'Going up…' : 'Back to top'} aria-hidden={!shown} tabIndex={shown && !riding ? 0 : -1} onClick={onClick}><ElevatorUpIcon /></button>;
}

function PageStandings({ data, scope, search, setSearch, onSelect, onBackToTop }) {
  const { filtered } = useRankings(data, scope, search);
  const { riding, departed, elevate, message, adjustForLayoutShift } = useElevator(onBackToTop);
  const windowed = usePageWindow({ count: filtered.length, onAnchorShift: adjustForLayoutShift });
  return <section id="ranking-results" role="tabpanel" aria-labelledby={`tab-${scope}`}>
    <div className="flow-list" ref={windowed.list} data-loaded={windowed.loaded} data-total={filtered.length}>
      {filtered.length ? <div className="flow-window" style={{ paddingTop: windowed.before, paddingBottom: windowed.after }}><SelectedRankedRows rows={filtered.slice(windowed.first, windowed.end)} data={data} scope={scope} onSelect={onSelect} start={windowed.first + 1} total={filtered.length} /></div> : <EmptyState search={search} onClear={() => setSearch('')} />}
    </div>
    {!!filtered.length && <div className="flow-list-ending">
      <p className="flow-list-end" role="status">{windowed.loaded < filtered.length ? 'More solvers as you scroll ↓' : 'End of this ranking'}</p>
    </div>}
    <BackToTop onClick={elevate} riding={riding} departed={departed} />
    <ElevatorMessages message={message} />
    <span className="lab-visually-hidden" role="status">{riding ? 'Going up. Press Escape to stop.' : ''}</span>
  </section>;
}

function StatsDialog({ open, onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const element = dialog.current;
    if (open) {
      if (!element.open) { element.showModal(); element.getBoundingClientRect(); }
      element.dataset.state = 'open';
      return undefined;
    }
    if (!element.open) return undefined;
    element.dataset.state = 'closing';
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { element.close(); return undefined; }
    const timer = window.setTimeout(() => element.close(), 140);
    return () => window.clearTimeout(timer);
  }, [open]);
  return <dialog ref={dialog} className="flow-stats-dialog" aria-label="Community and puzzle statistics" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => {
    if (event.target !== dialog.current) return;
    const rect = dialog.current.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
  }}><header><h2>Community &amp; puzzles</h2><button type="button" aria-label="Close statistics" onClick={onClose}><Icon name="close" /></button></header>{children}</dialog>;
}

export default function LeaderboardPage(props) {
  const { data, scope, setScope, search, setSearch, onSelect, Header = LeaderboardHeader } = props;
  const { filtered } = useRankings(data, scope, search);
  const { puzzles, loading, error, rankedPuzzles, totalMonths } = useRankedPuzzles(data);
  const primary = useRef(null);
  const tools = useRef(null);
  const layout = useSidebarGrid();
  const [statsOpen, setStatsOpen] = useState(false);
  const [statsVisited, setStatsVisited] = useState(false);
  const showStats = () => { setStatsVisited(true); setStatsOpen(true); };
  const resetResults = () => {
    const start = primary.current?.getBoundingClientRect().top + window.scrollY;
    const top = Math.max(0, start - (tools.current?.getBoundingClientRect().height || 0));
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'auto' });
  };
  const changeSearch = (value) => { resetResults(); setSearch(value); };
  const changeScope = (value) => { resetResults(); setScope(value); };
  const onCommunity = (event) => {
    if (layout.current?.dataset.railLayout === 'dialog' || window.matchMedia('(max-width: 1120px), (max-height: 700px)').matches) { event.preventDefault(); showStats(); }
  };
  return <div className="lab ladder arena arena--monument central-flow">
    <a href="#main-rankings" className="lab-skip">Skip to rankings</a>
    <div className="arena-page"><Header {...props} onSelect={(name) => onSelect(name, 'new_today')} onCommunity={onCommunity} />
      <div className="flow-layout" ref={layout}>
        <div className="flow-tools-row" ref={tools}><div className="flow-scope"><SelectedRankingTabs scope={scope} onChange={changeScope} /></div><SearchField compact value={search} onChange={changeSearch} onSubmit={() => filtered[0] && onSelect(filtered[0].name)} /><button type="button" className="flow-stats-button" onClick={showStats} aria-haspopup="dialog">Stats</button></div>
        <aside className="flow-rail flow-rail--left ladder-insights" aria-label="Solver trends and categories"><TotalSolversCard data={data} /><NewReturningCard puzzles={puzzles} loading={loading} /><CommunityCard data={data} /></aside>
        <main className="flow-primary" id="main-rankings" data-ranking={scope} ref={primary} tabIndex={-1}>
          <p className="lab-visually-hidden" role="status" aria-live="polite" aria-atomic="true">{search.trim() ? `${filtered.length.toLocaleString('en-US')} ${filtered.length === 1 ? 'match' : 'matches'} for ${search.trim()}` : ''}</p>
          <div className="flow-toolbar"><SelectedRankingHeader scope={scope} /></div>
          <PageStandings {...props} setSearch={changeSearch} onBackToTop={() => { if (window.scrollY) window.scrollTo({ top: 0, behavior: 'auto' }); primary.current?.focus({ preventScroll: true }); }} key={`${scope}-${search}`} />
        </main>
        <aside className="flow-rail flow-rail--right ladder-insights" aria-label="Puzzle rankings"><PuzzlesCard rows={rankedPuzzles} error={error} totalPuzzles={data.totalPuzzles} totalMonths={totalMonths} /><ProjectInfoCard /></aside>
      </div>
    </div>
    <StatsDialog open={statsOpen} onClose={() => setStatsOpen(false)}>{statsVisited && <div className="flow-dialog-panels ladder-insights"><TotalSolversCard data={data} /><NewReturningCard puzzles={puzzles} loading={loading} /><CommunityCard data={data} id="mobile-community-data" /><PuzzlesCard rows={rankedPuzzles} error={error} totalPuzzles={data.totalPuzzles} totalMonths={totalMonths} /><ProjectInfoCard /></div>}</StatsDialog>
  </div>;
}
