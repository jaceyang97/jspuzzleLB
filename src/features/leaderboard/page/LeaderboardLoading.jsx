import React from 'react';
import LeaderboardHeader from './LeaderboardHeader';

function Frame({ theme, toggleTheme, children }) {
  return <div className="lab ladder arena arena--monument central-flow">
    <div className="arena-page"><LeaderboardHeader data={{}} theme={theme} toggleTheme={toggleTheme} />{children}</div>
  </div>;
}

export default function LeaderboardLoading(props) {
  return <Frame {...props}>
    <main className="flow-layout flow-loading-layout" aria-busy="true" aria-label="Loading leaderboard">
      <p className="lab-visually-hidden" role="status">Loading the leaderboard…</p>
      <div className="flow-tools-row" aria-hidden="true"><div className="flow-scope flow-skeleton-block" /><div className="lab-search flow-skeleton-block" /></div>
      <aside className="flow-rail flow-rail--left" aria-hidden="true">{[0, 1, 2].map(key => <div key={key} className="flow-card flow-skeleton-card"><span className="flow-skeleton-block" /><div className="flow-skeleton-chart" /></div>)}</aside>
      <div className="flow-primary" aria-hidden="true"><div className="flow-toolbar"><div className="flow-columns flow-skeleton-block" /></div>{[0, 1, 2, 3, 4].map(key => <div key={key} className="flow-skeleton-row" data-rank={key + 1}><span className="flow-skeleton-block" /><span className="flow-skeleton-block" /><span className="flow-skeleton-block" /></div>)}</div>
      <aside className="flow-rail flow-rail--right" aria-hidden="true"><div className="flow-card flow-skeleton-card flow-skeleton-puzzles" /><div className="flow-card flow-skeleton-card" /></aside>
    </main>
  </Frame>;
}

export function LeaderboardError(props) {
  return <Frame {...props}><main className="flow-load-error" role="alert">
    <h2>The leaderboard couldn’t load.</h2>
    <p>Please check your connection and try again.</p>
    <button type="button" className="lab-button" onClick={() => window.location.reload()}>Try again</button>
  </main></Frame>;
}
