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
      if (this.classList.contains('banner-more-trigger')) return rect(triggerLeft, 83, 56, 28);
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

  test('header activity exposes every solver and the puzzle link without a separate banner', () => {
    render(<NewSolversBanner inline currentPuzzleProgress={progress} generatedAt="2026-09-06T09:00:00Z" />);
    const trigger = screen.getByRole('button', { name: '3 solvers added today. View activity' });
    fireEvent.click(trigger);
    const popover = screen.getByRole('region', { name: 'Solvers added today' });
    names.forEach((name) => expect(within(popover).getByText(name)).toBeVisible());
    expect(within(popover).getByRole('link', { name: 'Hint Singles' })).toHaveAttribute('href', 'https://www.janestreet.com/puzzles/current-puzzle/');
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
  let callbacks: Set<() => void>;
  let disconnect: jest.Mock;

  beforeEach(() => {
    containerWidth = 640;
    callbacks = new Set();
    disconnect = jest.fn();
    window.ResizeObserver = jest.fn().mockImplementation((callback: () => void) => {
      callbacks.add(callback);
      return { observe: jest.fn(), disconnect: () => { callbacks.delete(callback); disconnect(); } };
    });
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains('header-activity')) return rect(0, 0, containerWidth, 44);
      if (this.classList.contains('banner-tag')) return rect(0, 0, 70, 20);
      if (this.classList.contains('header-activity-chevron')) return rect(0, 0, 12, 20);
      if (this.classList.contains('header-activity-icon')) return rect(0, 0, 18, 20);
      if (this.classList.contains('header-activity-more')) return rect(0, 0, 16, 20);
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
    const trigger = screen.getByRole('button', { name: '8 solvers added today. View activity' });
    expect(shownNames(trigger)).toEqual(allNames.slice(0, 4));
    expect(within(trigger).getByText('+4')).toBeVisible();

    for (const [width, count] of [[480, 3], [370, 2], [250, 1], [160, 0], [640, 4]]) {
      resizeContainer(width);
      expect(shownNames(trigger)).toEqual(allNames.slice(0, count));
      expect(within(trigger).getByText(`+${allNames.length - count}`)).toBeVisible();
      expect(window.innerWidth).toBe(viewportWidth);
    }
    const staleCallback = Array.from(callbacks)[0];
    view.unmount();
    act(() => { staleCallback(); });
    expect(callbacks.size).toBe(0);
    expect(disconnect).toHaveBeenCalled();
  });

  test('accounts for the optional announcement icon and has no remainder when all names fit', () => {
    containerWidth = 440;
    const smallProgress = { ...today, solverCount: 3, timeline: today.timeline.slice(0, 3) };
    const view = render(<NewSolversBanner inline currentPuzzleProgress={smallProgress} generatedAt="2026-09-06T09:00:00Z" />);
    const trigger = screen.getByRole('button', { name: '3 solvers added today. View activity' });
    expect(shownNames(trigger)).toEqual(allNames.slice(0, 3));
    expect(trigger.querySelector('.header-activity-more')).not.toBeInTheDocument();

    view.rerender(<NewSolversBanner inline currentPuzzleProgress={smallProgress} generatedAt="2026-09-06T09:00:00Z"
      announcementIcon={<svg data-testid="announcement-icon" />} />);
    expect(screen.getByTestId('announcement-icon').closest('.header-activity-icon')).toHaveAttribute('aria-hidden', 'true');
    expect(shownNames(trigger)).toEqual(allNames.slice(0, 2));
    expect(within(trigger).getByText('+1')).toBeVisible();
    resizeContainer(460);
    expect(shownNames(trigger)).toEqual(allNames.slice(0, 3));
    expect(trigger.querySelector('.header-activity-more')).not.toBeInTheDocument();
  });

  test('keeps the complete dropdown list and closes on Escape, outside pointer, or focus leaving', () => {
    containerWidth = 250;
    render(<><NewSolversBanner inline currentPuzzleProgress={today} generatedAt="2026-09-06T09:00:00Z" /><button>Elsewhere</button></>);
    const trigger = screen.getByRole('button', { name: '8 solvers added today. View activity' });
    fireEvent.click(trigger);
    let popover = screen.getByRole('region', { name: 'Solvers added today' });
    expect(within(popover).getAllByRole('listitem')).toHaveLength(8);
    allNames.forEach((name) => expect(within(popover).getByText(name)).toBeVisible());
    fireEvent.keyDown(within(popover).getByRole('list'), { key: 'Escape' });
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    popover = screen.getByRole('region', { name: 'Solvers added today' });
    fireEvent.blur(within(popover).getByRole('list'), { relatedTarget: screen.getByRole('button', { name: 'Elsewhere' }) });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
