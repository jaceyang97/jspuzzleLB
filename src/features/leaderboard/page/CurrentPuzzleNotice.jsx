import React from 'react';
import NewSolversBanner from '../components/NewSolversBanner';
import { AnnouncementIcon } from '../../../components/icons/AnnouncementIcon';
import './styles/current-puzzle-notice.css';

export function PuzzleActivityLink({ puzzleName }) {
  return <a className="current-puzzle-context" href="https://www.janestreet.com/puzzles/current-puzzle/" target="_blank" rel="noreferrer" aria-label={`Open current puzzle: ${puzzleName}`}>
    <span className="lh-announcement-icon" aria-hidden="true"><AnnouncementIcon variant="ink-cutout" /></span>
    <span className="current-puzzle-new">NEW TODAY</span><span className="current-puzzle-for">for</span><span className="current-puzzle-title">{puzzleName}</span>
  </a>;
}

export default function CurrentPuzzleNotice({ data, onSelect }) {
  const progress = data.currentPuzzleProgress;
  const hasNew = data.generatedAt && progress?.timeline.some((entry) => entry.timestamp.slice(0, 10) === data.generatedAt.slice(0, 10));
  return <section className={`selected-notice current-puzzle-notice${hasNew ? ' current-puzzle-notice--new' : ''}`} aria-label="Current puzzle activity">
    <div className="lh-notice current-puzzle-content">
      <NewSolversBanner inline puzzleContext={hasNew ? <PuzzleActivityLink puzzleName={progress.puzzleName} /> : undefined} currentPuzzleProgress={progress} generatedAt={data.generatedAt} monthlyParticipation={data.monthlyParticipation} onSolverClick={onSelect} />
    </div>
  </section>;
}
