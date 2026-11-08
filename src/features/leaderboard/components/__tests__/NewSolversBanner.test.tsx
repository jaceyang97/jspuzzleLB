import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import NewSolversBanner from '../NewSolversBanner';
import { LeaderboardData } from '../../types';

jest.mock('../../../../utils/analytics', () => ({ trackEvent: jest.fn() }));

const names = ['A very long first solver name that wraps the banner', 'Ada Lovelace', 'Grace Hopper'];
const progress: NonNullable<LeaderboardData['currentPuzzleProgress']> = {
  puzzleName: 'Hint Singles',
  puzzleDate: 'Sep 2026',
  solverCount: names.length,
  timeline: names.map((solver) => ({ solver, timestamp: '2026-09-06T08:00:00Z' })),
};

describe('activity copy', () => {
  test('states who solved the puzzle without a random slogan', () => {
    render(<NewSolversBanner currentPuzzleProgress={progress} generatedAt="2026-09-06T09:00:00Z" />);
    expect(screen.getByRole('region', { name: 'Puzzle activity' })).toHaveTextContent('solved Hint Singles');
    names.forEach(name => expect(screen.getByText(name)).toBeVisible());
  });

  test('shows the total and last addition when nobody joined today', () => {
    const previousDay = { ...progress, timeline: names.map(solver => ({ solver, timestamp: '2026-09-05T00:00:00Z' })) };
    render(<NewSolversBanner currentPuzzleProgress={previousDay} generatedAt="2026-09-06T09:00:00Z" />);
    expect(screen.getByRole('region', { name: 'Puzzle activity' })).toHaveTextContent('Hint Singles · 3 solvers · last added yesterday');
  });

  test.each([{}, { compact: true }, { inline: true }])('shows the same monthly count in each layout: %j', layout => {
    render(<NewSolversBanner {...layout} monthlyParticipation={[{ month: 'Sep 2026', solvers: 1234 }]} />);
    expect(screen.getByRole('region', { name: 'Puzzle activity' })).toHaveTextContent('Sep 2026 · 1,234 solvers');
  });
});

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return { x: left, y: top, left, top, width, height, right: left + width,
    bottom: top + height, toJSON: () => ({}) };
}

describe('compact activity popover', () => {
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;
  let triggerLeft = 8;

  beforeEach(() => {
    triggerLeft = 8;
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 280 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 667 });
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('banner-more-trigger') || this.classList.contains('header-activity-more')) return rect(triggerLeft, 83, 56, 28);
      if (this.classList.contains('banner-more-tooltip')) return rect(0, 0, 200, 180);
      if (this.classList.contains('banner-more-list')) return rect(0, 0, 176, 140);
      return rect(0, 0, 0, 0);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    window.innerWidth = originalWidth;
    window.innerHeight = originalHeight;
  });

  function openNames() {
    render(<NewSolversBanner compact currentPuzzleProgress={progress} generatedAt="2026-09-06T09:00:00Z" />);
    const trigger = screen.getByRole('button', { name: '2 more solvers added today' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    const popover = screen.getByRole('region', { name: 'More solvers added today' });
    return { trigger, popover };
  }

  test('keeps the complete names list inside a 280px viewport when its trigger wraps to the left edge', () => {
    const { trigger, popover } = openNames();

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(popover).toHaveStyle({ position: 'fixed', left: '12px', top: '119px', maxWidth: '256px', transform: 'none' });
    expect(within(popover).getByText('Ada Lovelace')).toBeVisible();
    expect(within(popover).getByText('Grace Hopper')).toBeVisible();
    expect(within(popover).getByRole('list')).toHaveAttribute('tabindex', '0');
  });

  test('clamps the right edge and repositions when the viewport resizes', () => {
    triggerLeft = 240;
    const { popover } = openNames();
    expect(popover).toHaveStyle({ left: '68px' });

    window.innerWidth = 320;
    fireEvent(window, new Event('resize'));
    expect(popover).toHaveStyle({ left: '108px', maxWidth: '296px' });
  });

  test('limits the list to the remaining screen height and preserves Escape and dismissal', () => {
    window.innerHeight = 250;
    const { trigger, popover } = openNames();
    const list = within(popover).getByRole('list');
    expect(popover).toHaveStyle({ maxHeight: '119px' });
    expect(list).toHaveStyle({ maxHeight: '79px' });

    fireEvent.keyDown(list, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('region', { name: 'More solvers added today' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss banner' }));
    expect(screen.queryByRole('region', { name: 'Puzzle activity' })).not.toBeInTheDocument();
  });

  test('header activity exposes remaining solvers without repeating the activity heading', () => {
    render(<NewSolversBanner inline currentPuzzleProgress={progress} generatedAt="2026-09-06T09:00:00Z" />);
    const trigger = screen.getByRole('button', { name: '2 more solvers added today' });
    fireEvent.click(trigger);
    const popover = screen.getByRole('region', { name: 'More solvers added today' });
    names.slice(1).forEach((name) => expect(within(popover).getByText(name)).toBeVisible());
    expect(within(popover).queryByText(names[0])).not.toBeInTheDocument();
    expect(within(popover).queryByRole('link', { name: 'Hint Singles' })).not.toBeInTheDocument();
    expect(within(popover).queryByText(/Added today/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Dismiss banner' })).not.toBeInTheDocument();
    fireEvent.keyDown(within(popover).getByRole('list'), { key: 'Escape' });
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('inline activity names', () => {
  const originalResizeObserver = window.ResizeObserver;
  const allNames = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Katherine Johnson', 'Edsger Dijkstra', 'Margaret Hamilton', 'Donald Knuth', 'Barbara Liskov'];
  const today: NonNullable<LeaderboardData['currentPuzzleProgress']> = {
    ...progress,
    solverCount: allNames.length,
    timeline: allNames.map((solver) => ({ solver, timestamp: '2026-09-06T08:00:00Z' })),
  };
  let containerWidth: number;
  let triggerTop: number;
  let callbacks: Set<() => void>;
  let disconnect: jest.Mock;

  beforeEach(() => {
    containerWidth = 640;
    triggerTop = 30;
    callbacks = new Set();
    disconnect = jest.fn();
    window.ResizeObserver = jest.fn().mockImplementation((callback: () => void) => {
      callbacks.add(callback);
      return { observe: jest.fn(), disconnect: () => { callbacks.delete(callback); disconnect(); } };
    });
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('header-activity')) return rect(0, 0, containerWidth, 44);
      if (this.classList.contains('banner-tag')) return rect(0, 0, 70, 20);
      if (this.classList.contains('header-activity-icon')) return rect(0, 0, 18, 20);
      if (this.classList.contains('header-activity-context')) return rect(0, 0, 100, 44);
      if (this.classList.contains('header-activity-more')) return rect(210, triggerTop, 32, 28);
      if (this.classList.contains('banner-more-tooltip')) return rect(0, 0, 200, 180);
      if (this.classList.contains('banner-more-list')) return rect(0, 0, 176, 140);
      if (this.classList.contains('solver-chip-name') && this.closest('.header-activity-popover')) return rect(16, 0, 100, 24);
      if (this.classList.contains('solver-chip')) {
        const name = this.querySelector('.solver-chip-name')?.textContent ?? '';
        return rect(0, 0, [110, 140, 90, 120][allNames.indexOf(name)] ?? 100, 24);
      }
      return rect(0, 0, 0, 0);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    window.ResizeObserver = originalResizeObserver;
  });

  const resizeContainer = (width: number) => {
    containerWidth = width;
    act(() => { callbacks.forEach((callback) => callback()); });
  };
  const shownNames = (trigger: HTMLElement) => Array.from(trigger.querySelectorAll('.solver-chip-name')).map((element) => element.textContent);

  test('fits up to four measured names to the actual container and keeps the remainder exact', () => {
    const viewportWidth = window.innerWidth;
    const view = render(<NewSolversBanner inline currentPuzzleProgress={today} generatedAt="2026-09-06T09:00:00Z" />);
    const row = screen.getByRole('region', { name: 'Puzzle activity' }).querySelector<HTMLElement>('.header-activity-row')!;
    expect(shownNames(row)).toEqual(allNames.slice(0, 4));
    expect(within(row).getByRole('button', { name: '4 more solvers added today' })).toHaveTextContent('+4');

    for (const [width, count] of [[480, 3], [370, 2], [250, 1], [160, 0], [640, 4]]) {
      resizeContainer(width);
      expect(shownNames(row)).toEqual(allNames.slice(0, count));
      expect(within(row).getByRole('button', { name: `${allNames.length - count} more solvers added today` })).toHaveTextContent(`+${allNames.length - count}`);
      expect(window.innerWidth).toBe(viewportWidth);
    }
    const staleCallback = Array.from(callbacks)[0];
    view.unmount();
    act(() => { staleCallback(); });
    expect(callbacks.size).toBe(0);
    expect(disconnect).toHaveBeenCalled();
  });

  test('reserves space for the puzzle context only when it shares the names row', () => {
    containerWidth = 500;
    render(<NewSolversBanner inline currentPuzzleProgress={today} generatedAt="2026-09-06T09:00:00Z"
      puzzleContext={<a href="https://www.janestreet.com/puzzles/current-puzzle/">Hint Singles</a>} />);
    const activity = screen.getByRole('region', { name: 'Puzzle activity' });
    const row = activity.querySelector<HTMLElement>('.header-activity-row')!;
    expect(shownNames(row)).toEqual(allNames.slice(0, 2));
    expect(within(row).getByRole('button', { name: '6 more solvers added today' })).toHaveTextContent('+6');

    row.style.flexDirection = 'column';
    resizeContainer(500);
    expect(shownNames(row)).toEqual(allNames.slice(0, 4));
    expect(within(row).getByRole('button', { name: '4 more solvers added today' })).toHaveTextContent('+4');
  });

  test('accounts for the optional announcement icon and has no remainder when all names fit', () => {
    containerWidth = 425;
    const smallProgress = { ...today, solverCount: 3, timeline: today.timeline.slice(0, 3) };
    const view = render(<NewSolversBanner inline currentPuzzleProgress={smallProgress} generatedAt="2026-09-06T09:00:00Z" />);
    const row = screen.getByRole('region', { name: 'Puzzle activity' }).querySelector<HTMLElement>('.header-activity-row')!;
    expect(shownNames(row)).toEqual(allNames.slice(0, 3));
    expect(row.querySelector('.header-activity-more')).not.toBeInTheDocument();

    view.rerender(<NewSolversBanner inline currentPuzzleProgress={smallProgress} generatedAt="2026-09-06T09:00:00Z"
      announcementIcon={<svg data-testid="announcement-icon" />} />);
    expect(screen.getByTestId('announcement-icon').closest('.header-activity-icon')).toHaveAttribute('aria-hidden', 'true');
    expect(shownNames(row)).toEqual(allNames.slice(0, 2));
    const more = within(row).getByRole('button', { name: '1 more solvers added today' });
    expect(more).toHaveTextContent('+1');
    fireEvent.click(more);
    expect(screen.getByRole('region', { name: 'More solvers added today' })).toBeVisible();
    resizeContainer(460);
    expect(shownNames(row)).toEqual(allNames.slice(0, 3));
    expect(row.querySelector('.header-activity-more')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'More solvers added today' })).not.toBeInTheDocument();
  });

  describe('scroll anchoring', () => {
    beforeEach(() => { jest.useFakeTimers(); });
    afterEach(() => { jest.useRealTimers(); });

    function openNames() {
      containerWidth = 250;
      render(<div data-testid="scroll-host"><NewSolversBanner inline currentPuzzleProgress={today} generatedAt="2026-09-06T09:00:00Z" /></div>);
      const trigger = screen.getByRole('button', { name: '7 more solvers added today' });
      fireEvent.click(trigger);
      return { trigger, popover: screen.getByRole('region', { name: 'More solvers added today' }) };
    }

    function scroll(target: HTMLElement | Window) {
      fireEvent.scroll(target);
      act(() => { jest.advanceTimersByTime(20); });
    }

    test('moves with its trigger during page scrolling', () => {
      const { popover } = openNames();
      triggerTop = 10;
      scroll(window);
      expect(popover).toHaveStyle({ left: '194px', top: '46px' });
    });

    test('also follows a scrolling ancestor', () => {
      const { popover } = openNames();
      triggerTop = 20;
      scroll(screen.getByTestId('scroll-host'));
      expect(popover).toHaveStyle({ top: '56px' });
    });

    test.each([-40, window.innerHeight + 10])('closes when the trigger leaves the viewport at %dpx', (top) => {
      const { trigger, popover } = openNames();
      within(popover).getAllByRole('button')[0].focus();
      triggerTop = top;
      scroll(window);
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(trigger).toHaveFocus();
      expect(screen.queryByRole('region', { name: 'More solvers added today' })).not.toBeInTheDocument();
    });

    test('stays open while scrolling the names list itself', () => {
      const { trigger, popover } = openNames();
      scroll(within(popover).getByRole('list'));
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(popover).toBeVisible();
    });
  });

  test('anchors only the remaining-name list to +N and closes on Escape, outside pointer, or focus leaving', () => {
    containerWidth = 250;
    render(<><NewSolversBanner inline currentPuzzleProgress={today} generatedAt="2026-09-06T09:00:00Z" /><button>Elsewhere</button></>);
    const trigger = screen.getByRole('button', { name: '7 more solvers added today' });
    fireEvent.click(trigger);
    let popover = screen.getByRole('region', { name: 'More solvers added today' });
    expect(popover).toHaveStyle({ left: '194px', top: '66px' });
    expect(within(popover).getAllByRole('listitem')).toHaveLength(7);
    allNames.slice(1).forEach((name) => expect(within(popover).getByRole('button', { name: `Open profile for ${name}` })).toBeVisible());
    expect(within(popover).queryByText(allNames[0])).not.toBeInTheDocument();
    fireEvent.keyDown(within(popover).getByRole('list'), { key: 'Escape' });
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    popover = screen.getByRole('region', { name: 'More solvers added today' });
    fireEvent.blur(within(popover).getByRole('list'), { relatedTarget: screen.getByRole('button', { name: 'Elsewhere' }) });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('name pills open profiles while only +N opens the dropdown', () => {
    const onSolverClick = jest.fn();
    render(<NewSolversBanner inline currentPuzzleProgress={today} generatedAt="2026-09-06T09:00:00Z" onSolverClick={onSolverClick} />);
    const activity = screen.getByRole('region', { name: 'Puzzle activity' });
    const more = screen.getByRole('button', { name: '4 more solvers added today' });
    const visibleName = screen.getByRole('button', { name: 'Open profile for Ada Lovelace' });
    expect(visibleName).toHaveAttribute('type', 'button');
    expect(activity.querySelector('.header-activity-chevron')).not.toBeInTheDocument();
    expect(activity.querySelector('.header-activity-measure button')).not.toBeInTheDocument();

    fireEvent.click(visibleName);
    expect(onSolverClick).toHaveBeenCalledWith('Ada Lovelace');
    expect(more).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByText('NEW TODAY'));
    expect(more).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(more);
    const popover = screen.getByRole('region', { name: 'More solvers added today' });
    expect(within(popover).getAllByRole('button').map((button) => button.getAttribute('aria-label'))).toEqual(
      allNames.slice(4).map((name) => `Open profile for ${name}`)
    );
    fireEvent.click(within(popover).getByRole('button', { name: 'Open profile for Edsger Dijkstra' }));
    expect(onSolverClick).toHaveBeenCalledTimes(2);
    expect(onSolverClick).toHaveBeenLastCalledWith('Edsger Dijkstra');
    expect(more).toHaveFocus();
    expect(more).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: 'More solvers added today' })).not.toBeInTheDocument();
  });
});
