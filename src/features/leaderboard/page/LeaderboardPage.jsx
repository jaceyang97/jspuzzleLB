import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@ui-sdk/react/button';
import { Tabs, TabsPanel } from '@ui-sdk/react/tabs';
import { Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger } from '@ui-sdk/react/dialog';
import { SelectedRankedRows, SelectedRankingHeader, SelectedRankingTabs } from './Rankings';
import { EmptyState, Icon, scopes, useRankings } from './shared';
import SolverSearch from './SolverSearch';
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
  return <Button className="flow-back-top" data-visible={shown ? '' : undefined} data-elevating={departed ? '' : undefined} disabled={riding} aria-label="Back to top" title={riding ? 'Going up…' : 'Back to top'} aria-hidden={!shown} tabIndex={shown && !riding ? 0 : -1} onClick={onClick}><ElevatorUpIcon /></Button>;
}

function PageStandings({ data, scope, search, setSearch, filtered, onSelect, onBackToTop }) {
  const { riding, departed, elevate, message, adjustForLayoutShift } = useElevator(onBackToTop);
  const windowed = usePageWindow({ count: filtered.length, onAnchorShift: adjustForLayoutShift });
  return <>
    <div className="flow-list" ref={windowed.list} data-loaded={windowed.loaded} data-total={filtered.length}>
      {filtered.length ? <div className="flow-window" style={{ paddingTop: windowed.before, paddingBottom: windowed.after }}><SelectedRankedRows rows={filtered.slice(windowed.first, windowed.end)} data={data} scope={scope} onSelect={onSelect} start={windowed.first + 1} total={filtered.length} /></div> : <EmptyState search={search} scope={scope} onClear={() => setSearch('')} />}
    </div>
    {!!filtered.length && <div className="flow-list-ending">
      <p className="flow-list-end" role="status">{windowed.loaded < filtered.length ? 'More solvers as you scroll ↓' : 'End of this ranking'}</p>
    </div>}
    <BackToTop onClick={elevate} riding={riding} departed={departed} />
    <ElevatorMessages message={message} />
    <span className="lab-visually-hidden" role="status">{riding ? 'Going up. Press Escape to stop.' : ''}</span>
  </>;
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
  const changeStats = (open) => {
    if (open) setStatsVisited(true);
    setStatsOpen(open);
  };
  const resetResults = () => {
    const start = primary.current?.getBoundingClientRect().top + window.scrollY;
    const top = Math.max(0, start - (tools.current?.getBoundingClientRect().height || 0));
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'auto' });
  };
  const changeSearch = (value) => { resetResults(); setSearch(value); };
  const changeScope = (value) => { if (value) { resetResults(); setScope(value); } };
  const onCommunity = (event) => {
    if (layout.current?.dataset.railLayout === 'dialog' || window.matchMedia('(max-width: 1120px), (max-height: 700px)').matches) { event.preventDefault(); changeStats(true); }
  };
  return <Dialog open={statsOpen} onOpenChange={changeStats}><div className="lab ladder arena arena--monument central-flow">
    <a href="#main-rankings" className="lab-skip">Skip to rankings</a>
    <div className="arena-page"><Header {...props} onSelect={(name) => onSelect(name, 'new_today')} onCommunity={onCommunity} />
      <Tabs value={scope} onValueChange={changeScope} aria-label="Rankings" className="flow-layout" ref={layout}>
        <div className="flow-tools-row" ref={tools}><div className="flow-scope"><SelectedRankingTabs /></div><SolverSearch solvers={data.topSolvers} value={search} onChange={changeSearch} onSelect={onSelect} /><DialogTrigger className="flow-stats-button">Stats</DialogTrigger></div>
        <aside className="flow-rail flow-rail--left ladder-insights" aria-label="Solver trends and categories"><TotalSolversCard data={data} /><NewReturningCard puzzles={puzzles} loading={loading} /><CommunityCard data={data} /></aside>
        <main className="flow-primary" id="main-rankings" data-ranking={scope} ref={primary} tabIndex={-1}>
          <p className="lab-visually-hidden" role="status" aria-live="polite" aria-atomic="true">{search.trim() ? `${filtered.length.toLocaleString('en-US')} ${filtered.length === 1 ? 'match' : 'matches'} for ${search.trim()}` : ''}</p>
          <div className="flow-toolbar"><SelectedRankingHeader scope={scope} /></div>
          {scopes.map(({ id }) => <TabsPanel key={id} value={id}>
            {scope === id && <PageStandings {...props} filtered={filtered} setSearch={changeSearch} key={search} onBackToTop={() => {
              if (window.scrollY) window.scrollTo({ top: 0, behavior: 'auto' });
              primary.current?.focus({ preventScroll: true });
            }} />}
          </TabsPanel>)}
        </main>
        <aside className="flow-rail flow-rail--right ladder-insights" aria-label="Puzzle rankings"><PuzzlesCard rows={rankedPuzzles} error={error} totalPuzzles={data.totalPuzzles} totalMonths={totalMonths} /><ProjectInfoCard /></aside>
      </Tabs>
    </div>
    <DialogContent keepMounted className="flow-stats-dialog">
      <header><DialogTitle>Community &amp; puzzles</DialogTitle><DialogClose aria-label="Close statistics"><Icon name="close" /></DialogClose>
        <nav className="stats-section-links" aria-label="Statistics sections">
          {['Trends', 'Community', 'Puzzles', 'Feedback'].map(label => {
            const id = `stats-${label.toLowerCase()}`;
            return <a key={id} href={`#${id}`} onClick={event => {
              const target = document.getElementById(id);
              if (!target || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
              event.preventDefault();
              target.scrollIntoView({ block: 'start' });
              (target.querySelector('textarea') ?? target).focus({ preventScroll: true });
            }}>{label}</a>;
          })}
        </nav>
      </header>
      {statsVisited && <div className="flow-dialog-panels ladder-insights"><TotalSolversCard data={data} id="stats-trends" /><NewReturningCard puzzles={puzzles} loading={loading} /><CommunityCard data={data} id="stats-community" /><PuzzlesCard id="stats-puzzles" rows={rankedPuzzles} error={error} totalPuzzles={data.totalPuzzles} totalMonths={totalMonths} /><ProjectInfoCard id="stats-feedback" /></div>}
    </DialogContent>
  </div></Dialog>;
}
