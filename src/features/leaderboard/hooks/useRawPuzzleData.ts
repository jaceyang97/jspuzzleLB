import { useEffect, useState } from 'react';
import { Puzzle } from '../types';

interface UseRawPuzzleDataResult {
  puzzles: Puzzle[] | null;
  loading: boolean;
  error: Error | null;
}

let cache: Puzzle[] | null = null;
let inflight: Promise<Puzzle[]> | null = null;

/**
 * Lazily load the raw /data/data.json puzzles list when `enabled` is true.
 * Module-level cache + in-flight dedup so multiple consumers share one fetch.
 */
export const useRawPuzzleData = (enabled: boolean): UseRawPuzzleDataResult => {
  const [puzzles, setPuzzles] = useState<Puzzle[] | null>(cache);
  const [loading, setLoading] = useState(!cache && enabled);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || cache) {
      if (cache) setPuzzles(cache);
      return;
    }

    let cancelled = false;
    setLoading(true);

    if (!inflight) {
      inflight = fetch('/data/data.json', { cache: 'no-cache' })
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to load /data/data.json: ${r.status}`);
          return r.json() as Promise<Puzzle[]>;
        })
        .then((data) => {
          cache = data;
          return data;
        })
        .finally(() => {
          inflight = null;
        });
    }

    inflight
      .then((data) => {
        if (cancelled) return;
        setPuzzles(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err as Error);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { puzzles, loading, error };
};
