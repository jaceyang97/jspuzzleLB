import { RefObject, useCallback, useLayoutEffect, useState } from 'react';

export type TooltipReferenceRect = Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'>;
export interface FloatingTooltipPosition {
  left: number; top: number; maxWidth: number; maxHeight: number;
  arrowX: number; placement: 'top' | 'bottom'; visible: boolean;
}
const MARGIN = 8;
const GAP = 8;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, Math.max(min, max)));

/** One rule for body portals, including zoom and on-screen keyboard viewports. */
export function useFloatingTooltip(
  open: boolean, anchorRef: RefObject<HTMLElement>, surfaceRef: RefObject<HTMLElement>,
  getReferenceRect?: () => TooltipReferenceRect | null, preferredWidth = 320,
) {
  const [position, setPosition] = useState<FloatingTooltipPosition | null>(null);
  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const surface = surfaceRef.current;
    if (!anchor || !surface) return;
    const reference = getReferenceRect?.() ?? anchor.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportLeft = viewport?.offsetLeft ?? 0;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportWidth = viewport?.width ?? window.innerWidth;
    const viewportHeight = viewport?.height ?? window.innerHeight;
    const right = viewportLeft + viewportWidth;
    const bottom = viewportTop + viewportHeight;
    const maxWidth = Math.max(1, Math.min(preferredWidth, viewportWidth - MARGIN * 2));
    // Width affects wrapping, so establish it before measuring the content.
    surface.style.maxWidth = `${maxWidth}px`;
    const width = Math.min(surface.offsetWidth, maxWidth);
    const content = surface.querySelector<HTMLElement>('[data-tooltip-content]');
    const naturalHeight = content?.scrollHeight || surface.scrollHeight || surface.offsetHeight;
    const below = Math.max(0, bottom - MARGIN - reference.bottom - GAP);
    const above = Math.max(0, reference.top - GAP - viewportTop - MARGIN);
    const placement = naturalHeight <= below || below >= above ? 'bottom' : 'top';
    const room = placement === 'bottom' ? below : above;
    // If neither side offers useful room, overlap the trigger instead of
    // reducing the tooltip to an unreadable sliver. Content can scroll.
    const maxHeight = Math.max(1, room >= 48 ? room : viewportHeight - MARGIN * 2);
    const height = Math.min(naturalHeight, maxHeight);
    const center = reference.left + reference.width / 2;
    const left = clamp(center - width / 2, viewportLeft + MARGIN, right - MARGIN - width);
    const top = clamp(placement === 'bottom' ? reference.bottom + GAP : reference.top - GAP - height,
      viewportTop + MARGIN, bottom - MARGIN - height);
    let visible = reference.right >= viewportLeft && reference.left <= right &&
      reference.bottom >= viewportTop && reference.top <= bottom;
    // A trigger scrolled out of its card must not leave a detached bubble.
    for (let parent = anchor.parentElement; visible && parent && parent !== document.body; parent = parent.parentElement) {
      const style = window.getComputedStyle(parent);
      const bounds = parent.getBoundingClientRect();
      if (/(auto|scroll|hidden|clip)/.test(style.overflowX) && bounds.width > 0) {
        visible = reference.right >= bounds.left && reference.left <= bounds.right;
      }
      if (/(auto|scroll|hidden|clip)/.test(style.overflowY) && bounds.height > 0) {
        visible = visible && reference.bottom >= bounds.top && reference.top <= bounds.bottom;
      }
    }
    const next: FloatingTooltipPosition = { left, top, maxWidth, maxHeight, placement, visible,
      arrowX: clamp(center - left, 10, width - 10) };
    setPosition(previous => previous && Object.keys(next).every(key =>
      previous[key as keyof FloatingTooltipPosition] === next[key as keyof FloatingTooltipPosition]) ? previous : next);
  }, [anchorRef, surfaceRef, getReferenceRect, preferredWidth]);

  useLayoutEffect(() => {
    if (!open) { setPosition(null); return; }
    updatePosition();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePosition);
    if (anchorRef.current) observer?.observe(anchorRef.current);
    if (surfaceRef.current) observer?.observe(surfaceRef.current);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.visualViewport?.addEventListener('resize', updatePosition);
    window.visualViewport?.addEventListener('scroll', updatePosition);
    let active = true;
    document.fonts?.ready.then(() => { if (active) updatePosition(); });
    return () => {
      active = false;
      observer?.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.visualViewport?.removeEventListener('resize', updatePosition);
      window.visualViewport?.removeEventListener('scroll', updatePosition);
    };
  }, [open, updatePosition, anchorRef, surfaceRef]);
  return position;
}
