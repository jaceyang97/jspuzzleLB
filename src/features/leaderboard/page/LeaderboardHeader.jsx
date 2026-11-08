import React, { useState } from 'react';
import HeaderTitle from '../../../components/HeaderTitle';
import PuzzleNavigation from '../components/PuzzleNavigation';
import PersonalThemeButton from './PersonalThemeButton';
import { UpdatedDate } from './HeaderUtilities';
import CurrentPuzzleNotice from './CurrentPuzzleNotice';

export default function LeaderboardHeader({ data, theme, toggleTheme, onSelect }) {
  const [selectedItem, setSelectedItem] = useState(null);
  return <header className="leaderboard-header lh--flanked lh--selected lh--final" aria-label="Leaderboard header">
    <div className="lh-main">
      <div className="lh-navigation"><PuzzleNavigation selectedItem={selectedItem} onItemSelect={setSelectedItem} /></div>
      <div className="lh-brand"><a className="lh-logo" href="https://github.com/jaceyang97/practices/blob/main/artworks/p31.js" target="_blank" rel="noreferrer" aria-label="View the original logo artwork in p5.js"><img src={theme === 'dark' ? '/js_puzzle_solver_logo_dark.svg' : '/js_puzzle_solver_logo.svg'} alt="" width="88" height="88" /></a><HeaderTitle /></div>
      <div className="lh-tools"><UpdatedDate generatedAt={data.generatedAt} /><PersonalThemeButton theme={theme} onToggle={toggleTheme} /></div>
    </div>
    <CurrentPuzzleNotice data={data} onSelect={onSelect} />
  </header>;
}
