import { useEffect, useState } from 'react';
import { loadLeaderboardData } from '../services/leaderboardService';
import { NormalizedLeaderboardData } from '../types';

interface UseLeaderboardDataResult {
  data: NormalizedLeaderboardData | null;
  loading: boolean;
  error: Error | null;
}

export const useLeaderboardData = (): UseLeaderboardDataResult => {
  const [data, setData] = useState<NormalizedLeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadLeaderboardData()
      .then((result) => {
        if (cancelled) return;
        setData(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setData(null);
        setError(err as Error);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
};

