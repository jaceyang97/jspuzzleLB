import React, { useEffect } from 'react';
import ThemeToggle from '../../components/ThemeToggle';
import { useTheme } from '../../hooks/useTheme';
import ParetoChart from './ParetoChart';
import './RisingStarsArticle.css';

// Historical results for W18-S2-E3-raw. These describe later participation,
// not the live solve rate displayed for an individual solver.
const periodResults = [
  { period: '2018–20', participation: 35.50 },
  { period: '2021–23', participation: 31.23 },
  { period: '2024–26', participation: 49.44 },
];
const source = 'https://github.com/jaceyang97/jspuzzleLB/blob/main/analysis/rising-stars/expanded/report.md';

function RecordDiagram() {
  return <figure className="rs-figure rs-record-figure" aria-labelledby="record-caption">
    <div className="rs-figure-label"><span>01 / The calculation</span><span>Example record</span></div>
    <div className="rs-record-layout">
      <div className="rs-puzzle-record" role="img" aria-label="Four completed puzzles with published solver lists. The first, second, and fourth are solved.">
        {[true, true, false, true].map((solved, index) => <div key={index} className={`rs-puzzle-cell ${solved ? 'is-solved' : ''}`}>
          <span className="rs-puzzle-number">{index === 0 ? 'First solve' : `Puzzle ${index + 1}`}</span>
          <span className="rs-puzzle-symbol" aria-hidden="true">{solved
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m5 12 4.5 4.5L19 7" /></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 12h12" /></svg>}</span>
          <span>{solved ? 'Solved' : 'Not listed'}</span>
        </div>)}
      </div>
      <div className="rs-record-rate"><strong>75<span>%</span></strong><span>3 of 4 puzzles solved</span></div>
    </div>
    <figcaption id="record-caption">All four puzzles have published solver lists. Three solves give a 75% solve rate.</figcaption>
  </figure>;
}

function PeriodChart() {
  return <figure className="rs-figure" aria-labelledby="period-caption">
    <div className="rs-figure-label"><span>03 / Results over time</span><span>One rule, three periods</span></div>
    <div className="rs-chart-heading">Later participation <span>Share of the next six puzzles solved</span></div>
    <div className="rs-bars" role="img" aria-label="For the 18-month, two-solve, three-observed-puzzle rule, later participation was 35.50 percent in 2018 to 2020, 31.23 percent in 2021 to 2023, and 49.44 percent in January 2024 to February 2026.">
      {periodResults.map(row => <div key={row.period} className="rs-bar-row">
        <div className="rs-bar-label">{row.period}</div>
        <div className="rs-bar-track"><div className="rs-bar" style={{ width: `${row.participation / 60 * 100}%` }} /></div>
        <strong>{row.participation.toFixed(2)}%</strong>
      </div>)}
      <div className="rs-bar-axis" aria-hidden="true"><span>0%</span><span>30%</span><span>60%</span></div>
    </div>
    <figcaption id="period-caption">The last period ends in February 2026. The rule stays on the three-goal frontier in each period, but participation varies.</figcaption>
  </figure>;
}

export default function RisingStarsArticle() {
  const { theme, toggleTheme } = useTheme();
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'How Rising stars works | Puzzle Leaderboard';
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    return () => { document.title = previousTitle; robots.remove(); };
  }, []);

  return <div className="rs-page">
    <header className="rs-site-header">
      <a className="rs-home" href="/?view=rising-stars"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m10 5-7 7 7 7M3 12h18" /></svg> Back to leaderboard</a>
      <ThemeToggle theme={theme} onToggle={toggleTheme} />
    </header>
    <main className="rs-article" id="main">
      <header className="rs-article-header rs-copy">
        <div className="rs-kicker">Behind the ranking</div>
        <h1>How Rising stars works</h1>
        <p className="rs-authorship"><strong>LLM-authored.</strong> Read at your discretion.</p>
        <p className="rs-deck">An 18-month window. At least two solves across three or more completed puzzles. A rate from 0% to 100%.</p>
        <div className="rs-byline"><time dateTime="2026-09-06">6 September 2026</time><span aria-hidden="true">·</span><span>3 min read</span></div>
      </header>

      <section aria-labelledby="count-title">
        <div className="rs-copy">
          <h2 id="count-title">Count from your first solve</h2>
          <p>Your name must first appear within the last <strong>18 months</strong>, ending with the latest completed puzzle month. You need <strong>at least two solves</strong> and <strong>at least three completed puzzles</strong> with published solver lists since your first solve.</p>
          <p>We count the debut puzzle. Your <strong>solve rate</strong> is solves divided by the completed puzzles counted. Solve every one and your rate is 100%. A record of <strong>2/2 waits; 2/3 qualifies.</strong></p>
        </div>
        <RecordDiagram />
        <div className="rs-copy">
          <p>Open puzzles and missing lists do not count. Higher rates rank first. More solves break a rate tie. Identical records share a rank.</p>
        </div>
      </section>

      <section aria-labelledby="tradeoff-title">
        <div className="rs-copy">
          <h2 id="tradeoff-title">See the full comparison</h2>
          <p>We tested <strong>10,400 rules</strong> across <strong>96 monthly snapshots</strong>, January 2018–February 2026. The archive supplies 128 completed puzzles for history and later results. Each score uses only puzzles up to that snapshot.</p>
          <p>The search covers 1–24-month windows, entry thresholds, and four ranking methods. Each rule selects up to 20 names. To qualify, it must fill at least 95% of places on average.</p>
          <p>We compare three goals: more solves in the next six puzzles, shorter records since debut, and more different names shown per year.</p>
          <p>A rule reaches the <strong>Pareto frontier</strong> when no other qualifying rule can improve one of these goals without making another worse.</p>
        </div>
        <ParetoChart />
        <div className="rs-copy">
          <p><strong>The selected rule is on that frontier.</strong> Its names solved <strong>37.67%</strong> of the next six puzzles on average. It allows longer records in exchange for stronger evidence of continued participation. The frontier shows that trade-off; it does not identify one universal winner.</p>
        </div>
      </section>

      <section aria-labelledby="period-title">
        <div className="rs-copy">
          <h2 id="period-title">Check different periods</h2>
          <p>The rule lies on the frontier in all three periods below. This supports the choice across different parts of the archive. It does not mean that future results will match the average.</p>
        </div>
        <PeriodChart />
        <div className="rs-copy">
          <p>Eighteen months is a practical balance between evidence and a recent debut. The three-puzzle minimum adds an observation beyond an immediate 2/2 start. The score itself stays simple.</p>
          <p className="rs-limit">These are historical comparisons, not an independent test of future performance. More tested rules do not add new puzzles. Names and future outcomes repeat, and published lists can change. Study percentages measure later published participation, not individual solve rates or talent.</p>
        </div>
      </section>

      <footer className="rs-article-footer rs-copy">
        <span>Study data through August 2026.</span>
        <div><a href={source}>Data and methods <span aria-hidden="true">↗</span></a><a href="/?view=rising-stars">View Rising stars <span aria-hidden="true">→</span></a></div>
      </footer>
    </main>
  </div>;
}
