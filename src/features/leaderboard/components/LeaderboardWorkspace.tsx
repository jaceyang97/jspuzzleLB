import React, { useState } from 'react';
import { LeaderboardData } from '../types';
import TopSolversTable from './TopSolversTable';
import StreaksTable from './StreaksTable';
import RisingStarsTable from './RisingStarsTable';
import { trackEvent } from '../../../utils/analytics';
import Tooltip from '../../../components/Tooltip';

const VIEWS = [
  { id: 'top-solvers', label: 'Top solvers', description: 'All-time standings, ranked by total puzzles solved.' },
  { id: 'streaks', label: 'Longest streaks', description: 'Personal best runs of consecutive months with a solve.' },
  { id: 'rising-stars', label: 'Rising stars', description: 'First recorded solve within the last 12 calendar months, with at least 3 solves. Ranked by total solves divided by elapsed months since the first solve.' },
] as const;
type View = typeof VIEWS[number]['id'];

interface Props {
  data: LeaderboardData;
  onSolverClick: (name: string, source: string) => void;
}

export default function LeaderboardWorkspace({ data, onSolverClick }: Props) {
  const [view, setView] = useState<View>('top-solvers');
  const [search, setSearch] = useState('');
  const activeView = VIEWS.find((item) => item.id === view)!;
  const rows: Array<{ name: string }> = view === 'top-solvers' ? data.topSolvers : view === 'streaks' ? data.longestStreaks : data.risingStars;
  const query = search.trim().toLowerCase();
  const resultCount = rows.filter((row) => row.name.toLowerCase().includes(query)).length;

  const selectView = (next: View) => {
    if (next !== view) trackEvent('leaderboard_tab_change', { tab: next });
    setView(next);
  };

  const handleTabKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % VIEWS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index + VIEWS.length - 1) % VIEWS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = VIEWS.length - 1;
    else return;
    event.preventDefault();
    selectView(VIEWS[nextIndex].id);
    document.getElementById(`leaderboard-tab-${VIEWS[nextIndex].id}`)?.focus();
  };

  return (
    <section className="leaderboard-workspace" aria-label="Puzzle rankings">
      <div className="leaderboard-tabs" role="tablist" aria-label="Leaderboard view">
        {VIEWS.map((item, index) => (
          <Tooltip key={item.id} className="leaderboard-tab-tooltip" content={item.description} rich>
            <button
              id={`leaderboard-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={view === item.id}
              aria-controls={`leaderboard-panel-${item.id}`}
              tabIndex={view === item.id ? 0 : -1}
              onClick={() => selectView(item.id)}
              onKeyDown={(event) => handleTabKey(event, index)}
            >
              {item.label}
            </button>
          </Tooltip>
        ))}
      </div>

      <div className="leaderboard-controls">
        <div className="leaderboard-search">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" />
          </svg>
          <input type="search" aria-label="Search solvers in the selected leaderboard"
            placeholder="Find a solver…" value={search} onChange={(event) => setSearch(event.target.value)} />
          {search && <button type="button" onClick={() => setSearch('')} aria-label="Clear solver search">×</button>}
        </div>
        <div className="ranking-guidance">
          <Tooltip content={activeView.description} rich>
            <button className="ranking-help" type="button" aria-label="How this ranking works" aria-describedby="ranking-description">i</button>
          </Tooltip>
        </div>
      </div>

      <p id="ranking-description" className="sr-only">{activeView.description}</p>
      <span className="sr-only" role="status" aria-label="Solver search results" aria-atomic="true">
        {query ? `${resultCount.toLocaleString()} of ${rows.length.toLocaleString()} solvers` : `${rows.length.toLocaleString()} solvers`}
      </span>

      {VIEWS.map((item) => (
        <div
          key={item.id}
          id={`leaderboard-panel-${item.id}`}
          role="tabpanel"
          aria-labelledby={`leaderboard-tab-${item.id}`}
          aria-describedby={view === item.id ? 'ranking-description' : undefined}
          hidden={view !== item.id}
          className="leaderboard-panel"
          tabIndex={0}
        >
          {view === item.id && (
            item.id === 'top-solvers'
              ? <TopSolversTable key={query} data={data.topSolvers} searchTerm={search} onSolverClick={(name) => onSolverClick(name, item.id)} />
              : item.id === 'streaks'
                ? <StreaksTable key={query} data={data.longestStreaks} searchTerm={search} onSolverClick={(name) => onSolverClick(name, item.id)} />
                : <RisingStarsTable key={query} data={data.risingStars} searchTerm={search} onSolverClick={(name) => onSolverClick(name, item.id)} />
          )}
        </div>
      ))}

    </section>
  );
}
