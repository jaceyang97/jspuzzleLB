import React, { ReactNode, useState } from 'react';
import { LeaderboardData } from '../types';
import {
  ChipColor,
  VISIBLE_PALETTE,
  HIDDEN_PALETTE,
  colorFromName,
} from './solverChipPalettes';

interface NewSolversBannerProps {
  currentPuzzleProgress?: LeaderboardData['currentPuzzleProgress'];
  generatedAt?: string;
  monthlyParticipation?: { month: string; solvers: number }[];
}

function daysAgoText(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

function firstInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

const SolverChip: React.FC<{ name: string; colors: ChipColor }> = ({ name, colors }) => (
  <span className="solver-chip">
    <span
      className="solver-chip-initial"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {firstInitial(name)}
    </span>
    <span className="solver-chip-name">{name}</span>
  </span>
);

type NewTodayTemplate = (names: ReactNode, puzzle: ReactNode) => ReactNode;
type StatsTemplate = (puzzle: ReactNode, count: number, daysAgo: string) => ReactNode;
type MonthlyTemplate = (month: string, solvers: number) => ReactNode;

const TEMPLATE_COUNT = 30;

const NEW_TODAY_TEMPLATES: NewTodayTemplate[] = [
  (n, p) => <>{n} joined the {p} board</>,
  (n, p) => <>{n} just cracked {p}</>,
  (n, p) => <>{n} landed on the {p} leaderboard</>,
  (n, p) => <>Fresh on {p}: {n}</>,
  (n, p) => <>{n} solved {p} and made the cut</>,
  (n, p) => <>{n} added their names to the {p} board</>,
  (n, p) => <>{n} found the edge on {p}</>,
  (n, p) => <>{p} just got harder — {n} cleared it</>,
  (n, p) => <>{n} unraveled {p}</>,
  (n, p) => <>Hot off the press: {n} cleared {p}</>,
  (n, p) => <>{n} cracked the code on {p}</>,
  (n, p) => <>New on {p}: {n}</>,
  (n, p) => <>The {p} club gains: {n}</>,
  (n, p) => <>{n} made {p} look easy</>,
  (n, p) => <>Roll call on {p}: {n}</>,
  (n, p) => <>{n} cleared the {p} gauntlet</>,
  (n, p) => <>The {p} scoreboard welcomes {n}</>,
  (n, p) => <>{n} pieced together {p}</>,
  (n, p) => <>{n} chalked up {p}</>,
  (n, p) => <>{n} put {p} to bed</>,
  (n, p) => <>{n} broke into the {p} board</>,
  (n, p) => <>Spotted on {p}: {n}</>,
  (n, p) => <>{n} wrote their name into {p} lore</>,
  (n, p) => <>{n} bagged a {p} solve</>,
  (n, p) => <>{n} took down {p}</>,
  (n, p) => <>{n} earned a spot on {p}</>,
  (n, p) => <>Welcome to the {p} leaderboard, {n}</>,
  (n, p) => <>{n} aced {p}</>,
  (n, p) => <>{n} just punched their {p} ticket</>,
  (n, p) => <>{n} pinned {p} to the wall</>,
];

const STATS_TEMPLATES: StatsTemplate[] = [
  (p, c, d) => <>{p} · {c} solvers · last added {d}</>,
  (p, c, d) => <>{p} sits at {c} solvers — last entry {d}</>,
  (p, c, d) => <>{c} have solved {p} (newest, {d})</>,
  (p, c, d) => <>{p}: {c} on the board, freshest pick {d}</>,
  (p, c, d) => <>{c} solvers deep on {p} — last in {d}</>,
  (p, c, d) => <>{p} board: {c} names, latest {d}</>,
  (p, c, d) => <>Quiet on {p} — {c} solvers, last added {d}</>,
  (p, c, d) => <>{p} count: {c}. Last new face: {d}</>,
  (p, c, d) => <>Standings on {p}: {c} solvers, most recent {d}</>,
  (p, c, d) => <>{c} have cracked {p} — newest {d}</>,
  (p, c, d) => <>{p} leaderboard: {c} entries, latest {d}</>,
  (p, c, d) => <>{p} tally — {c} in, last entry {d}</>,
  (p, c, d) => <>No new {p} solvers today · {c} total · last {d}</>,
  (p, c, d) => <>{p} stays at {c} (last added {d})</>,
  (p, c, d) => <>{c} solvers on the {p} ledger, latest {d}</>,
  (p, c, d) => <>Holding at {c} on {p} — newest entry {d}</>,
  (p, c, d) => <>{p} · {c} solves and counting · last {d}</>,
  (p, c, d) => <>{c} names on {p}, last to land {d}</>,
  (p, c, d) => <>{p} roster: {c} solvers, latest arrival {d}</>,
  (p, c, d) => <>{c} have signed the {p} board (last {d})</>,
  (p, c, d) => <>Jane Street's {p} sits at {c} — most recent {d}</>,
  (p, c, d) => <>{p} solver count: {c} · freshest {d}</>,
  (p, c, d) => <>{c} on the {p} scoreboard, last in {d}</>,
  (p, c, d) => <>{p} marks {c} solvers — newest {d}</>,
  (p, c, d) => <>{c} cracked {p} — last to do so, {d}</>,
  (p, c, d) => <>{p} board count: {c} (last entry {d})</>,
  (p, c, d) => <>Tracking {c} on {p}, latest {d}</>,
  (p, c, d) => <>{c} solvers strong on {p} — last added {d}</>,
  (p, c, d) => <>The {p} club: {c} members, newest {d}</>,
  (p, c, d) => <>{p} — {c} cracked it — last {d}</>,
];

const MONTHLY_TEMPLATES: MonthlyTemplate[] = [
  (m, s) => <>{m} · {s} solvers this month</>,
  (m, s) => <>{s} solvers logged in {m}</>,
  (m, s) => <>{m} pulled in {s} solvers</>,
  (m, s) => <>Tracking {s} solvers across {m}</>,
  (m, s) => <>{m} count: {s} solvers</>,
  (m, s) => <>{s} active on the leaderboard in {m}</>,
  (m, s) => <>{s} solvers showed up in {m}</>,
  (m, s) => <>{m}'s tally: {s} solvers</>,
  (m, s) => <>{s} on the board this {m}</>,
  (m, s) => <>{m} brought {s} solvers to the board</>,
  (m, s) => <>Solver count for {m}: {s}</>,
  (m, s) => <>{s} cracked Jane Street puzzles in {m}</>,
  (m, s) => <>{m}: {s} on the leaderboard</>,
  (m, s) => <>{s} entries in {m}</>,
  (m, s) => <>Roll call for {m}: {s} solvers</>,
  (m, s) => <>{m} drew {s} solvers</>,
  (m, s) => <>{s} signed in for {m}</>,
  (m, s) => <>The {m} board holds {s}</>,
  (m, s) => <>{s} contributors in {m}</>,
  (m, s) => <>{m} clocked {s} solvers</>,
  (m, s) => <>Tally for {m}: {s}</>,
  (m, s) => <>{s} solved their way through {m}</>,
  (m, s) => <>{m}'s leaderboard: {s} strong</>,
  (m, s) => <>{s} new names on the {m} board</>,
  (m, s) => <>{m} closed with {s} solvers</>,
  (m, s) => <>{s} appearances on the {m} board</>,
  (m, s) => <>{m} headcount: {s} solvers</>,
  (m, s) => <>{s} solvers logged for {m}</>,
  (m, s) => <>The {m} scoreboard: {s} entries</>,
  (m, s) => <>{s} hit the leaderboard in {m}</>,
];

const NewSolversBanner: React.FC<NewSolversBannerProps> = ({
  currentPuzzleProgress,
  generatedAt,
  monthlyParticipation,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [templateIndex] = useState(() => Math.floor(Math.random() * TEMPLATE_COUNT));

  if (dismissed) return null;

  let content: React.ReactNode;

  if (currentPuzzleProgress && generatedAt && currentPuzzleProgress.timeline.length > 0) {
    const crawlDate = generatedAt.slice(0, 10);
    const todaysSolvers = currentPuzzleProgress.timeline.filter(
      (entry) => entry.timestamp.slice(0, 10) === crawlDate
    );

    const puzzleLink = (
      <a
        href="https://www.janestreet.com/puzzles/current-puzzle/"
        target="_blank"
        rel="noopener noreferrer"
        className="banner-puzzle-link"
        title={`Open "${currentPuzzleProgress.puzzleName}" on janestreet.com`}
      >
        {currentPuzzleProgress.puzzleName}
      </a>
    );

    if (todaysSolvers.length > 0) {
      const names = todaysSolvers.map((e) => e.solver);
      const visible = names.length > 5 ? names.slice(0, 5) : names;
      const hidden = names.length > 5 ? names.slice(5) : [];

      const namesNode = (
        <>
          <span className="solver-chip-row">
            {visible.map((n, i) => (
              <SolverChip
                key={`${n}-${i}`}
                name={n}
                colors={VISIBLE_PALETTE[i % VISIBLE_PALETTE.length]}
              />
            ))}
            {hidden.length > 0 && <span className="solver-chip-and">and</span>}
          </span>
          {hidden.length > 0 && (
            <span className="banner-more" tabIndex={0}>
              <span className="banner-more-trigger">
                {hidden.length} more
              </span>
              <span className="banner-more-tooltip" role="tooltip">
                <span className="banner-more-tooltip-label">
                  Also joined today
                </span>
                <ul className="banner-more-list">
                  {hidden.map((name) => (
                    <li key={name}>
                      <SolverChip name={name} colors={colorFromName(name, HIDDEN_PALETTE)} />
                    </li>
                  ))}
                </ul>
              </span>
            </span>
          )}
        </>
      );

      content = (
        <>
          <span className="banner-tag">NEW TODAY</span>
          {' '}
          {NEW_TODAY_TEMPLATES[templateIndex](namesNode, puzzleLink)}
        </>
      );
    } else {
      const lastEntry = currentPuzzleProgress.timeline[currentPuzzleProgress.timeline.length - 1];
      const lastDate = new Date(lastEntry.timestamp);
      const crawlDateObj = new Date(crawlDate + 'T00:00:00Z');
      const diffDays = Math.floor((crawlDateObj.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      content = STATS_TEMPLATES[templateIndex](
        puzzleLink,
        currentPuzzleProgress.solverCount,
        daysAgoText(diffDays),
      );
    }
  } else if (monthlyParticipation && monthlyParticipation.length > 0) {
    const latest = monthlyParticipation[monthlyParticipation.length - 1];
    content = MONTHLY_TEMPLATES[templateIndex](latest.month, latest.solvers);
  } else {
    return null;
  }

  return (
    <div className="new-solvers-banner">
      <span className="banner-text">{content}</span>
      <button
        className="banner-dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss banner"
      >
        ×
      </button>
    </div>
  );
};

export default NewSolversBanner;
