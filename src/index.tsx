import React from 'react';
import { createAgent, registerTools } from '@ui-sdk/react/agent';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Analytics } from '@vercel/analytics/react';
import { initBehaviorTracking } from './utils/analytics';

if ('modelContext' in document) {
  try {
    const unregister = registerTools(createAgent(), { allow: (step) => !step.confirm });
    import.meta.hot?.dispose(unregister);
  } catch {
    console.warn('This browser could not register the leaderboard’s WebMCP tools.');
  }
}

initBehaviorTracking();

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Analytics />
    <App />
  </React.StrictMode>
);
