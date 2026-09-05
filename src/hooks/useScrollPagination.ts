import { useEffect, useRef, useState, useCallback } from 'react';
import { trackOnce } from '../utils/analytics';

interface UseScrollPaginationOptions {
  totalItems: number;
  initialCount?: number;
  batchSize?: number;
  threshold?: number;
  /** When set, reports the first scroll-triggered load-more as a `table_scroll` event. */
  trackLabel?: string;
}

export const useScrollPagination = ({
  totalItems,
  initialCount = 20,
  batchSize = 10,
  threshold = 50,
  trackLabel,
}: UseScrollPaginationOptions) => {
  const [visibleItems, setVisibleItems] = useState(initialCount);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const table = tableRef.current;
    if (!container || !table || visibleItems >= totalItems) return;

    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleFill = () => {
      if (!active) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!active) return;
        const containerHeight = container.clientHeight;
        const tableHeight = table.scrollHeight;
        // Hidden panels have no measurable height. Wait until they become
        // visible, then add one batch at a time until the table can scroll.
        if (containerHeight > 0 && tableHeight > 0 && tableHeight <= containerHeight) {
          setVisibleItems(prev => Math.min(prev + batchSize, totalItems));
        }
      }, 100);
    };

    scheduleFill();
    const observer = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(scheduleFill)
      : undefined;
    observer?.observe(container);
    observer?.observe(table);
    window.addEventListener('resize', scheduleFill);

    return () => {
      active = false;
      clearTimeout(timer);
      observer?.disconnect();
      window.removeEventListener('resize', scheduleFill);
    };
  }, [totalItems, visibleItems, batchSize]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const bottom = el.scrollHeight - el.scrollTop <= el.clientHeight + threshold;
      if (bottom && visibleItems < totalItems) {
        if (trackLabel) {
          trackOnce(`table-scroll:${trackLabel}`, 'table_scroll', { table: trackLabel });
        }
        setVisibleItems(prev => Math.min(prev + batchSize, totalItems));
      }
    },
    [visibleItems, totalItems, batchSize, threshold, trackLabel],
  );

  return { visibleItems, containerRef, tableRef, handleScroll };
};
