import React, { lazy, Suspense, useMemo, useState } from 'react';
import { format, isValid, parse } from 'date-fns';
import { LeaderboardData, Puzzle } from '../types';
import LeaderboardWorkspace from './LeaderboardWorkspace';
import StatsCards from './StatsCards';
import SolverDistributionChart from './SolverDistributionChart';
import { trackEvent } from '../../../utils/analytics';

const GrowthChart = lazy(() => import('../../../components/charts/Charts').then((module) => ({ default: module.GrowthChartTabs })));
const MostSolvedPuzzles = lazy(() => import('../../../components/charts/Charts').then((module) => ({ default: module.MostSolvedPuzzlesTable })));
const INSIGHTS = [
  { id: 'community', label: 'Solvers' },
  { id: 'growth', label: 'Trends' },
  { id: 'puzzles', label: 'Puzzles' },
] as const;
type InsightView = typeof INSIGHTS[number]['id'];

interface Props {
  data: LeaderboardData;
  rawPuzzles: Puzzle[] | null;
  puzzlesLoading: boolean;
  compact: boolean;
  short: boolean;
  onSolverClick: (name: string, source: string) => void;
}

export default function DashboardStage({ data, rawPuzzles, puzzlesLoading, compact, short, onSolverClick }: Props) {
  const [insightView, setInsightView] = useState<InsightView>('community');
  const [shortView, setShortView] = useState<InsightView | 'rankings'>('rankings');
  const mostSolvedPuzzles = useMemo(() => {
    if (!rawPuzzles) return data.mostSolvedPuzzles;
    return rawPuzzles.map((puzzle) => {
      const date = parse(puzzle.date_text, 'MMMM yyyy', new Date(2000, 0, 1));
      return {
        id: isValid(date) ? format(date, 'yyyy-M') : puzzle.date_text,
        name: puzzle.name,
        solvers: new Set(puzzle.solvers || []).size,
        solution_url: puzzle.solution_url,
      };
    }).sort((a, b) => b.solvers - a.solvers);
  }, [data.mostSolvedPuzzles, rawPuzzles]);
  const activeInsight = short ? shortView : insightView;
  const options = short ? [{ id: 'rankings', label: 'Rankings' }, ...INSIGHTS] : INSIGHTS;
  const showInsight = (id: InsightView) => !compact || activeInsight === id;
  const selectInsight = (id: string) => {
    if (short) setShortView(id as InsightView | 'rankings');
    else setInsightView(id as InsightView);
    trackEvent('insight_panel_change', { panel: id });
  };

  return (
    <main className={`dashboard-stage${compact ? ' dashboard-stage--compact' : ''}${short ? ' dashboard-stage--short' : ''}`} data-insight={activeInsight}>
      <div className="ranking-stage" id="insight-panel-rankings" hidden={short && shortView !== 'rankings'}
        role={short ? 'tabpanel' : undefined} aria-labelledby={short ? 'insight-tab-rankings' : undefined}>
        <LeaderboardWorkspace data={data} onSolverClick={onSolverClick} />
      </div>

      {compact && (
        <div className="insight-switcher" role="tablist" aria-label="Dashboard insights">
          {options.map((item, index) => (
            <button key={item.id} id={`insight-tab-${item.id}`} type="button" role="tab"
              aria-selected={activeInsight === item.id} aria-controls={`insight-panel-${item.id}`}
              tabIndex={activeInsight === item.id ? 0 : -1}
              onClick={() => selectInsight(item.id)}
              onKeyDown={(event) => {
                let next = index;
                if (event.key === 'ArrowRight') next = (index + 1) % options.length;
                else if (event.key === 'ArrowLeft') next = (index + options.length - 1) % options.length;
                else if (event.key === 'Home') next = 0;
                else if (event.key === 'End') next = options.length - 1;
                else return;
                event.preventDefault();
                selectInsight(options[next].id);
                document.getElementById(`insight-tab-${options[next].id}`)?.focus();
              }}>
              {item.label}
            </button>
          ))}
        </div>
      )}

        <section className="community-panel side-panel" id="insight-panel-community" hidden={!showInsight('community')}
          role={compact ? 'tabpanel' : undefined} aria-labelledby={compact ? 'insight-tab-community' : 'community-title'}>
          <StatsCards totalPuzzles={data.totalPuzzles} uniqueSolvers={data.uniqueSolvers} />
          <div className="community-distribution">
            <h2 id="community-title">Solvers by puzzles solved</h2>
            <SolverDistributionChart data={data.solverDistribution} />
          </div>
        </section>
        <section className="growth-panel side-panel" id="insight-panel-growth" hidden={!showInsight('growth')}
          role={compact ? 'tabpanel' : undefined} aria-labelledby={compact ? 'insight-tab-growth' : undefined}
          aria-label={compact ? undefined : 'Solver trends'}>
          {showInsight('growth') && <Suspense fallback={<div className="chart-loading">Loading trends…</div>}>
            <GrowthChart solversGrowthData={data.solversGrowth} rawPuzzles={rawPuzzles} puzzlesLoading={puzzlesLoading} />
          </Suspense>}
        </section>
        <section className="puzzles-panel side-panel" id="insight-panel-puzzles" hidden={!showInsight('puzzles')}
          role={compact ? 'tabpanel' : undefined} aria-labelledby={compact ? 'insight-tab-puzzles' : undefined}
          aria-label={compact ? undefined : 'Most solved puzzles'}>
          {showInsight('puzzles') && <Suspense fallback={<div className="chart-loading">Loading puzzles…</div>}>
            <MostSolvedPuzzles data={mostSolvedPuzzles} />
          </Suspense>}
        </section>
    </main>
  );
}
