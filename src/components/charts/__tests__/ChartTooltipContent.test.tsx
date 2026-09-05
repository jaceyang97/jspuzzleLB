import React from 'react';
import '@testing-library/jest-dom';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import ChartTooltipContent from '../ChartTooltipContent';

const payload = [{ name: 'solvers', value: 1234, dataKey: 'solvers', color: '#555' }];
const props = { active: true, payload, coordinate: { x: 100, y: 50 }, label: 'Aug 2026' };

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return { left: 20, top: 20, right: 320, bottom: 170, width: 300, height: 150, x: 20, y: 20, toJSON: () => ({}) };
  });
  jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
    return this.classList.contains('recharts-wrapper') ? 300 : 200;
  });
  jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(150);
  jest.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(80);
});
afterEach(() => { cleanup(); jest.restoreAllMocks(); jest.useRealTimers(); });

test('portals formatted chart data outside the chart and retains formatter behavior', () => {
  const { container } = render(<div className="recharts-wrapper" style={{ overflow: 'hidden' }}>
    <ChartTooltipContent {...props} contentStyle={{ backgroundColor: '#fff', color: '#222', border: '1px solid #ddd' }}
      formatter={(value: number) => [value.toLocaleString(), 'Unique solvers']} />
  </div>);
  const tip = screen.getByRole('tooltip');
  expect(tip.parentElement).toBe(document.body);
  expect(container).not.toContainElement(tip);
  expect(tip).toHaveTextContent('1,234');
  expect(tip).toHaveTextContent('Unique solvers');
  expect(tip).toHaveTextContent('Aug 2026');
  expect(tip).toHaveStyle({ backgroundColor: '#fff', color: '#222', border: '1px solid #ddd' });
});

test('allows hovering the chart bubble after leaving the plot', () => {
  const { rerender } = render(<div className="recharts-wrapper"><ChartTooltipContent {...props} /></div>);
  const tip = screen.getByRole('tooltip');
  rerender(<div className="recharts-wrapper"><ChartTooltipContent {...props} active={false} /></div>);
  fireEvent.mouseEnter(tip);
  act(() => { jest.advanceTimersByTime(500); });
  expect(tip).toBeVisible();
  fireEvent.mouseLeave(tip);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

test('Escape dismisses the current point and movement can reveal another', () => {
  const { rerender } = render(<div className="recharts-wrapper"><ChartTooltipContent {...props} /></div>);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  rerender(<div className="recharts-wrapper"><ChartTooltipContent {...props} coordinate={{ x: 120, y: 50 }} /></div>);
  expect(screen.getByRole('tooltip')).toBeVisible();
});
