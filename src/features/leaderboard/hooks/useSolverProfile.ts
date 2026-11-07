import { useCallback, useEffect, useRef, useState } from 'react';
import { trackEvent } from '../../../utils/analytics';

const solverFromUrl = () => new URLSearchParams(window.location.search).get('solver');

export function useSolverProfile(source: string) {
  const [selectedSolver, setSelectedSolver] = useState<string | null>(solverFromUrl);
  const opened = useRef<{ name: string; at: number } | null>(null);

  const openSolver = useCallback((name: string, origin = source) => {
    trackEvent('solver_profile_open', { solver: name, source: origin });
    opened.current = { name, at: Date.now() };
    setSelectedSolver(name);
  }, [source]);
  const closeSolver = useCallback(() => setSelectedSolver(null), []);

  useEffect(() => {
    if (selectedSolver && opened.current?.name !== selectedSolver) {
      trackEvent('solver_profile_open', { solver: selectedSolver, source: 'url' });
      opened.current = { name: selectedSolver, at: Date.now() };
    } else if (!selectedSolver && opened.current) {
      const { name, at } = opened.current;
      opened.current = null;
      trackEvent('solver_profile_close', { solver: name, seconds: Math.round((Date.now() - at) / 1000) });
    }
  }, [selectedSolver]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('solver') === selectedSolver) return;
    if (selectedSolver) url.searchParams.set('solver', selectedSolver);
    else url.searchParams.delete('solver');
    window.history.pushState(null, '', url);
  }, [selectedSolver]);

  useEffect(() => {
    const onPop = () => setSelectedSolver(solverFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return { selectedSolver, openSolver, closeSolver };
}
