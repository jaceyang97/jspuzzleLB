import { useEffect, useRef, useState, useCallback } from 'react';

interface UseScrollPaginationOptions {
  totalItems: number;
  initialCount?: number;
  batchSize?: number;
  threshold?: number;
}

export const useScrollPagination = ({
  totalItems,
  initialCount = 20,
  batchSize = 10,
  threshold = 50,
}: UseScrollPaginationOptions) => {
  const [visibleItems, setVisibleItems] = useState(initialCount);
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    if (totalItems > 0 && visibleItems < totalItems && containerRef.current && tableRef.current) {
      const timer = setTimeout(() => {
        const containerHeight = containerRef.current!.clientHeight;
        const tableHeight = tableRef.current!.scrollHeight;
        if (tableHeight <= containerHeight) {
          setVisibleItems(totalItems);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [totalItems, visibleItems]);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const bottom = el.scrollHeight - el.scrollTop <= el.clientHeight + threshold;
      if (bottom && visibleItems < totalItems) {
        setVisibleItems(prev => Math.min(prev + batchSize, totalItems));
      }
    },
    [visibleItems, totalItems, batchSize, threshold],
  );

  return { visibleItems, containerRef, tableRef, handleScroll };
};
