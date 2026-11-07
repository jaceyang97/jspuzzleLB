import React, { lazy, Suspense } from 'react';

const MonthlyChart = lazy(() => import('../../../components/charts/AdvancedCharts').then((module) => ({ default: module.MonthlyParticipationChart })));

export default function NewReturningCard({ puzzles, loading }) {
  return <section className="ladder-insight flow-card flow-trends flow-data-card flow-new-returning selected-sidebar-card" aria-label="New and returning solvers">
    <h2>New &amp; returning</h2>
    <div className="chart-container mini growth-chart-tabs"><Suspense fallback={<p role="status">Loading monthly solvers…</p>}><MonthlyChart puzzles={puzzles} loading={loading} /></Suspense></div>
  </section>;
}
