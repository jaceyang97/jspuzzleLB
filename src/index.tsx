import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Leaderboard from './components/Leaderboard';
import { Analytics } from '@vercel/analytics/react';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Analytics />
    <Leaderboard />
  </React.StrictMode>
);
