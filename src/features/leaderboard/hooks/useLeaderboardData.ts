import { useEffect, useState } from 'react';
import { loadLeaderboardData } from '../services/leaderboardService';
import { NormalizedLeaderboardData } from '../types';

interface UseLeaderboardDataResult {
  data: NormalizedLeaderboardData | null;
  loading: boolean;
}

export const useLeaderboardData = (): UseLeaderboardDataResult => {
  const [data, setData] = useState<NormalizedLeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    loadLeaderboardData().then((result) => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
};

