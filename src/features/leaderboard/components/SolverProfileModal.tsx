import React, { useEffect, useMemo } from 'react';
import { useRawPuzzleData } from '../hooks/useRawPuzzleData';
import { Puzzle } from '../types';
import {
  SolverPlacement,
  computeAveragePercentile,
  findSolverPlacement,
  formatDate,
} from '../../../utils/leaderboardUtils';
import { HIDDEN_PALETTE, colorFromName } from './solverChipPalettes';

interface SolverProfileModalProps {
  solverName: string | null;
  onClose: () => void;
}

const AVG_PERCENTILE_TOOLTIP =
  'Average percentile rank across solved puzzles. 100 = always first, ' +
  '0 = always last. Formula: 100 × (1 − (rank − 1) / (solvers − 1)), ' +
  'averaged across puzzles. Puzzles with only one solver are excluded.';

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
  const open = !!solverName;
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

  const stats = useMemo(() => {
    if (!solverName || !puzzles) return null;
    return computeSolverStats(solverName, puzzles);
  }, [solverName, puzzles]);

  if (!open || !solverName) return null;

  // Determinstic per-name avatar color, same palette as banner tooltip.
  const avatarColors = colorFromName(solverName, HIDDEN_PALETTE);
  const initial = solverName.trim().charAt(0).toUpperCase() || '?';

  return (
    <div
      className="solver-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Profile for ${solverName}`}
    >
      <div className="solver-modal" onClick={(e) => e.stopPropagation()}>
        <button
          className="solver-modal-close"
          onClick={onClose}
          aria-label="Close profile"
          title="Close (Esc)"
        >
          ×
        </button>

        <header className="solver-modal-identity">
          <div
            className="solver-modal-avatar"
            style={{ backgroundColor: avatarColors.bg, color: avatarColors.text }}
            aria-hidden="true"
          >
            {initial}
          </div>
          <h2 className="solver-modal-title">{solverName}</h2>
          {stats && (
            <div className="solver-modal-eyebrow">
              Since {stats.firstAppearance}
            </div>
          )}
        </header>

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
              <div className="solver-stat" title={AVG_PERCENTILE_TOOLTIP}>
                <div className="solver-stat-value">
                  {stats.avgPercentile
                    ? stats.avgPercentile.value.toFixed(1)
                    : '—'}
                </div>
                <div className="solver-stat-label">
                  Avg percentile
                  {stats.avgPercentile && (
                    <span className="solver-stat-sample">
                      {' '}
                      (n={stats.avgPercentile.sampleSize})
                    </span>
                  )}
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
