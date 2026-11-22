import React from 'react';
import '@testing-library/jest-dom';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    if (this.classList.contains('ui-tooltip-anchor') || this.tagName === 'BUTTON') return anchorBounds;
    if (this.classList.contains('ui-tooltip-portal')) return rect(0, 0, Math.min(240, window.innerWidth - 16), 180);
    if (this.classList.contains('clip')) return rect(0, 0, 320, 120);
    return rect(0, 0, 0, 0);
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

test('delays the first hover by 400ms', () => {
  const { button } = fixture();
  fireEvent.pointerEnter(button, { pointerType: 'mouse' });
  act(() => jest.advanceTimersByTime(399));
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  act(() => jest.advanceTimersByTime(1));
  expect(screen.getByRole('tooltip')).toBeVisible();
});

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
  expect(document.getElementById(button.getAttribute('aria-describedby') ?? '')).not.toBeVisible();
});

test('flips above near the bottom and clamps the right edge', () => {
  anchorBounds = rect(290, 210, 20, 20);
  render(<Tooltip content="Long explanation" rich><button>Info</button></Tooltip>);
  fireEvent.focus(screen.getByRole('button'));
  expect(screen.getByRole('tooltip')).toHaveStyle({ left: '72px', top: '22px', position: 'fixed' });
  expect(screen.getByRole('tooltip')).toHaveAttribute('data-side', 'top');
});

test('wraps and constrains tall content to a narrow viewport', () => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 180 });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 150 });
  anchorBounds = rect(150, 4, 20, 20);
  render(<Tooltip content="Very long explanation" rich><button>Info</button></Tooltip>);
  fireEvent.focus(screen.getByRole('button'));
  const tip = screen.getByRole('tooltip');
  expect(tip).toHaveStyle({ left: '8px', top: '32px' });
  expect(tip.style.getPropertyValue('--available-height')).toBe('110px');
});

test('repositions on nested scroll and hides when the anchor is clipped out', async () => {
  jest.useRealTimers();
  const { button, container } = fixture();
  fireEvent.focus(button);
  const tip = screen.getByRole('tooltip');
  anchorBounds = rect(90, 70, 30, 20);
  fireEvent.scroll(container.firstChild!);
  await waitFor(() => expect(tip).toHaveStyle({ top: '98px' }));
  anchorBounds = rect(90, 130, 30, 20);
  fireEvent(container.querySelector('.ui-tooltip-anchor')!, new CustomEvent('test-intersection', { detail: false }));
  fireEvent.scroll(container.firstChild!);
  expect(tip).toHaveAttribute('data-anchor-clipped');
});

test('lets a pointer cross the gap into the bubble and dismisses it on leaving', async () => {
  jest.useRealTimers();
  const { button } = fixture({ openDelay: 30 });
  fireEvent.pointerEnter(button, { pointerType: 'mouse' });
  const tip = await screen.findByRole('tooltip');
  fireEvent.pointerLeave(button, { relatedTarget: tip, pointerType: 'mouse' });
  fireEvent.pointerEnter(tip, { relatedTarget: button, pointerType: 'mouse' });
  expect(tip).toBeVisible();
  fireEvent.pointerLeave(tip, { relatedTarget: document.body, pointerType: 'mouse' });
  fireEvent.mouseLeave(tip, { relatedTarget: document.body });
  fireEvent.pointerMove(document.body, { pointerType: 'mouse', clientX: 310, clientY: 250 });
  await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
});

test('mouse clicks do not leave a persistent keyboard-focus bubble', () => {
  const { button } = fixture();
  fireEvent.pointerEnter(button, { pointerType: 'mouse' });
  fireEvent.pointerDown(button, { pointerType: 'mouse' });
  act(() => button.focus());
  expect(screen.getByRole('tooltip')).toBeVisible();
  fireEvent.pointerLeave(button, { relatedTarget: document.body, pointerType: 'mouse' });
  fireEvent.pointerMove(document.body, { pointerType: 'mouse', clientX: 310, clientY: 250 });
  fireEvent.mouseMove(document.body, { clientX: 310, clientY: 250 });
  act(() => { jest.advanceTimersByTime(150); });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

test('keyboard focus stays open until Escape, without moving focus', () => {
  const { button } = fixture();
  act(() => button.focus());
  fireEvent.pointerLeave(button, { relatedTarget: document.body, pointerType: 'mouse' });
  fireEvent.pointerMove(document.body, { pointerType: 'mouse', clientX: 310, clientY: 250 });
  fireEvent.mouseMove(document.body, { clientX: 310, clientY: 250 });
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
  const { button } = fixture();
  act(() => button.focus());
  fireEvent.pointerDown(button);
  fireEvent.blur(button);
  fireEvent.focus(button);
  fireEvent.pointerLeave(button, { relatedTarget: document.body, pointerType: 'mouse' });
  fireEvent.pointerMove(document.body, { pointerType: 'mouse', clientX: 310, clientY: 250 });
  fireEvent.mouseMove(document.body, { clientX: 310, clientY: 250 });
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

test('opens an immediate styled tooltip inside its native dialog layer', () => {
  render(<dialog open aria-label="Profile"><Tooltip content="Placement explanation" surfaceClassName="puzzle-info-tooltip" openDelay={0}><button>Placement help</button></Tooltip></dialog>);
  const dialog = screen.getByRole('dialog', { name: 'Profile' });
  const button = screen.getByRole('button', { name: 'Placement help' });
  fireEvent.pointerEnter(button, { pointerType: 'mouse' });
  const tip = screen.getByRole('tooltip');
  expect(tip.parentElement).toBe(dialog);
  expect(tip).toHaveClass('puzzle-info-tooltip');
  fireEvent.keyDown(button, { key: 'Escape' });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  expect(dialog).toHaveAttribute('open');
});
