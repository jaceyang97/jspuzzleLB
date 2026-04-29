import React, { useState } from 'react';
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

const NewSolversBanner: React.FC<NewSolversBannerProps> = ({
  currentPuzzleProgress,
  generatedAt,
  monthlyParticipation,
}) => {
  const [dismissed, setDismissed] = useState(false);

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

      content = (
        <>
          <span className="banner-tag">NEW TODAY</span>
          {' '}
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
          {' '}joined the {puzzleLink} board
        </>
      );
    } else {
      const lastEntry = currentPuzzleProgress.timeline[currentPuzzleProgress.timeline.length - 1];
      const lastDate = new Date(lastEntry.timestamp);
      const crawlDateObj = new Date(crawlDate + 'T00:00:00Z');
      const diffDays = Math.floor((crawlDateObj.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      content = (
        <>
          {puzzleLink} · {currentPuzzleProgress.solverCount} solvers · last added {daysAgoText(diffDays)}
        </>
      );
    }
  } else if (monthlyParticipation && monthlyParticipation.length > 0) {
    const latest = monthlyParticipation[monthlyParticipation.length - 1];
    content = (
      <>
        {latest.month} · {latest.solvers} solvers this month
      </>
    );
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
