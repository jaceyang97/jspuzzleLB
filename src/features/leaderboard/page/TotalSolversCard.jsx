import React, { lazy, Suspense } from 'react';

const GrowthChart = lazy(() => import('../../../components/charts/Charts').then((module) => ({ default: module.SolversGrowthBody })));

export default function TotalSolversCard({ data }) {
  return <section className="ladder-insight flow-card flow-trends flow-data-card flow-total-solvers selected-sidebar-card" aria-label="Total solvers">
    <h2>Total solvers</h2>
    <div className="chart-container mini growth-chart-tabs"><Suspense fallback={<p role="status">Loading solver history…</p>}><GrowthChart data={data.solversGrowth} endpoint /></Suspense></div>
  </section>;
}
