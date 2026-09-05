import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingTooltip } from './useFloatingTooltip';
import './Tooltip.css';

let closeActiveTooltip: (() => void) | null = null;
let lastCloseAt = 0;
const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

type TooltipProps = {
  content: React.ReactNode;
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
  rich?: boolean;
} & Omit<React.HTMLAttributes<HTMLElement>, 'content'>;

const Tooltip: React.FC<TooltipProps> = ({
  content, children, as: Tag = 'span', className, rich,
  onMouseEnter, onMouseLeave, onFocus, onBlur, onPointerDown, onKeyDown, ...rest
}) => {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const isOpen = useRef(false);
  const focused = useRef(false);
  const pointerFocus = useRef(false);
  const touchPinned = useRef(false);
  const anchorRef = useRef<HTMLElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLSpanElement>(null);
  const focusTarget = useRef<HTMLElement | null>(null);
  const id = useId();
  const position = useFloatingTooltip(open, anchorRef, tipRef, undefined, rich ? 340 : 320);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const hide = useCallback(() => {
    clearTimer();
    if (!isOpen.current) return;
    isOpen.current = false;
    touchPinned.current = false;
    if (closeActiveTooltip === hide) closeActiveTooltip = null;
    lastCloseAt = Date.now();
    setOpen(false);
  }, [clearTimer]);

  const show = useCallback((skipDelay: boolean) => {
    clearTimer();
    if (isOpen.current) return;
    const adjacent = !!closeActiveTooltip || Date.now() - lastCloseAt < 400;
    const doOpen = () => {
      closeActiveTooltip?.();
      closeActiveTooltip = hide;
      isOpen.current = true;
      setOpen(true);
    };
    if (skipDelay || adjacent) doOpen();
    else timer.current = window.setTimeout(doOpen, 400);
  }, [clearTimer, hide]);

  const owns = useCallback((target: EventTarget | null) => target instanceof Node &&
    (!!anchorRef.current?.contains(target) || !!tipRef.current?.contains(target)), []);

  const leave = useCallback((target: EventTarget | null) => {
    if (owns(target) || focused.current || touchPinned.current) return;
    clearTimer();
    // Allow the pointer to cross the gap into the portaled bubble.
    timer.current = window.setTimeout(hide, 140);
  }, [owns, clearTimer, hide]);

  // Give static labels keyboard access without a duplicate tab stop around buttons.
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || rest.tabIndex !== undefined) return;
    const hasFocusableChild = Array.from(anchor.querySelectorAll<HTMLElement>(FOCUSABLE)).some(element => {
      for (let node: HTMLElement | null = element; node && node !== anchor; node = node.parentElement) {
        if (node.hidden || window.getComputedStyle(node).display === 'none') return false;
      }
      return true;
    });
    if (hasFocusableChild) anchor.removeAttribute('tabindex');
    else anchor.setAttribute('tabindex', '0');
  }, [children, rest.tabIndex]);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;
    const target = focusTarget.current ?? anchor?.querySelector<HTMLElement>(FOCUSABLE) ?? anchor;
    // Existing descriptions must not be repeated by assistive technology.
    if (!target || target.hasAttribute('aria-describedby')) return;
    target.setAttribute('aria-describedby', id);
    return () => { if (target.getAttribute('aria-describedby') === id) target.removeAttribute('aria-describedby'); };
  }, [open, id]);

  useEffect(() => {
    if (!open) return;
    const dismissOutside = (event: PointerEvent) => { if (!owns(event.target)) hide(); };
    const dismissEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      if (tipRef.current?.contains(document.activeElement)) focusTarget.current?.focus();
      hide();
    };
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('keydown', dismissEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('keydown', dismissEscape);
    };
  }, [open, hide, owns]);

  useEffect(() => () => {
    clearTimer();
    if (closeActiveTooltip === hide) { closeActiveTooltip = null; lastCloseAt = Date.now(); }
  }, [clearTimer, hide]);

  return <>
    <Tag {...rest} ref={anchorRef} className={`ui-tooltip-anchor${className ? ` ${className}` : ''}`}
      onMouseEnter={(event: React.MouseEvent<HTMLElement>) => { onMouseEnter?.(event); show(false); }}
      onMouseLeave={(event: React.MouseEvent<HTMLElement>) => { onMouseLeave?.(event); leave(event.relatedTarget); }}
      onFocus={(event: React.FocusEvent<HTMLElement>) => {
        onFocus?.(event); focused.current = !pointerFocus.current; pointerFocus.current = false;
        focusTarget.current = event.target; show(true);
      }}
      onBlur={(event: React.FocusEvent<HTMLElement>) => {
        onBlur?.(event);
        if (owns(event.relatedTarget)) return;
        focused.current = false; pointerFocus.current = false; focusTarget.current = null; hide();
      }}
      onPointerDown={(event: React.PointerEvent<HTMLElement>) => {
        onPointerDown?.(event);
        pointerFocus.current = true;
        focused.current = false;
        if (event.pointerType === 'touch' || event.pointerType === 'pen') {
          if (isOpen.current) hide(); else { touchPinned.current = true; show(true); }
        }
      }}
      onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
        onKeyDown?.(event);
        const contentElement = contentRef.current;
        if (!event.defaultPrevented && open && event.key === 'Tab' && !event.shiftKey && contentElement &&
          contentElement.scrollHeight > contentElement.clientHeight + 1) {
          event.preventDefault();
          event.stopPropagation();
          contentElement.focus();
        }
      }}>
      {children}
    </Tag>
    {open && createPortal(
      <span ref={tipRef} id={id} className={`ui-tooltip ui-tooltip-portal${rich ? ' rich' : ''}`}
        data-open="" data-placement={position?.placement ?? 'bottom'} role="tooltip"
        style={{ position: 'fixed', left: position?.left ?? 0, top: position?.top ?? 0,
          maxWidth: position?.maxWidth, maxHeight: position?.maxHeight, transform: 'none',
          visibility: position?.visible ? 'visible' : 'hidden',
          '--tooltip-arrow-x': `${position?.arrowX ?? 16}px` } as React.CSSProperties}
        onMouseEnter={clearTimer} onMouseLeave={event => leave(event.relatedTarget)}
        onFocus={() => { focused.current = true; clearTimer(); }}
        onBlur={event => { if (!owns(event.relatedTarget)) { focused.current = false; hide(); } }}
        onKeyDown={event => {
          if (event.key !== 'Tab') return;
          event.preventDefault();
          event.stopPropagation();
          if (event.shiftKey) { focusTarget.current?.focus(); return; }
          const trigger = focusTarget.current ?? anchorRef.current;
          const focusScope = trigger?.closest('[role="dialog"], [aria-modal="true"], dialog') ?? document;
          const candidates = Array.from(focusScope.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(element => {
            if (element.tabIndex < 0 || tipRef.current?.contains(element)) return false;
            for (let node: HTMLElement | null = element; node; node = node.parentElement) {
              const style = window.getComputedStyle(node);
              if (node.hidden || style.display === 'none' || style.visibility === 'hidden') return false;
            }
            return true;
          });
          const index = trigger ? candidates.indexOf(trigger) : -1;
          (candidates[index + 1] ?? (focusScope === document ? trigger : candidates[0]))?.focus();
          hide();
        }}>
        <span ref={contentRef} className="ui-tooltip-content" data-tooltip-content="" tabIndex={-1}>{content}</span>
      </span>, document.body,
    )}
  </>;
};

export default Tooltip;
