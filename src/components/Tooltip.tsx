import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

// Module-level bookkeeping shared by every tooltip on the page: the first
// tooltip waits before appearing (prevents accidental activation), but while
// one is open — or closed a moment ago — neighbors open instantly with no
// animation, so sweeping across a toolbar feels immediate.
let openCount = 0;
let lastCloseAt = 0;

const FIRST_OPEN_DELAY_MS = 400;
const INSTANT_WINDOW_MS = 400;

type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  /** Element rendered as the anchor (defaults to an inline span). */
  as?: React.ElementType;
  className?: string;
  /** Wider bubble with balanced wrapping, for sentence-length explanations. */
  rich?: boolean;
} & Omit<React.HTMLAttributes<HTMLElement>, 'content'>;

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  as: Tag = 'span',
  className,
  rich,
  ...rest
}) => {
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState(false);
  const timer = useRef<number | null>(null);
  const isOpenRef = useRef(false);
  const tipRef = useRef<HTMLSpanElement>(null);

  // Keep the bubble on-screen: when the centered position would overflow the
  // viewport, shift the bubble while the arrow stays on the anchor.
  useLayoutEffect(() => {
    if (!open) return;
    const tip = tipRef.current;
    const anchor = tip?.parentElement;
    if (!tip || !anchor) return;
    const anchorRect = anchor.getBoundingClientRect();
    const w = tip.offsetWidth; // unaffected by the scale transform
    const center = anchorRect.left + anchorRect.width / 2;
    const left = center - w / 2;
    const margin = 8;
    const vw = window.innerWidth;
    let shift = 0;
    if (left < margin) shift = margin - left;
    else if (left + w > vw - margin) shift = vw - margin - (left + w);
    tip.style.setProperty('--tooltip-shift', `${shift}px`);
  }, [open]);

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const show = useCallback((skipDelay: boolean) => {
    clearTimer();
    if (isOpenRef.current) return;
    const adjacent = openCount > 0 || Date.now() - lastCloseAt < INSTANT_WINDOW_MS;
    const doOpen = () => {
      isOpenRef.current = true;
      openCount += 1;
      setInstant(adjacent);
      setOpen(true);
    };
    if (skipDelay || adjacent) doOpen();
    else timer.current = window.setTimeout(doOpen, FIRST_OPEN_DELAY_MS);
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    if (!isOpenRef.current) return;
    isOpenRef.current = false;
    openCount = Math.max(0, openCount - 1);
    lastCloseAt = Date.now();
    setOpen(false);
  }, []);

  // Keep the shared counters honest if the anchor unmounts while open.
  useEffect(
    () => () => {
      clearTimer();
      if (isOpenRef.current) {
        openCount = Math.max(0, openCount - 1);
        lastCloseAt = Date.now();
      }
    },
    []
  );

  return (
    <Tag
      {...rest}
      className={`ui-tooltip-anchor${className ? ` ${className}` : ''}`}
      onMouseEnter={() => show(false)}
      onMouseLeave={hide}
      // Keyboard focus is intentional — no delay.
      onFocus={() => show(true)}
      onBlur={hide}
    >
      {children}
      <span
        ref={tipRef}
        className={`ui-tooltip${rich ? ' rich' : ''}`}
        data-open={open ? '' : undefined}
        data-instant={instant ? '' : undefined}
        role="tooltip"
        aria-hidden={!open}
      >
        {content}
      </span>
    </Tag>
  );
};

export default Tooltip;
