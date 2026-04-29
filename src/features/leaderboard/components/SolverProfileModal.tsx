import React, { useEffect, useMemo } from 'react';
import { useRawPuzzleData } from '../hooks/useRawPuzzleData';
import { Puzzle } from '../types';
import { formatDate } from '../../../utils/leaderboardUtils';
import { HIDDEN_PALETTE, colorFromName } from './solverChipPalettes';

interface SolverProfileModalProps {
  solverName: string | null;
  onClose: () => void;
}

const computeSolverStats = (solverName: string, puzzles: Puzzle[]) => {
  const solved: Puzzle[] = [];
  for (const p of puzzles) {
    if (p.solvers && p.solvers.includes(solverName)) {
      solved.push(p);
    }
  }
  // Sort puzzles newest first
  solved.sort((a, b) => {
    const da = new Date(a.date_text).getTime();
    const db = new Date(b.date_text).getTime();
    return db - da;
  });

  return {
    puzzles: solved,
    totalSolved: solved.length,
    firstAppearance: solved.length ? formatDate(solved[solved.length - 1].date_text) : 'N/A',
    lastSolve: solved.length ? formatDate(solved[0].date_text) : 'N/A',
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
            <div className="solver-modal-stats">
              <div className="solver-stat">
                <div className="solver-stat-value">{stats.totalSolved}</div>
                <div className="solver-stat-label">Puzzles solved</div>
              </div>
              <div className="solver-stat">
                <div className="solver-stat-value">{stats.lastSolve}</div>
                <div className="solver-stat-label">Last solve</div>
              </div>
            </div>

            <div className="solver-modal-section-label">
              Solved puzzles
            </div>
            <div className="solver-modal-list">
              {stats.puzzles.length === 0 ? (
                <div className="solver-modal-state">No puzzles found for this solver.</div>
              ) : (
                <table className="solver-modal-table" aria-label="Puzzles solved by this solver">
                  <tbody>
                    {stats.puzzles.map((p, i) => {
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
