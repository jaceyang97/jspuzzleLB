import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

export default function usePageWindow({ count, estimate = 100, batch = 30, onAnchorShift }) {
  const list = useRef(null);
  const frame = useRef(null);
  const wantsMore = useRef(false);
  const anchorShift = useRef(0);
  const restoreFocus = useRef(false);
  const [loaded, setLoaded] = useState(() => Math.min(count, Math.max(batch, Math.ceil(window.innerHeight / estimate) * 2)));
  const [heights, setHeights] = useState(() => new Map());
  const [range, setRange] = useState({ first: 0, end: Math.min(count, batch, 16) });
  const limit = Math.min(count, loaded);
  const offsets = useMemo(() => {
    const values = [0];
    for (let index = 0; index < limit; index += 1) values.push(values[index] + (heights.get(index) || estimate));
    return values;
  }, [limit, heights, estimate]);

  const update = useCallback((allowMore = false) => {
    if (!list.current) return;
    const height = window.innerHeight;
    const pageTop = window.scrollY;
    const listTop = list.current.getBoundingClientRect().top + pageTop;
    const top = Math.max(0, pageTop - listTop);
    const bottom = Math.max(0, pageTop + height - listTop);
    const find = (pixel) => {
      let low = 0; let high = limit;
      while (low < high) {
        const middle = (low + high) >> 1;
        if (offsets[middle + 1] < pixel) low = middle + 1;
        else high = middle;
      }
      return low;
    };
    const buffer = Math.max(estimate * 3, height / 2);
    const first = Math.min(Math.max(0, limit - 1), find(Math.max(0, top - buffer)));
    const end = Math.min(limit, find(bottom + buffer) + 1);
    const focused = document.activeElement?.closest('[data-row-index]');
    if (focused && list.current.contains(focused)) {
      const index = Number(focused.dataset.rowIndex);
      if (index < first || index >= end) restoreFocus.current = true;
    }
    setRange((previous) => previous.first === first && previous.end === end ? previous : { first, end });
    const needed = Math.min(count, Math.ceil(height / estimate) * 2);
    if (limit < needed) setLoaded((previous) => Math.max(previous, needed));
    else if (allowMore && limit < count && bottom >= offsets[limit] - Math.max(600, height)) {
      setLoaded((previous) => previous > limit ? previous : Math.min(count, limit + batch));
    }
  }, [offsets, limit, count, batch, estimate]);

  const schedule = useCallback((allowMore = false) => {
    if (allowMore === true) wantsMore.current = true;
    if (frame.current != null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const append = wantsMore.current; wantsMore.current = false;
      update(append);
    });
  }, [update]);

  useLayoutEffect(() => {
    const shift = anchorShift.current;
    anchorShift.current = 0;
    if (shift) {
      onAnchorShift?.(shift);
      window.scrollBy({ top: shift, behavior: 'auto' });
    }
    schedule();
    const element = list.current;
    if (!element) return;
    const measure = (rows) => {
      const changes = rows.map((row) => [Number(row.dataset.rowIndex), row.getBoundingClientRect().height])
        .filter(([index, height]) => height > 0 && Math.abs((heights.get(index) || estimate) - height) > .01);
      if (changes.length) {
        const top = Math.max(0, -element.getBoundingClientRect().top);
        anchorShift.current += changes.reduce((sum, [index, height]) => sum + (offsets[index + 1] <= top ? height - (heights.get(index) || estimate) : 0), 0);
        setHeights((previous) => new Map([...previous, ...changes]));
      }
    };
    const rows = [...element.querySelectorAll('[data-row-index]')];
    if (restoreFocus.current) {
      restoreFocus.current = false;
      if (document.activeElement === document.body) {
        const toolbarBottom = element.closest('main')?.querySelector('.flow-toolbar')?.getBoundingClientRect().bottom || 0;
        const visible = rows.find(row => {
          const rect = row.getBoundingClientRect();
          return rect.bottom > toolbarBottom && rect.top < window.innerHeight;
        });
        visible?.querySelector('button')?.focus({ preventScroll: true });
      }
    }
    // Settle newly mounted row heights before they can paint at estimated offsets.
    measure(rows);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver((entries) => {
      measure(entries.map(entry => entry.target));
      schedule();
    });
    rows.forEach((row) => observer?.observe(row));
    const scroll = () => schedule(true);
    const resize = () => schedule();
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize);
    return () => {
      observer?.disconnect();
      window.removeEventListener('scroll', scroll); window.removeEventListener('resize', resize);
      if (frame.current != null) { cancelAnimationFrame(frame.current); frame.current = null; }
    };
  }, [schedule, range.first, range.end, offsets, heights, estimate, onAnchorShift]);

  return {
    list, loaded: limit, first: Math.min(range.first, limit), end: Math.min(range.end, limit),
    before: offsets[Math.min(range.first, limit)], after: offsets[limit] - offsets[Math.min(range.end, limit)],
  };
}
