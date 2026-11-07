import { useLayoutEffect, useRef } from 'react';

export default function useSidebarGrid() {
  const layout = useRef(null);
  useLayoutEffect(() => {
    const element = layout.current;
    let frame = null;
    const measure = () => {
      if (window.matchMedia('(max-width: 1120px), (max-height: 700px)').matches) { delete element.dataset.railLayout; return; }
      const primary = element.querySelector('.flow-primary');
      const columns = element.querySelector('.flow-columns');
      const gap = parseFloat(getComputedStyle(element).rowGap);
      const start = primary.getBoundingClientRect().top + window.scrollY + columns.getBoundingClientRect().height + gap;
      const height = Math.floor(window.innerHeight - start - 16);
      element.style.setProperty('--flow-rail-height', `${height}px`);
      element.dataset.railDensity = height < 660 ? 'compact' : 'regular';
      element.dataset.railLayout = height < 560 ? 'dialog' : 'columns';
    };
    const schedule = () => {
      if (frame !== null) return;
      frame = requestAnimationFrame(() => { frame = null; measure(); });
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(element.previousElementSibling);
    observer.observe(element.querySelector('.flow-scope'));
    window.addEventListener('resize', schedule);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, []);
  return layout;
}
