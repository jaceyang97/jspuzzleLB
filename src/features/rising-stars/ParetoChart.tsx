import React, { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import studyData from './data/pareto-study.json';
import './ParetoChart.css';

export interface ParetoRow {
  config_id: string;
  window_months: number;
  min_solves: number;
  min_opportunities: number;
  ranking: string;
  future_quality: number;
  average_post_debut_exposure: number;
  annualized_unique_reach: number;
  list_fill: number;
  meets_95pct_fill: boolean;
  pareto_3d: boolean;
  equivalent_config_ids: string[];
}

export interface ParetoDataset {
  metadata: {
    chosen_config_id: string;
    top_k: number;
    fill_floor: number;
    counts: { configurations: number; distinct_behaviors: number };
  };
  rows: ParetoRow[];
}

// The export retains full precision once per identical selection history.
// Parameters are encoded in each config ID; don't ship them 10,400 times.
type PackedPoint = [string, number, number, number, number, boolean, string[]];
export const articleParetoData: ParetoDataset = {
  metadata: studyData.metadata,
  rows: (studyData.points as unknown as PackedPoint[]).map(([configId, quality, age, reach, fill, frontier, equivalentIds]) => {
    const [, window, solves, opportunities, ranking] = /^W(\d+)-S(\d+)-E(\d+)-(\w+)$/.exec(configId)!;
    return { config_id: configId, window_months: Number(window), min_solves: Number(solves),
      min_opportunities: Number(opportunities), ranking, future_quality: quality,
      average_post_debut_exposure: age, annualized_unique_reach: reach, list_fill: fill,
      meets_95pct_fill: fill >= studyData.metadata.fill_floor, pareto_3d: frontier, equivalent_config_ids: equivalentIds };
  }),
};

type Axis = 'age' | 'reach';
const HEIGHT = 350;
const MARGIN = { left: 40, right: 16, top: 32, bottom: 54 };
const LABEL_WIDTH = 116;
const LABEL_CANDIDATES = [[14, -18], [14, 28], [-LABEL_WIDTH - 14, -18], [-LABEL_WIDTH - 14, 28], [-LABEL_WIDTH / 2, -40], [-LABEL_WIDTH / 2, 48]];
const METHODS: Record<string, string> = { raw: 'Solve rate', count: 'Total solves', wilson: 'Conservative solve rate', beta: 'Adjusted solve rate' };
const xValue = (row: ParetoRow, axis: Axis) => axis === 'age' ? row.average_post_debut_exposure : row.annualized_unique_reach;
const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
const number = (value: number) => value.toLocaleString('en-US');
interface PlotPoint { row: ParetoRow; x: number; y: number }

// Selection changes only the highlight and detail panel, not thousands of dots.
const PointCloud = React.memo(function PointCloud({ points }: { points: PlotPoint[] }) {
  return <g>{points.map(({ row, x, y }) => <circle key={row.config_id} data-config-id={row.config_id}
    data-frontier-id={row.pareto_3d ? row.config_id : undefined} cx={x} cy={y} r={row.pareto_3d ? 4.5 : 2.7}
    className={row.pareto_3d ? 'rs-pareto-frontier-dot' : `rs-pareto-dot ${row.meets_95pct_fill ? 'is-feasible' : 'is-underfilled'}`} />)}</g>;
});

function scaleTicks(minimum: number, maximum: number, tightStart = false): number[] {
  const rough = Math.max((maximum - minimum) / 5, .001);
  const unit = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].find((factor) => factor * unit >= rough)! * unit;
  const startStep = tightStart ? unit : step;
  const first = Math.floor(minimum / startStep) * startStep;
  const intervals = Math.max(1, Math.ceil((maximum - first) / step));
  return Array.from({ length: intervals + 1 }, (_, index) => first + index * step);
}

export default function ParetoChart({ data = articleParetoData }: { data?: ParetoDataset }) {
  const id = useId();
  const plotRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [axis, setAxis] = useState<Axis>('age');
  const [showUnderfilled, setShowUnderfilled] = useState(false);
  const [selectedId, setSelectedId] = useState(data.metadata.chosen_config_id);
  const rowById = useMemo(() => new Map(data.rows.map((row) => [row.config_id, row])), [data]);
  const chosen = rowById.get(data.metadata.chosen_config_id)!;
  const selected = rowById.get(selectedId) || chosen;

  useLayoutEffect(() => {
    const element = plotRef.current;
    if (!element) return;
    const measure = () => {
      const measured = element.getBoundingClientRect().width;
      if (measured > 0) setWidth(measured);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  const visibleRows = useMemo(() => data.rows.filter((row) => showUnderfilled || row.meets_95pct_fill), [data, showUnderfilled]);
  const representatives = useMemo(() => [...visibleRows].sort((a, b) => xValue(a, axis) - xValue(b, axis)
    || b.future_quality - a.future_quality || a.config_id.localeCompare(b.config_id)), [visibleRows, axis]);
  const indexById = useMemo(() => new Map(representatives.map((row, index) => [row.config_id, index])), [representatives]);
  const selectedIndex = indexById.get(selected.config_id)!;
  const equivalentIds = selected.equivalent_config_ids;
  const right = width - MARGIN.right;
  const bottom = HEIGHT - MARGIN.bottom;
  const geometry = useMemo(() => {
    const xs = visibleRows.map((row) => xValue(row, axis));
    const ys = visibleRows.map((row) => row.future_quality);
    const xTicks = scaleTicks(Math.min(...xs), Math.max(...xs), true);
    const yTicks = scaleTicks(Math.min(...ys), Math.max(...ys));
    const xMin = xTicks[0], xMax = xTicks[xTicks.length - 1];
    const yMin = yTicks[0], yMax = yTicks[yTicks.length - 1];
    const points = visibleRows.map((row) => ({ row,
      x: MARGIN.left + (xValue(row, axis) - xMin) / (xMax - xMin) * (right - MARGIN.left),
      y: bottom - (row.future_quality - yMin) / (yMax - yMin) * (bottom - MARGIN.top) }));
    // Frontier dots paint last, so the gray cloud never covers them.
    points.sort((a, b) => Number(a.row.pareto_3d) - Number(b.row.pareto_3d));
    return { xTicks, yTicks, xMin, xMax, yMin, yMax, points,
      byId: new Map(points.map((point) => [point.row.config_id, point])),
      configurations: visibleRows.reduce((sum, row) => sum + row.equivalent_config_ids.length, 0) };
  }, [visibleRows, axis, right, bottom]);
  const { xTicks, yTicks, xMin, xMax, yMin, yMax } = geometry;
  const chosenPoint = geometry.byId.get(chosen.config_id)!;
  const selectedPoint = geometry.byId.get(selected.config_id) || chosenPoint;
  const axisLabel = axis === 'age' ? 'Average puzzles after first solve' : 'Expected names per year';

  const selectAt = (event: React.MouseEvent<HTMLDivElement> | React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - bounds.left;
    const py = event.clientY - bounds.top;
    if (px < MARGIN.left || px > right || py < MARGIN.top || py > bottom) return;
    let nearest = selected;
    let distance = Infinity;
    geometry.points.forEach(({ row, x, y }) => {
      const next = (px - x) ** 2 + (py - y) ** 2;
      if (next < distance - 1e-8 || (Math.abs(next - distance) < 1e-8 && row.config_id === selected.config_id)) {
        nearest = row;
        distance = next;
      }
    });
    setSelectedId(nearest.config_id);
  };
  const step = (next: number) => setSelectedId(representatives[Math.max(0, Math.min(representatives.length - 1, next))].config_id);
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowRight') step(selectedIndex + 1);
    else if (event.key === 'ArrowLeft') step(selectedIndex - 1);
    else if (event.key === 'Home') step(0);
    else if (event.key === 'End') step(representatives.length - 1);
    else return;
    event.preventDefault();
  };

  // One direct label, positioned in the least crowded nearby space. Points
  // retain their true coordinates; label placement never jitters the data.
  const label = useMemo(() => LABEL_CANDIDATES.map(([dx, dy]) => {
    const left = Math.max(MARGIN.left + 2, Math.min(right - LABEL_WIDTH - 2, chosenPoint.x + dx));
    const baseline = Math.max(MARGIN.top + 16, Math.min(bottom - 6, chosenPoint.y + dy));
    const collisions = geometry.points.filter(({ row, x, y }) => row.config_id !== chosen.config_id
      && x >= left - 6 && x <= left + LABEL_WIDTH + 6 && y >= baseline - 17 && y <= baseline + 8).length;
    return { left, baseline, collisions };
  }).sort((a, b) => a.collisions - b.collisions)[0], [geometry, chosen.config_id, chosenPoint, right, bottom]);
  const star = Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const radius = index % 2 === 0 ? 10 : 4.4;
    return `${chosenPoint.x + Math.cos(angle) * radius},${chosenPoint.y + Math.sin(angle) * radius}`;
  }).join(' ');

  return <figure className="rs-pareto" aria-labelledby={`${id}-title`}>
    <div className="rs-pareto-heading"><strong id={`${id}-title`}>{number(data.metadata.counts.configurations)} rules compared</strong><span>Jan 2018–Feb 2026</span></div>
    <div className="rs-pareto-axis-options" role="group" aria-label="Horizontal axis">
      <button type="button" aria-pressed={axis === 'age'} onClick={() => setAxis('age')}>Record length</button>
      <button type="button" aria-pressed={axis === 'reach'} onClick={() => setAxis('reach')}>Names/year</button>
    </div>
    <div ref={plotRef} className="rs-pareto-plot" role="slider" tabIndex={0}
      aria-label="Inspect a ranking rule" aria-orientation="horizontal" aria-valuemin={1} aria-valuemax={representatives.length}
      aria-valuenow={selectedIndex + 1} aria-valuetext={`${METHODS[selected.ranking]}, ${selected.window_months} months, at least ${selected.min_solves} solves. Later participation ${percent(selected.future_quality)}.`}
      aria-describedby={`${id}-instructions`} onKeyDown={onKeyDown}
      onPointerMove={(event) => { if (event.pointerType !== 'touch') selectAt(event); }}
      onClick={(event) => { selectAt(event); event.currentTarget.focus({ preventScroll: true }); }}>
      <svg viewBox={`0 0 ${width} ${HEIGHT}`} width="100%" height={HEIGHT} aria-hidden="true">
        <text x={MARGIN.left} y={13} className="rs-pareto-axis-title">Later participation</text>
        {yTicks.map((tick) => {
          const py = bottom - (tick - yMin) / (yMax - yMin) * (bottom - MARGIN.top);
          return <g key={tick}><line x1={MARGIN.left} x2={right} y1={py} y2={py} className="rs-pareto-grid" />
            <text x={MARGIN.left - 9} y={py + 4} textAnchor="end" className="rs-pareto-tick">{Math.round(tick * 100)}%</text></g>;
        })}
        {xTicks.map((tick) => <g key={tick}>
          <text x={MARGIN.left + (tick - xMin) / (xMax - xMin) * (right - MARGIN.left)} y={bottom + 21} textAnchor="middle" className="rs-pareto-tick">{Number(tick.toFixed(2))}</text>
        </g>)}
        <text x={(MARGIN.left + right) / 2} y={HEIGHT - 7} textAnchor="middle" className="rs-pareto-axis-title">{axisLabel}</text>
        <PointCloud points={geometry.points} />
        {selected.config_id !== chosen.config_id && <circle cx={selectedPoint.x} cy={selectedPoint.y} r={9} className="rs-pareto-inspected" />}
        <polygon points={star} className="rs-pareto-chosen" />
        <line x1={chosenPoint.x} y1={chosenPoint.y} x2={Math.max(label.left, Math.min(label.left + LABEL_WIDTH, chosenPoint.x))} y2={label.baseline - 5} className="rs-pareto-label-leader" />
        <rect x={label.left - 3} y={label.baseline - 12} width={LABEL_WIDTH + 6} height={17} className="rs-pareto-label-paper" />
        <text x={label.left} y={label.baseline} className="rs-pareto-chosen-label">{chosen.window_months} months · {chosen.min_solves} solves</text>
      </svg>
    </div>
    <div className="rs-pareto-legend" aria-label="Chart legend">
      <span><i className="rs-pareto-key-dot" />Other rules</span>
      <span><i className="rs-pareto-key-frontier" />Frontier across all three goals</span>
      <span><i className="rs-pareto-key-chosen" />Selected rule · on frontier</span>
      {showUnderfilled && <span><i className="rs-pareto-key-hollow" />Fewer names</span>}
    </div>
    <label className="rs-pareto-show-all"><input type="checkbox" checked={showUnderfilled} onChange={(event) => {
      setShowUnderfilled(event.target.checked);
      if (!event.target.checked && !selected.meets_95pct_fill) setSelectedId(chosen.config_id);
    }} />Show rules with fewer names</label>
    <p id={`${id}-instructions`} className="rs-pareto-instructions">Hover, tap, or use arrow keys to inspect.</p>
    <div className="rs-pareto-details" role="region" aria-label="Selected rule details">
      <div className="rs-pareto-detail-heading"><strong>{METHODS[selected.ranking]}</strong>
        <button type="button" className="rs-pareto-reset" onClick={() => setSelectedId(chosen.config_id)} disabled={selected.config_id === chosen.config_id}>Our choice</button></div>
      <p className="rs-pareto-parameters">{selected.window_months} {selected.window_months === 1 ? 'month' : 'months'} · {selected.min_solves} {selected.min_solves === 1 ? 'solve' : 'solves'} minimum · {selected.min_opportunities} published {selected.min_opportunities === 1 ? 'puzzle' : 'puzzles'} minimum</p>
      <dl className="rs-pareto-metrics">
        <div><dt>Later participation</dt><dd>{percent(selected.future_quality)}</dd></div>
        <div><dt>Record length</dt><dd>{selected.average_post_debut_exposure.toFixed(2)}<small>puzzles after debut</small></dd></div>
        <div><dt>Names/year</dt><dd>{selected.annualized_unique_reach.toFixed(1)}</dd></div>
        <div><dt>List filled</dt><dd>{Math.round(selected.list_fill * 100)}%<small>of {data.metadata.top_k} places</small></dd></div>
      </dl>
      <p className="rs-pareto-status">{!selected.meets_95pct_fill ? 'Fills fewer than 95% of places; excluded from the frontier.'
        : `${selected.pareto_3d ? 'On' : 'Outside'} the frontier across all three goals.`}</p>
      <div className="rs-pareto-detail-footer">
        <details className="rs-pareto-equivalents" key={selected.config_id}>
          <summary>{equivalentIds.length === 1 ? 'Rule details' : `${equivalentIds.length} rules give the same results`}</summary>
          <ul>{equivalentIds.map((configId) => <li key={configId}><code>{configId}</code></li>)}</ul>
        </details>
        <div className="rs-pareto-stepper">
          <button type="button" aria-label="Inspect previous result" disabled={selectedIndex <= 0} onClick={() => step(selectedIndex - 1)}>←</button>
          <span>{selectedIndex + 1}/{representatives.length}</span>
          <button type="button" aria-label="Inspect next result" disabled={selectedIndex >= representatives.length - 1} onClick={() => step(selectedIndex + 1)}>→</button>
        </div>
      </div>
    </div>
    <figcaption>{number(geometry.configurations)} of {number(data.metadata.counts.configurations)} rules shown as {number(visibleRows.length)} distinct results. Rules with identical results share one dot. By default, lists must be at least 95% full on average. Teal dots and the red star form the frontier across all three goals.</figcaption>
  </figure>;
}
