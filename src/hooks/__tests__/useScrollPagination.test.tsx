import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useScrollPagination } from '../useScrollPagination';
import { trackOnce } from '../../utils/analytics';

jest.mock('../../utils/analytics', () => ({ trackOnce: jest.fn() }));

const Harness = ({ totalItems = 16000 }: { totalItems?: number }) => {
  const { visibleItems, containerRef, tableRef, handleScroll } = useScrollPagination({
    totalItems,
    trackLabel: 'top-solvers',
  });
  return (
    <div ref={containerRef} onScroll={handleScroll} data-testid="container">
      <table ref={tableRef}>
        <tbody>
          {Array.from({ length: Math.min(visibleItems, totalItems) }, (_, index) => (
            <tr key={index}><td>Solver {index}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

describe('useScrollPagination', () => {
  const originalResizeObserver = window.ResizeObserver;
  let resizeCallbacks: Set<() => void>;
  let disconnected: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    resizeCallbacks = new Set();
    disconnected = jest.fn();
    window.ResizeObserver = jest.fn().mockImplementation((callback: () => void) => {
      resizeCallbacks.add(callback);
      return {
        observe: jest.fn(),
        disconnect: () => {
          disconnected();
          resizeCallbacks.delete(callback);
        },
      };
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    window.ResizeObserver = originalResizeObserver;
  });

  const setDimensions = (initialHeight: number) => {
    const container = screen.getByTestId('container');
    const table = screen.getByRole('table');
    let height = initialHeight;
    Object.defineProperty(container, 'clientHeight', { get: () => height });
    Object.defineProperty(container, 'scrollHeight', { get: () => table.scrollHeight });
    Object.defineProperty(table, 'scrollHeight', { get: () => table.querySelectorAll('tr').length * 20 });
    return {
      container,
      resize: (nextHeight: number) => {
        height = nextHeight;
        act(() => resizeCallbacks.forEach(callback => callback()));
      },
    };
  };

  const measure = () => act(() => { jest.advanceTimersByTime(100); });

  test('fills a tall viewport in batches and stops once the table overflows', () => {
    render(<Harness />);
    setDimensions(900);

    expect(screen.getAllByRole('row')).toHaveLength(20);
    for (const expected of [30, 40, 50, 50]) {
      measure();
      expect(screen.getAllByRole('row')).toHaveLength(expected);
    }
    expect(trackOnce).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  test('fills after a container grows, remains stable after shrinking, and still paginates on scroll', () => {
    render(<Harness />);
    const dimensions = setDimensions(300);
    measure();
    expect(screen.getAllByRole('row')).toHaveLength(20);

    dimensions.resize(700);
    measure();
    measure();
    measure();
    expect(screen.getAllByRole('row')).toHaveLength(40);

    dimensions.resize(200);
    measure();
    expect(screen.getAllByRole('row')).toHaveLength(40);
    expect(jest.getTimerCount()).toBe(0);

    fireEvent.scroll(dimensions.container, { target: { scrollTop: 600 } });
    expect(screen.getAllByRole('row')).toHaveLength(50);
    expect(trackOnce).toHaveBeenCalledWith('table-scroll:top-solvers', 'table_scroll', { table: 'top-solvers' });
  });

  test('waits for a hidden container to become visible and cleans up queued measurements', () => {
    const view = render(<Harness totalItems={25} />);
    const dimensions = setDimensions(0);
    measure();
    expect(screen.getAllByRole('row')).toHaveLength(20);
    expect(jest.getTimerCount()).toBe(0);

    dimensions.resize(900);
    measure();
    expect(screen.getAllByRole('row')).toHaveLength(25);
    expect(resizeCallbacks.size).toBe(0);

    view.unmount();
    expect(jest.getTimerCount()).toBe(0);
    expect(disconnected).toHaveBeenCalled();

    const pendingView = render(<Harness />);
    setDimensions(900);
    const staleCallback = Array.from(resizeCallbacks)[0];
    pendingView.unmount();
    act(() => staleCallback());
    expect(resizeCallbacks.size).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });
});
