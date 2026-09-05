import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { trackOnce } from '../../../utils/analytics';

interface PopoverPosition {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}

const PuzzleNavigation: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const currentLinkRef = useRef<HTMLAnchorElement>(null);
  const closeTimer = useRef<number | null>(null);
  const suppressAutomaticOpen = useRef(false);
  const pinned = useRef(false);
  const popoverId = useId();

  const cancelClose = useCallback(() => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const ownsTarget = useCallback((target: EventTarget | null) => target instanceof Node && (
    introRef.current?.contains(target) || popoverRef.current?.contains(target)
  ), []);

  const show = useCallback((explicit = false) => {
    cancelClose();
    if (!explicit && suppressAutomaticOpen.current) return;
    suppressAutomaticOpen.current = false;
    setOpen(true);
    trackOnce('intro', 'intro_hover');
  }, [cancelClose]);

  const dismiss = useCallback((restoreFocus = false) => {
    cancelClose();
    pinned.current = false;
    // Returning focus after Escape must not open the introduction again.
    suppressAutomaticOpen.current = true;
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus({ preventScroll: true });
  }, [cancelClose]);

  const handleBlur = (event: React.FocusEvent<HTMLElement>) => {
    if (ownsTarget(event.relatedTarget)) return;
    dismiss();
    suppressAutomaticOpen.current = false;
  };

  const handleMouseLeave = (event: React.MouseEvent<HTMLElement>) => {
    suppressAutomaticOpen.current = false;
    if (ownsTarget(event.relatedTarget) || pinned.current || ownsTarget(document.activeElement)) return;
    // Allow the pointer to cross the small gap between trigger and popover.
    cancelClose();
    closeTimer.current = window.setTimeout(() => {
      dismiss();
      suppressAutomaticOpen.current = false;
    }, 150);
  };

  useEffect(() => cancelClose, [cancelClose]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!ownsTarget(event.target)) dismiss();
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      dismiss(!!popoverRef.current?.contains(document.activeElement));
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, dismiss, ownsTarget]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    const button = buttonRef.current;
    const popover = popoverRef.current;
    if (!button || !popover) return;
    const updatePosition = () => {
      const viewport = window.visualViewport;
      const viewportLeft = viewport?.offsetLeft ?? 0;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportWidth = viewport?.width ?? window.innerWidth;
      const viewportHeight = viewport?.height ?? window.innerHeight;
      const margin = 12;
      const width = Math.min(440, Math.max(0, viewportWidth - margin * 2));
      const maxHeight = Math.max(0, viewportHeight - margin * 2);
      const anchor = button.getBoundingClientRect();
      const borderHeight = popover.offsetHeight - popover.clientHeight;
      const height = Math.min(popover.scrollHeight + borderHeight, maxHeight);
      const left = Math.max(viewportLeft + margin, Math.min(
        anchor.left, viewportLeft + viewportWidth - margin - width,
      ));
      const below = anchor.bottom + 8;
      const above = anchor.top - 8 - height;
      const top = below + height <= viewportTop + viewportHeight - margin
        ? Math.max(viewportTop + margin, below)
        : above >= viewportTop + margin ? above
        : Math.max(viewportTop + margin, viewportTop + viewportHeight - margin - height);
      setPosition((previous) => previous?.left === left && previous.top === top &&
        previous.width === width && previous.maxHeight === maxHeight
        ? previous : { left, top, width, maxHeight });
    };
    updatePosition();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updatePosition);
    observer?.observe(button);
    observer?.observe(popover);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.visualViewport?.addEventListener('resize', updatePosition);
    window.visualViewport?.addEventListener('scroll', updatePosition);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.visualViewport?.removeEventListener('resize', updatePosition);
      window.visualViewport?.removeEventListener('scroll', updatePosition);
    };
  }, [open]);

  const introduction = open ? createPortal(
    <div ref={popoverRef} id={popoverId} className="intro-tooltip puzzle-intro-tooltip" data-open=""
      role="dialog" aria-label="Introduction" tabIndex={-1}
      style={{ position: 'fixed', left: position?.left ?? 12, top: position?.top ?? 12,
        width: position?.width ?? 'min(440px, calc(100vw - 24px))',
        maxHeight: position?.maxHeight ?? 'calc(100vh - 24px)', boxSizing: 'border-box',
        overflowY: 'auto', overscrollBehavior: 'contain', margin: 0, transform: 'none',
        opacity: 1, visibility: position ? 'visible' : 'hidden', pointerEvents: 'auto' }}
      onMouseEnter={cancelClose} onMouseLeave={handleMouseLeave} onBlur={handleBlur}
      onFocus={cancelClose}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        if (event.shiftKey && (event.target === popoverRef.current || event.target === closeButtonRef.current)) {
          event.preventDefault();
          buttonRef.current?.focus();
        } else if (!event.shiftKey && event.target === closeButtonRef.current) {
          event.preventDefault();
          currentLinkRef.current?.focus();
        }
      }}>
      <table className="intro-leaderboard-table">
        <thead><tr><th scope="col">Rank</th><th scope="col">Description</th></tr></thead>
        <tbody>
          {/* Word counts descend with rank: 19, 14, 13, 8, 5. Keep the mechanism implicit. */}
          <tr><td>1</td><td>I wanted a way to follow Jane Street’s puzzle solvers without keeping a collection of lists in my head.</td></tr>
          <tr><td>2</td><td>Some names appeared once. Others kept returning. I wanted to see the whole record.</td></tr>
          <tr><td>3</td><td>The puzzles are theirs. The urge to put everything in order is mine.</td></tr>
          <tr><td>4</td><td>This seemed like a reasonable use of code.</td></tr>
          <tr><td>5</td><td><strong>Naturally, I ranked the introduction.</strong></td></tr>
        </tbody>
      </table>
      <button ref={closeButtonRef} type="button" className="intro-close-button intro-close"
        onClick={() => dismiss(true)}>Close introduction</button>
    </div>, document.body,
  ) : null;

  return (
    <nav className="puzzle-navigation" aria-label="Puzzle navigation">
      <div ref={introRef} className="intro-container" onMouseEnter={() => show()} onMouseLeave={handleMouseLeave}>
        <button ref={buttonRef} type="button" className="intro-button"
          aria-current="page" aria-haspopup="dialog" aria-expanded={open} aria-controls={popoverId}
          onFocus={() => show()} onBlur={handleBlur}
          onClick={() => {
            if (pinned.current) dismiss();
            else { pinned.current = true; show(true); }
          }}
          onKeyDown={(event) => {
            if (event.key === 'Tab' && !event.shiftKey && open) {
              event.preventDefault();
              popoverRef.current?.focus();
            }
          }}>INTRO</button>
      </div>
      <a ref={currentLinkRef} className="js-nav-link"
        href="https://www.janestreet.com/puzzles/current-puzzle/" target="_blank" rel="noopener noreferrer">CURRENT PUZZLE</a>
      <a className="js-nav-link" href="https://www.janestreet.com/puzzles/archive/"
        target="_blank" rel="noopener noreferrer">ARCHIVE</a>
      {introduction}
    </nav>
  );
};

export default PuzzleNavigation;
