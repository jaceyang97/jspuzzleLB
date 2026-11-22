import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@ui-sdk/react/popover';
import React, { useLayoutEffect, useRef, useState } from 'react';
import { trackOnce } from '../../../utils/analytics';

type NavigationItem = 'intro' | 'current' | 'archive';

interface PuzzleNavigationProps {
  selectedItem?: NavigationItem | null;
  onItemSelect?: (item: NavigationItem) => void;
}

const PuzzleNavigation: React.FC<PuzzleNavigationProps> = ({ selectedItem = 'intro', onItemSelect }) => {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const nextLink = useRef<HTMLAnchorElement>(null);
  const focusPanel = useRef(false);
  const suppressFocus = useRef(false);
  const pointerPress = useRef(false);
  const show = () => { setOpen(true); trackOnce('intro', 'intro_hover'); };

  useLayoutEffect(() => {
    if (open && focusPanel.current) {
      focusPanel.current = false;
      panel.current?.focus();
    }
  }, [open]);

  return <nav className="puzzle-navigation" aria-label="Puzzle navigation">
    <Popover open={open} openOnHover delay={0} closeDelay={150} onOpenChange={(next, details) => {
      if (next) show();
      else { suppressFocus.current = details.reason === 'escape-key' || details.reason === 'trigger-press'; setOpen(false); }
    }}>
      <div className="intro-container">
        <PopoverTrigger ref={button} className="intro-button" aria-label="INTRO"
          aria-current={selectedItem === 'intro' ? 'page' : undefined}
          onPointerDown={() => { pointerPress.current = true; }}
          onPointerCancel={() => { pointerPress.current = false; }}
          onClick={() => { pointerPress.current = false; onItemSelect?.('intro'); }}
          onFocus={() => { if (!pointerPress.current && !suppressFocus.current) show(); }}
          onBlur={() => { pointerPress.current = false; suppressFocus.current = false; }}
          onKeyDown={event => {
            if (event.key === 'Tab' && !event.shiftKey && open) { event.preventDefault(); panel.current?.focus(); }
          }}>INTRO <span className="panel-info-marker intro-info-marker" aria-hidden="true">i</span></PopoverTrigger>
      </div>
      <PopoverContent ref={panel} className="intro-tooltip puzzle-intro-tooltip" aria-label="Introduction"
        side="bottom" align="start" sideOffset={8} collisionPadding={12} initialFocus="none" tabIndex={-1}
        onKeyDown={event => {
          if (event.key !== 'Tab') return;
          event.preventDefault();
          if (event.shiftKey) button.current?.focus();
          else { setOpen(false); nextLink.current?.focus(); }
        }}>
        <PopoverTitle className="lab-visually-hidden">Introduction</PopoverTitle>
        <table className="intro-leaderboard-table">
          <thead><tr><th scope="col">Rank</th><th scope="col">Description</th></tr></thead>
          <tbody>
            {/* Word counts descend with rank: 19, 14, 13, 8, 5. Keep the mechanism implicit. */}
            <tr><td>1</td><td>I wanted a way to follow Jane Street’s puzzle solvers without keeping a collection of lists in my head.</td></tr>
            <tr><td>2</td><td>Some names appeared once. Others kept returning. I wanted to see the whole record.</td></tr>
            <tr><td>3</td><td>The puzzles are theirs. The urge to put everything in order is mine.</td></tr>
            <tr><td>4</td><td>This seemed like a reasonable use of code.</td></tr>
            <tr><td>5</td><td><strong>So, I ranked the introduction.</strong></td></tr>
          </tbody>
        </table>
      </PopoverContent>
    </Popover>
    <a ref={nextLink} className="js-nav-link"
      aria-current={selectedItem === 'current' ? 'true' : undefined} onClick={() => onItemSelect?.('current')}
      onKeyDown={event => {
        if (event.key !== 'Tab' || !event.shiftKey) return;
        event.preventDefault();
        if (panel.current) panel.current.focus();
        else { focusPanel.current = true; show(); }
      }}
      href="https://www.janestreet.com/puzzles/current-puzzle/" target="_blank" rel="noopener noreferrer">CURRENT PUZZLE</a>
    <a className="js-nav-link" aria-current={selectedItem === 'archive' ? 'true' : undefined}
      onClick={() => onItemSelect?.('archive')} href="https://www.janestreet.com/puzzles/archive/" target="_blank" rel="noopener noreferrer">ARCHIVE</a>
  </nav>;
};

export default PuzzleNavigation;
