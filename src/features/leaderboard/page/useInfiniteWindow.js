import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

export default function useInfiniteWindow({ count, estimate = 100, batch = 30, fallbackHeight = 480 }) {
  const viewport = useRef(null);
  const frame = useRef(null);
  const wantsMore = useRef(false);
  const anchorShift = useRef(0);
  const [loaded, setLoaded] = useState(() => Math.min(count, batch));
  const [heights, setHeights] = useState(() => new Map());
  const [range, setRange] = useState({ first: 0, end: Math.min(count, batch, 12) });
  const limit = Math.min(count, loaded || batch);
  const offsets = useMemo(() => {
    const values = [0];
    for (let index = 0; index < limit; index += 1) values.push(values[index] + (heights.get(index) || estimate));
    return values;
  }, [limit, heights, estimate]);

  const update = useCallback((allowMore = false) => {
    const element = viewport.current;
    if (!element) return;
    const height = element.clientHeight || fallbackHeight;
    const top = element.scrollTop;
    const find = (pixel) => {
      let low = 0; let high = limit;
      while (low < high) {
        const middle = (low + high) >> 1;
        if (offsets[middle + 1] < pixel) low = middle + 1;
        else high = middle;
      }
      return low;
    };
    const buffer = Math.max(estimate * 2, height / 2);
    const first = Math.min(Math.max(0, limit - 1), find(Math.max(0, top - buffer)));
    const end = Math.min(limit, find(top + height + buffer) + 1);
    setRange((previous) => previous.first === first && previous.end === end ? previous : { first, end });
    if (allowMore && element.clientHeight > 0 && limit < count && top + height >= offsets[limit] - Math.max(320, height)) {
      setLoaded((previous) => previous > limit ? previous : Math.min(count, limit + batch));
    }
  }, [offsets, limit, count, batch, estimate, fallbackHeight]);

  const schedule = useCallback((allowMore = false) => {
    if (allowMore === true) wantsMore.current = true;
    if (frame.current != null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const append = wantsMore.current;
      wantsMore.current = false;
      update(append);
    });
  }, [update]);

  useLayoutEffect(() => {
    if (viewport.current && anchorShift.current) { viewport.current.scrollTop += anchorShift.current; anchorShift.current = 0; }
    schedule();
    const element = viewport.current;
    if (!element) return;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver((entries) => {
      const measured = [];
      entries.forEach((entry) => {
        if (entry.target === element) return;
        const height = entry.target.getBoundingClientRect().height;
        if (height > 0) measured.push([Number(entry.target.dataset.rowIndex), height]);
      });
      const changes = measured.filter(([index, height]) => Math.abs((heights.get(index) || estimate) - height) > 1);
      if (changes.length) {
        anchorShift.current += changes.reduce((sum, [index, height]) => sum + (offsets[index + 1] <= element.scrollTop ? height - (heights.get(index) || estimate) : 0), 0);
        setHeights((previous) => new Map([...previous, ...changes]));
      }
      schedule();
    });
    observer?.observe(element);
    element.querySelectorAll('[data-row-index]').forEach((row) => observer?.observe(row));
    const resize = () => schedule();
    window.addEventListener('resize', resize);
    return () => {
      observer?.disconnect(); window.removeEventListener('resize', resize);
      if (frame.current != null) { cancelAnimationFrame(frame.current); frame.current = null; }
    };
  }, [update, schedule, range.first, range.end, estimate, heights, offsets]);

  return {
    viewport, onScroll: () => schedule(true),
    first: Math.min(range.first, limit), end: Math.min(range.end, limit), loaded: limit,
    before: offsets[Math.min(range.first, limit)], after: offsets[limit] - offsets[Math.min(range.end, limit)],
    toTop: () => viewport.current?.scrollTo({ top: 0, behavior: 'auto' }),
  };
}
