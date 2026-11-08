import React, { lazy, Suspense } from 'react';
import './App.css';
import Leaderboard from './features/leaderboard/Leaderboard';

const RisingStarsArticle = lazy(() => import('./features/rising-stars/RisingStarsArticle'));

function App() {
  return (
    <div className="App">
      {window.location.pathname.replace(/\/$/, '') === '/rising-stars'
        ? <Suspense fallback={<p role="status">Loading…</p>}><RisingStarsArticle /></Suspense>
        : <Leaderboard />}
    </div>
  );
}

export default App;
