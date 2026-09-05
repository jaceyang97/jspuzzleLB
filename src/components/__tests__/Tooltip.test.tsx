import React from 'react';
import '@testing-library/jest-dom';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import Tooltip from '../Tooltip';

const rect = (left: number, top: number, width: number, height: number) => ({
  left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}),
});
let anchorBounds = rect(90, 30, 30, 20);
let clock = 1_700_000_000_000;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(clock += 1000);
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 260 });
  anchorBounds = rect(90, 30, 30, 20);
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains('ui-tooltip-anchor')) return anchorBounds;
    if (this.classList.contains('clip')) return rect(0, 0, 320, 120);
    return rect(0, 0, 0, 0);
  });
  jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('ui-tooltip-portal') ? 240 : 0;
  });
  jest.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (this: HTMLElement) {
    return this.hasAttribute('data-tooltip-content') ? 180 : 0;
  });
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); jest.useRealTimers(); });

function fixture(extra: Record<string, unknown> = {}) {
  const rendered = render(<div className="clip" style={{ overflowY: 'hidden', borderRadius: 12 }}>
    <Tooltip content="The complete explanation escapes its rounded card." rich {...extra}>
      <button>Information</button>
    </Tooltip>
  </div>);
  return { ...rendered, button: screen.getByRole('button'), anchor: rendered.container.querySelector('.ui-tooltip-anchor')! };
}

test('renders outside the clipped card and describes the focused button', () => {
  const { button, container, anchor } = fixture();
  fireEvent.focus(button);
  const tip = screen.getByRole('tooltip');
  expect(tip.parentElement).toBe(document.body);
  expect(container).not.toContainElement(tip);
  expect(button).toHaveAttribute('aria-describedby', tip.id);
  expect(anchor).not.toHaveAttribute('tabindex');
  fireEvent.blur(button);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  expect(button).not.toHaveAttribute('aria-describedby');
});

test('flips above near the bottom and clamps the right edge', () => {
  anchorBounds = rect(290, 210, 20, 20);
  render(<Tooltip content="Long explanation" rich><button>Info</button></Tooltip>);
  fireEvent.focus(screen.getByRole('button'));
  expect(screen.getByRole('tooltip')).toHaveStyle({ left: '72px', top: '22px', position: 'fixed' });
  expect(screen.getByRole('tooltip')).toHaveAttribute('data-placement', 'top');
});

test('wraps and constrains tall content to a narrow viewport', () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 180 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 150 });
  anchorBounds = rect(150, 4, 20, 20);
  render(<Tooltip content="Very long explanation" rich><button>Info</button></Tooltip>);
  fireEvent.focus(screen.getByRole('button'));
  expect(screen.getByRole('tooltip')).toHaveStyle({ left: '8px', top: '32px', maxWidth: '164px', maxHeight: '110px' });
});

test('repositions on nested scroll and hides when the anchor is clipped out', () => {
  const { button, container } = fixture();
  fireEvent.focus(button);
  const tip = screen.getByRole('tooltip');
  anchorBounds = rect(90, 70, 30, 20);
  fireEvent.scroll(container.firstChild!);
  expect(tip).toHaveStyle({ top: '98px' });
  anchorBounds = rect(90, 130, 30, 20);
  fireEvent.scroll(container.firstChild!);
  expect(tip).toHaveStyle({ visibility: 'hidden' });
});

test('lets a pointer move into the bubble and read it before dismissing', () => {
  const { anchor } = fixture();
  fireEvent.mouseEnter(anchor);
  act(() => { jest.advanceTimersByTime(399); });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  act(() => { jest.advanceTimersByTime(1); });
  const tip = screen.getByRole('tooltip');
  fireEvent.mouseLeave(anchor, { relatedTarget: document.body });
  act(() => { jest.advanceTimersByTime(80); });
  fireEvent.mouseEnter(tip);
  act(() => { jest.advanceTimersByTime(500); });
  expect(tip).toBeVisible();
  fireEvent.mouseLeave(tip, { relatedTarget: document.body });
  act(() => { jest.advanceTimersByTime(150); });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

test('mouse clicks do not leave a persistent keyboard-focus bubble', () => {
  const { anchor, button } = fixture();
  fireEvent.pointerDown(button);
  fireEvent.focus(button);
  expect(screen.getByRole('tooltip')).toBeVisible();
  fireEvent.mouseLeave(anchor, { relatedTarget: document.body });
  act(() => { jest.advanceTimersByTime(150); });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

test('keyboard focus stays open until Escape, without moving focus', () => {
  const { anchor, button } = fixture();
  act(() => button.focus());
  fireEvent.mouseLeave(anchor, { relatedTarget: document.body });
  act(() => { jest.advanceTimersByTime(500); });
  expect(screen.getByRole('tooltip')).toBeVisible();
  fireEvent.keyDown(button, { key: 'Escape' });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  expect(button).toHaveFocus();
});

test('touch opens immediately and an outside tap dismisses', () => {
  const { button } = fixture();
  const touch = new Event('pointerdown', { bubbles: true });
  Object.defineProperty(touch, 'pointerType', { value: 'touch' });
  fireEvent(button, touch);
  expect(screen.getByRole('tooltip')).toBeVisible();
  fireEvent.pointerDown(document.body);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

test('a pointer click on an already focused trigger does not poison later keyboard focus', () => {
  const { anchor, button } = fixture();
  act(() => button.focus());
  fireEvent.pointerDown(button);
  fireEvent.blur(button);
  fireEvent.focus(button);
  fireEvent.mouseLeave(anchor, { relatedTarget: document.body });
  act(() => { jest.advanceTimersByTime(150); });
  expect(screen.getByRole('tooltip')).toBeVisible();
});

test('keyboard users can enter overflowing content and return to the logical tab order', () => {
  render(<><Tooltip content="An explanation taller than its constrained viewport" rich><button>Help</button></Tooltip><button>Next control</button></>);
  const help = screen.getByRole('button', { name: 'Help' });
  act(() => help.focus());
  const content = screen.getByRole('tooltip').querySelector('[data-tooltip-content]')!;
  fireEvent.keyDown(help, { key: 'Tab' });
  expect(content).toHaveFocus();
  fireEvent.keyDown(content, { key: 'Tab', shiftKey: true });
  expect(help).toHaveFocus();
  fireEvent.keyDown(help, { key: 'Tab' });
  fireEvent.keyDown(content, { key: 'Tab' });
  expect(screen.getByRole('button', { name: 'Next control' })).toHaveFocus();
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

test('retains existing accessible descriptions and focusable static labels', () => {
  render(<><span id="existing">Explanation already linked</span>
    <Tooltip content="Explanation already linked"><button aria-describedby="existing">Help</button></Tooltip>
    <Tooltip content="Label explanation">A static label</Tooltip></>);
  fireEvent.focus(screen.getByRole('button'));
  expect(screen.getByRole('button')).toHaveAttribute('aria-describedby', 'existing');
  expect(screen.getByText('A static label')).toHaveAttribute('tabindex', '0');
});
