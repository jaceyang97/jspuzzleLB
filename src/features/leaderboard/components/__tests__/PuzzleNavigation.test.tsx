import React from 'react';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import PuzzleNavigation from '../PuzzleNavigation';
import { trackOnce } from '../../../../utils/analytics';

jest.mock('../../../../utils/analytics', () => ({ trackOnce: jest.fn() }));

const rect = (left: number, top: number, width: number, height: number): DOMRect => ({
  x: left, y: top, left, top, width, height, right: left + width, bottom: top + height,
  toJSON: () => ({}),
});

describe('PuzzleNavigation', () => {
  const originalWidth = window.innerWidth;
  const originalHeight = window.innerHeight;
  let anchor = rect(180, 20, 60, 28);
  let contentHeight = 400;

  beforeEach(() => {
    jest.clearAllMocks();
    anchor = rect(180, 20, 60, 28);
    contentHeight = 400;
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1000 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 700 });
    jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('intro-button') ? anchor : rect(0, 0, 440, contentHeight);
    });
    jest.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
      return this.classList.contains('intro-tooltip') ? contentHeight : 0;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    window.innerWidth = originalWidth;
    window.innerHeight = originalHeight;
  });

  test('provides the three navigation items and the introduction ranked by word count', () => {
    render(<PuzzleNavigation />);
    const navigation = screen.getByRole('navigation', { name: 'Puzzle navigation' });
    const intro = within(navigation).getByRole('button', { name: 'INTRO' });
    expect(within(intro).getByText('i')).toHaveAttribute('aria-hidden', 'true');
    expect(intro).toHaveAttribute('aria-expanded', 'false');
    expect(within(navigation).getByRole('link', { name: 'CURRENT PUZZLE' })).toHaveAttribute(
      'href', 'https://www.janestreet.com/puzzles/current-puzzle/'
    );
    expect(within(navigation).getByRole('link', { name: 'ARCHIVE' })).toHaveAttribute(
      'href', 'https://www.janestreet.com/puzzles/archive/'
    );
    fireEvent.click(intro);
    const dialog = screen.getByRole('dialog', { name: 'Introduction' });
    expect(dialog.id).toBe(intro.getAttribute('aria-controls'));
    expect(within(dialog).getAllByRole('row')).toHaveLength(6);
    const descriptions = within(dialog).getAllByRole('row').slice(1)
      .map((row) => within(row).getAllByRole('cell')[1].textContent || '');
    expect(descriptions.map((text) => text.trim().split(/\s+/).length)).toEqual([19, 14, 13, 8, 5]);
    expect(within(dialog).getByText('So, I ranked the introduction.')).toBeVisible();
    expect(within(dialog).queryByRole('button')).not.toBeInTheDocument();
    expect(trackOnce).toHaveBeenCalledWith('intro', 'intro_hover');
  });

  test('keyboard focus opens the dialog and Escape restores focus without reopening', () => {
    render(<PuzzleNavigation />);
    const intro = screen.getByRole('button', { name: 'INTRO' });
    act(() => intro.focus());
    const dialog = screen.getByRole('dialog', { name: 'Introduction' });
    fireEvent.keyDown(intro, { key: 'Tab' });
    expect(dialog).toHaveFocus();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(intro).toHaveFocus();
    expect(intro).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.focus(intro);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => screen.getByRole('link', { name: 'CURRENT PUZZLE' }).focus());
    act(() => intro.focus());
    expect(screen.getByRole('dialog', { name: 'Introduction' })).toBeVisible();
  });

  test('Tab and Shift+Tab follow INTRO, the dialog, and CURRENT PUZZLE in both directions', () => {
    const focus = HTMLElement.prototype.focus;
    jest.spyOn(HTMLElement.prototype, 'focus').mockImplementation(function (this: HTMLElement) {
      // Browsers cannot focus the portal while its first measurement is hidden.
      if (this.style.visibility !== 'hidden') focus.call(this);
    });
    render(<PuzzleNavigation />);
    const intro = screen.getByRole('button', { name: 'INTRO' });
    act(() => intro.focus());
    fireEvent.keyDown(intro, { key: 'Tab' });
    expect(screen.getByRole('dialog')).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab' });
    const currentPuzzle = screen.getByRole('link', { name: 'CURRENT PUZZLE' });
    expect(currentPuzzle).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.keyDown(currentPuzzle, { key: 'Tab', shiftKey: true });
    expect(screen.getByRole('dialog')).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Tab', shiftKey: true });
    expect(intro).toHaveFocus();
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  test('supports trigger toggle and outside-pointer dismissal without a close button', () => {
    render(<PuzzleNavigation />);
    const intro = screen.getByRole('button', { name: 'INTRO' });
    fireEvent.click(intro);
    const dialog = screen.getByRole('dialog');
    fireEvent.pointerDown(dialog);
    expect(dialog).toBeVisible();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(intro);
    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.click(intro);
    expect(intro).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(intro);
    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.click(intro);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('keeps the introduction open while crossing the hover gap and permits another visit', () => {
    jest.useFakeTimers();
    render(<PuzzleNavigation />);
    const intro = screen.getByRole('button', { name: 'INTRO' });
    fireEvent.mouseEnter(intro);
    const dialog = screen.getByRole('dialog');
    fireEvent.mouseLeave(intro, { relatedTarget: document.body });
    act(() => jest.advanceTimersByTime(50));
    fireEvent.mouseEnter(dialog);
    act(() => jest.advanceTimersByTime(200));
    expect(dialog).toBeVisible();
    fireEvent.mouseLeave(dialog, { relatedTarget: document.body });
    act(() => jest.advanceTimersByTime(150));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.mouseEnter(intro);
    expect(screen.getByRole('dialog')).toBeVisible();
  });

  test('keeps tall copy within phone and landscape viewport bounds after resize', () => {
    window.innerWidth = 280;
    window.innerHeight = 667;
    contentHeight = 760;
    anchor = rect(230, 540, 40, 28);
    render(<PuzzleNavigation />);
    fireEvent.click(screen.getByRole('button', { name: 'INTRO' }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveStyle({ position: 'fixed', left: '12px', top: '12px', width: '256px', maxHeight: '643px', overflowY: 'auto' });

    window.innerWidth = 844;
    window.innerHeight = 300;
    anchor = rect(760, 235, 60, 28);
    fireEvent(window, new Event('resize'));
    expect(dialog).toHaveStyle({ left: '392px', top: '12px', width: '440px', maxHeight: '276px' });
    expect(within(dialog).getByText('So, I ranked the introduction.')).toBeVisible();
  });
});
