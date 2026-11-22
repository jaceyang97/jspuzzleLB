import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '@ui-sdk/react/popover';
import { Button } from '@ui-sdk/react/button';
import React, { ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LeaderboardData } from '../types';
import Tooltip from '../../../components/Tooltip';
import { trackEvent } from '../../../utils/analytics';
import { solverInitial } from '../../../utils/solverInitial';
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
  compact?: boolean;
  inline?: boolean;
  announcementIcon?: ReactNode;
  puzzleContext?: ReactNode;
  onSolverClick?: (name: string) => void;
}

function daysAgoText(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

const SolverChip: React.FC<{ name: string; colors: ChipColor; onClick?: () => void }> = ({ name, colors, onClick }) => {
  const content = <>
    <span
      className="solver-chip-initial"
      style={{ backgroundColor: colors.bg, color: colors.text }}
    >
      {solverInitial(name)}
    </span>
    <span className="solver-chip-name">{name}</span>
  </>;
  return onClick
    ? <Button type="button" className="solver-chip solver-chip-button" aria-label={`Open profile for ${name}`} onClick={onClick}>{content}</Button>
    : <span className="solver-chip">{content}</span>;
};

const NewSolversBanner: React.FC<NewSolversBannerProps> = ({
  currentPuzzleProgress,
  generatedAt,
  monthlyParticipation,
  compact = false,
  inline = false,
  announcementIcon,
  puzzleContext,
  onSolverClick,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [animateMore, setAnimateMore] = useState(false);
  const [inlineVisibleCount, setInlineVisibleCount] = useState(1);
  const activityRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLSpanElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const morePopoverRef = useRef<HTMLDivElement>(null);
  const todaysSolvers = useMemo(() => {
    const crawlDate = generatedAt?.slice(0, 10);
    return crawlDate ? currentPuzzleProgress?.timeline.filter((entry) => entry.timestamp.slice(0, 10) === crawlDate) ?? [] : [];
  }, [currentPuzzleProgress, generatedAt]);
  const inlineNames = useMemo(() => todaysSolvers.map((entry) => entry.solver), [todaysSolvers]);
  const selectInlineSolver = (name: string, returnTarget?: HTMLButtonElement | null) => {
    returnTarget?.focus({ preventScroll: true });
    setMoreOpen(false);
    onSolverClick?.(name);
  };

  useLayoutEffect(() => {
    if (!inline || dismissed || !inlineNames.length) return;
    const container = activityRef.current;
    const row = rowRef.current;
    const measurement = measurementRef.current;
    if (!container || !row || !measurement) return;
    let active = true;
    const fitNames = () => {
      if (!active) return;
      const width = container.getBoundingClientRect().width;
      if (width <= 0) return;
      const rowStyle = window.getComputedStyle(row);
      const preview = row.querySelector<HTMLElement>('.header-activity-preview');
      if (!preview) return;
      const previewStyle = window.getComputedStyle(preview);
      const px = (value: string) => Number.parseFloat(value) || 0;
      const rowGap = px(rowStyle.columnGap || rowStyle.gap);
      const chipGap = px(previewStyle.columnGap || previewStyle.gap);
      const fixed = Array.from(row.querySelectorAll<HTMLElement>('[data-activity-fixed]'))
        .filter((element) => window.getComputedStyle(element).display !== 'none');
      const contextWidth = rowStyle.flexDirection === 'column' ? 0
        : fixed.reduce((sum, element) => sum + element.getBoundingClientRect().width, 0) + fixed.length * rowGap;
      const available = width - px(rowStyle.paddingLeft) - px(rowStyle.paddingRight) - contextWidth;
      const chips = Array.from(measurement.querySelectorAll<HTMLElement>('.solver-chip'));
      let count = 0;
      for (let candidate = Math.min(4, inlineNames.length); candidate > 0; candidate -= 1) {
        const remaining = inlineNames.length - candidate;
        const remainder = measurement.querySelector<HTMLElement>(`[data-remainder="${remaining}"]`);
        const required = chips.slice(0, candidate).reduce((sum, chip) => sum + chip.getBoundingClientRect().width, 0)
          + chipGap * (candidate - 1)
          + (remaining > 0 ? chipGap + (remainder?.getBoundingClientRect().width ?? 0) : 0);
        if (required <= available) {
          count = candidate;
          break;
        }
      }
      setInlineVisibleCount((previous) => previous === count ? previous : count);
    };
    fitNames();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fitNames);
    observer?.observe(container);
    observer?.observe(measurement);
    window.addEventListener('resize', fitNames);
    document.fonts?.ready.then(fitNames);
    return () => {
      active = false;
      observer?.disconnect();
      window.removeEventListener('resize', fitNames);
    };
  }, [inline, dismissed, inlineNames, announcementIcon, puzzleContext]);

  useEffect(() => {
    if (inline && inlineVisibleCount >= inlineNames.length) setMoreOpen(false);
  }, [inline, inlineVisibleCount, inlineNames.length]);

  useEffect(() => {
    const trigger = moreButtonRef.current;
    if (!moreOpen || !trigger || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) return;
      if (morePopoverRef.current?.contains(document.activeElement)) trigger.focus({ preventScroll: true });
      setMoreOpen(false);
    });
    observer.observe(trigger);
    return () => observer.disconnect();
  }, [moreOpen]);

  if (dismissed) return null;

  let content: React.ReactNode;

  if (currentPuzzleProgress && generatedAt && currentPuzzleProgress.timeline.length > 0) {
    const crawlDate = generatedAt.slice(0, 10);

    const puzzleLink = (
      <Tooltip content={`Open "${currentPuzzleProgress.puzzleName}" on janestreet.com`}>
        <a
          href="https://www.janestreet.com/puzzles/current-puzzle/"
          target="_blank"
          rel="noopener noreferrer"
          className="banner-puzzle-link"
        >
          {currentPuzzleProgress.puzzleName}
        </a>
      </Tooltip>
    );

    if (todaysSolvers.length > 0) {
      const names = todaysSolvers.map((e) => e.solver);
      if (inline) {
        return (
          <Popover open={moreOpen} onOpenChange={(open, details) => {
            if (details.reason === 'trigger-press') {
              setAnimateMore(details.event instanceof MouseEvent && details.event.detail > 0);
            } else if (details.reason === 'escape-key' || details.reason === 'focus-out') {
              setAnimateMore(false);
            }
            setMoreOpen(open);
          }}>
            <div ref={activityRef} className="header-activity" role="region" aria-label="Puzzle activity">
              <div ref={rowRef} className="header-activity-row">
                {puzzleContext && <span className="header-activity-context" data-activity-fixed>{puzzleContext}</span>}
                <span className="banner-tag" data-activity-fixed>NEW TODAY</span>
                {announcementIcon && <span className="header-activity-icon" data-activity-fixed aria-hidden="true">{announcementIcon}</span>}
                <span className="header-activity-preview">
                  {names.slice(0, inlineVisibleCount).map((name, index) => (
                    <SolverChip key={`${name}-${index}`} name={name} colors={VISIBLE_PALETTE[index % VISIBLE_PALETTE.length]}
                      onClick={() => selectInlineSolver(name)} />
                  ))}
                  {names.length > inlineVisibleCount && <PopoverTrigger ref={moreButtonRef} className="header-activity-more"
                    aria-label={`${names.length - inlineVisibleCount} more solvers added today`}>+{names.length - inlineVisibleCount}</PopoverTrigger>}
                </span>
              </div>
              <span className="header-activity-measure" aria-hidden="true"
                style={{ position: 'absolute', visibility: 'hidden', pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden' }}>
                <span ref={measurementRef} className="header-activity-preview"
                  style={{ width: 'max-content', maxWidth: 'none', flex: 'none' }}>
                  {names.slice(0, 4).map((name, index) => (
                    <SolverChip key={`${name}-${index}`} name={name} colors={VISIBLE_PALETTE[index % VISIBLE_PALETTE.length]} />
                  ))}
                  {names.slice(0, 4).map((_, index) => {
                    const remaining = names.length - index - 1;
                    return remaining > 0 ? <span key={remaining} className="header-activity-more" data-remainder={remaining}>+{remaining}</span> : null;
                  })}
                </span>
              </span>
              <PopoverContent ref={morePopoverRef} className="banner-more-tooltip banner-more-popover header-activity-popover"
                aria-label="More solvers added today" initialFocus="none"
                side="bottom" align="start" alignOffset={-12} sideOffset={8} collisionPadding={12}
                data-animate={animateMore || undefined}>
                <PopoverTitle className="lab-visually-hidden">More solvers added today</PopoverTitle>
                <ul className="banner-more-list" tabIndex={0}>
                  {names.slice(inlineVisibleCount).map((name, index) => <li key={`${name}-${index}`}
                    style={{ '--solver-index': Math.min(index, 5) } as React.CSSProperties}>
                    <SolverChip name={name} colors={colorFromName(name, HIDDEN_PALETTE)} onClick={() => selectInlineSolver(name, moreButtonRef.current)} />
                  </li>)}
                </ul>
              </PopoverContent>
            </div>
          </Popover>
        );
      }
      const visibleCount = compact ? 1 : 5;
      const visible = names.slice(0, visibleCount);
      const hidden = names.slice(visibleCount);

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
            {!compact && hidden.length > 0 && <span className="solver-chip-and">and</span>}
          </span>
          {hidden.length > 0 && <Popover open={moreOpen} onOpenChange={setMoreOpen} openOnHover={!compact} delay={0} closeDelay={140}>
            <span className={`banner-more${compact ? ' banner-more-compact' : ''}`}>
              <PopoverTrigger ref={moreButtonRef} className="banner-more-trigger"
                aria-label={`${hidden.length} more solvers added today`}
                onFocus={() => { if (!compact) setMoreOpen(true); }}>
                {hidden.length} more
              </PopoverTrigger>
              <PopoverContent ref={morePopoverRef} className="banner-more-tooltip banner-more-popover"
                aria-label="More solvers added today" side="bottom" sideOffset={8} collisionPadding={12} initialFocus="none">
                <span className="banner-more-tooltip-label">Also joined today</span>
                <PopoverTitle className="lab-visually-hidden">More solvers added today</PopoverTitle>
                <ul className="banner-more-list" tabIndex={0}>
                  {hidden.map(name => <li key={name}><SolverChip name={name} colors={colorFromName(name, HIDDEN_PALETTE)} /></li>)}
                </ul>
              </PopoverContent>
            </span>
          </Popover>}
        </>
      );

      content = (
        <>
          <span className="banner-tag">NEW TODAY</span>
          {' '}
          {compact ? (
            <>{namesNode}<span className="banner-compact-separator" aria-hidden="true"> · </span>{puzzleLink}</>
          ) : <>{namesNode} solved {puzzleLink}</>}
        </>
      );
    } else {
      const lastEntry = currentPuzzleProgress.timeline[currentPuzzleProgress.timeline.length - 1];
      const lastDate = new Date(lastEntry.timestamp);
      const crawlDateObj = new Date(crawlDate + 'T00:00:00Z');
      const diffDays = Math.floor((crawlDateObj.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (inline) {
        content = <><span className="activity-dot" aria-hidden="true" /><span className="header-activity-fallback-name">{puzzleLink} · </span>{currentPuzzleProgress.solverCount.toLocaleString()} solvers</>;
      } else content = <>{puzzleLink} · {currentPuzzleProgress.solverCount.toLocaleString()} solvers · last added {daysAgoText(diffDays)}</>;
    }
  } else if (monthlyParticipation && monthlyParticipation.length > 0) {
    const latest = monthlyParticipation[monthlyParticipation.length - 1];
    content = <>{latest.month} · {latest.solvers.toLocaleString()} solvers</>;
  } else {
    return null;
  }

  return (
    <div
      className={inline ? 'header-activity header-activity-fallback' : `new-solvers-banner${compact ? ' new-solvers-banner--compact' : ''}`}
      role="region"
      aria-label="Puzzle activity"
    >
      <span className="banner-text">{content}</span>
      {!inline && <Button
        type="button"
        className="banner-dismiss"
        onClick={() => {
          trackEvent('banner_dismiss');
          setDismissed(true);
        }}
        aria-label="Dismiss banner"
      >
        ×
      </Button>}
    </div>
  );
};

export default NewSolversBanner;
