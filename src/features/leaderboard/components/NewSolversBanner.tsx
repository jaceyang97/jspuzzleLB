import React, { useState } from 'react';
import { LeaderboardData } from '../types';

interface NewSolversBannerProps {
  currentPuzzleProgress?: LeaderboardData['currentPuzzleProgress'];
  generatedAt?: string;
  monthlyParticipation?: { month: string; solvers: number }[];
}

function formatNames(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function daysAgoText(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

const NewSolversBanner: React.FC<NewSolversBannerProps> = ({
  currentPuzzleProgress,
  generatedAt,
  monthlyParticipation,
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  let content: React.ReactNode;

  if (currentPuzzleProgress && generatedAt && currentPuzzleProgress.timeline.length > 0) {
    // We have timestamp data — find solvers added on the most recent crawl date
    const crawlDate = generatedAt.slice(0, 10); // YYYY-MM-DD in UTC
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
      const displayNames = names.length > 5
        ? [...names.slice(0, 5), `and ${names.length - 5} more`]
        : names;
      content = (
        <>
          <span className="banner-highlight">NEW TODAY</span>
          {' '}
          {formatNames(displayNames)} joined the {puzzleLink} board
        </>
      );
    } else {
      // No new solvers on latest crawl — show last added
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
    // No timestamp data — fallback to monthly count
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
