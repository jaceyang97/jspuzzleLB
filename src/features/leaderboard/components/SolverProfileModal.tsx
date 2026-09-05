import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRawPuzzleData } from '../hooks/useRawPuzzleData';
import { Puzzle } from '../types';
import {
  SolverPlacement,
  computeAveragePercentile,
  findSolverPlacement,
  formatDate,
} from '../../../utils/leaderboardUtils';
import { HIDDEN_PALETTE, colorFromName } from './solverChipPalettes';
import Tooltip from '../../../components/Tooltip';
import InfoTooltip from '../../../components/InfoTooltip';
import { solverInitial } from '../../../utils/solverInitial';

interface SolverProfileModalProps {
  solverName: string | null;
  onClose: () => void;
}

const AVG_PERCENTILE_TOOLTIP =
  'Average percentile rank across solved puzzles. 100 = always first, ' +
  '0 = always last. Formula: 100 × (1 − (rank − 1) / (solvers − 1)), ' +
  'averaged across puzzles. Puzzles with only one solver are excluded.';

// How long the exit transition runs before unmount (matches the CSS).
const EXIT_MS = 220;

// A downward flick faster than this dismisses the sheet regardless of
// how far it traveled (momentum beats distance).
const FLICK_VELOCITY = 0.11; // px per ms

const isSheetMode = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(max-width: 640px)').matches;

const computeSolverStats = (solverName: string, puzzles: Puzzle[]) => {
  const placements: SolverPlacement[] = [];
  for (const p of puzzles) {
    const placement = findSolverPlacement(solverName, p);
    if (placement) placements.push(placement);
  }
  // Sort newest first by puzzle date_text
  placements.sort((a, b) => {
    const da = new Date(a.puzzle.date_text).getTime();
    const db = new Date(b.puzzle.date_text).getTime();
    return db - da;
  });

  const avg = computeAveragePercentile(placements);

  return {
    placements,
    totalSolved: placements.length,
    firstAppearance: placements.length
      ? formatDate(placements[placements.length - 1].puzzle.date_text)
      : 'N/A',
    lastSolve: placements.length ? formatDate(placements[0].puzzle.date_text) : 'N/A',
    avgPercentile: avg,
  };
};

const SolverProfileModal: React.FC<SolverProfileModalProps> = ({ solverName, onClose }) => {
  // displayName outlives solverName during the exit transition so the card
  // can animate back out along its entry path before unmounting.
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const open = !!displayName;

  const modalRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (solverName) {
      setDisplayName(solverName);
      // Two frames so the hidden starting styles paint before transitioning;
      // a reopen mid-close simply retargets from the current position.
      const raf = requestAnimationFrame(() =>
        requestAnimationFrame(() => setVisible(true))
      );
      return () => cancelAnimationFrame(raf);
    }
    if (displayName) {
      setVisible(false);
      const t = window.setTimeout(() => setDisplayName(null), EXIT_MS);
      return () => window.clearTimeout(t);
    }
  }, [solverName, displayName]);

  const { puzzles, loading, error } = useRawPuzzleData(open);

  // Close on Escape; lock body scroll while modal is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Move focus into the dialog on open, return it on close.
  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    modalRef.current?.focus();
    return () => {
      restoreFocusRef.current?.focus?.();
      restoreFocusRef.current = null;
    };
  }, [open]);

  // Simple focus trap: Tab cycles inside the dialog.
  const onTrapKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const root = modalRef.current;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || active === root) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  // ---- Bottom-sheet drag-to-dismiss (small screens) ----
  // 1:1 tracking while the finger is down, rubber-banding above the resting
  // point, and a velocity check on release so a quick flick dismisses.
  const dragRef = useRef<{
    id: number;
    startY: number;
    lastY: number;
    lastT: number;
    velocity: number;
  } | null>(null);

  const onDragStart = useCallback((e: React.PointerEvent) => {
    if (!isSheetMode()) return;
    if (dragRef.current) return; // ignore extra touch points mid-drag
    const el = modalRef.current;
    if (!el) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      id: e.pointerId,
      startY: e.clientY,
      lastY: e.clientY,
      lastT: performance.now(),
      velocity: 0,
    };
    el.style.transition = 'none'; // the sheet is in the hand, not animating
  }, []);

  const onDragMove = useCallback((e: React.PointerEvent) => {
    const st = dragRef.current;
    if (!st || e.pointerId !== st.id) return;
    const el = modalRef.current;
    if (!el) return;
    const now = performance.now();
    const dt = now - st.lastT;
    if (dt > 0) st.velocity = (e.clientY - st.lastY) / dt;
    st.lastY = e.clientY;
    st.lastT = now;

    let dy = e.clientY - st.startY;
    if (dy < 0) {
      // Rubber-band upward over-drag: resistance, not a wall.
      const dim = el.offsetHeight || 1;
      const c = 0.55;
      dy = (dy * dim * c) / (dim + c * Math.abs(dy));
    }
    el.style.transform = `translateY(${dy}px)`;
  }, []);

  const onDragEnd = useCallback(
    (e: React.PointerEvent) => {
      const st = dragRef.current;
      if (!st || e.pointerId !== st.id) return;
      dragRef.current = null;
      const el = modalRef.current;
      if (!el) return;
      el.style.transition = ''; // hand back to the stylesheet transitions
      const dy = st.lastY - st.startY;
      const h = el.offsetHeight || 1;
      const cancelled = e.type === 'pointercancel';
      if (!cancelled && (st.velocity > FLICK_VELOCITY || dy > h * 0.4)) {
        // Continue from the current position down and out, then unmount.
        el.style.transform = 'translateY(100%)';
        onClose();
      } else {
        // Snap back to rest.
        el.style.transform = '';
      }
    },
    [onClose]
  );

  // Clear any leftover inline drag styles when fully closed.
  useEffect(() => {
    if (!open && modalRef.current) {
      modalRef.current.style.transform = '';
      modalRef.current.style.transition = '';
    }
  }, [open]);

  const stats = useMemo(() => {
    if (!displayName || !puzzles) return null;
    return computeSolverStats(displayName, puzzles);
  }, [displayName, puzzles]);

  if (!open || !displayName) return null;

  // Deterministic per-name avatar color, same palette as banner tooltip.
  const avatarColors = colorFromName(displayName, HIDDEN_PALETTE);
  const initial = solverInitial(displayName);

  return (
    <div
      className="solver-modal-backdrop"
      data-state={visible ? 'open' : 'closing'}
      onClick={onClose}
    >
      <div
        className="solver-modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Profile for ${displayName}`}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onTrapKeyDown}
      >
        <Tooltip content="Close (Esc)" className="solver-modal-close-wrap">
          <button
            className="solver-modal-close"
            onClick={onClose}
            aria-label="Close profile"
          >
            ×
          </button>
        </Tooltip>

        <div
          className="solver-modal-drag-zone"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
        >
          <div className="sheet-handle" aria-hidden="true" />
          <header className="solver-modal-identity">
            <div
              className="solver-modal-avatar"
              style={{ backgroundColor: avatarColors.bg, color: avatarColors.text }}
              aria-hidden="true"
            >
              {initial}
            </div>
            <h2 className="solver-modal-title">{displayName}</h2>
            {stats && (
              <div className="solver-modal-eyebrow">
                Since {stats.firstAppearance}
              </div>
            )}
          </header>
        </div>

        {loading && (
          <div className="solver-modal-state">Loading puzzle history…</div>
        )}

        {error && (
          <div className="solver-modal-state error">
            Could not load puzzle data: {error.message}
          </div>
        )}

        {stats && (
          <>
            <div className="solver-modal-stats three">
              <div className="solver-stat">
                <div className="solver-stat-value">{stats.totalSolved}</div>
                <div className="solver-stat-label">Puzzles solved</div>
              </div>
              <div className="solver-stat">
                <div className="solver-stat-value">{stats.lastSolve}</div>
                <div className="solver-stat-label">Last solve</div>
              </div>
              <div className="solver-stat">
                <div className="solver-stat-value">
                  {stats.avgPercentile
                    ? stats.avgPercentile.value.toFixed(1)
                    : '—'}
                </div>
                <div className="solver-stat-label">
                  Avg percentile
                  <InfoTooltip
                    className="solver-stat-info-tooltip"
                    content={AVG_PERCENTILE_TOOLTIP}
                    label="How average percentile is calculated"
                  />
                </div>
              </div>
            </div>

            <div className="solver-modal-section-label">
              Solved puzzles
            </div>
            <div className="solver-modal-list">
              {stats.placements.length === 0 ? (
                <div className="solver-modal-state">No puzzles found for this solver.</div>
              ) : (
                <table className="solver-modal-table" aria-label="Puzzles solved by this solver">
                  <tbody>
                    {stats.placements.map((pl, i) => {
                      const p = pl.puzzle;
                      const indexUrl = p.solution_url
                        ? p.solution_url.replace('-solution', '-index')
                        : '';
                      return (
                        <tr key={`${p.date_text}-${i}`}>
                          <td className="solver-modal-date">{formatDate(p.date_text)}</td>
                          <td>
                            {indexUrl ? (
                              <a
                                href={indexUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="puzzle-link-table"
                              >
                                {p.name}
                              </a>
                            ) : (
                              p.name
                            )}
                          </td>
                          <td className="solver-modal-place">
                            {pl.rank} / {pl.total}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SolverProfileModal;
