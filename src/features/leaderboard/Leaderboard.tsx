import React, { useCallback, useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { trackEvent } from '../../utils/analytics';
import { useLeaderboardData } from './hooks/useLeaderboardData';
import { useSolverProfile } from './hooks/useSolverProfile';
import LeaderboardPage from './page/LeaderboardPage';
import LeaderboardLoading, { LeaderboardError } from './page/LeaderboardLoading';
import { ProfileDialog } from './page/shared';
import usePageTheme from './page/usePageTheme';
import '../../styles/components.css';
import './page/styles/index.css';

const initialScope = () => {
  const view = new URLSearchParams(window.location.search).get('view');
  return view === 'rising-stars' ? 'rising' : view === 'streaks' ? 'streaks' : 'top';
};

export default function Leaderboard() {
  const { data, loading, error } = useLeaderboardData();
  const [scope, setScope] = useState(initialScope);
  const [search, setSearch] = useState('');
  const { theme, toggleTheme } = usePageTheme();
  const { selectedSolver, openSolver, closeSolver } = useSolverProfile(scope === 'top' ? 'top-solvers' : scope === 'rising' ? 'rising-stars' : scope);
  const changeScope = useCallback((next: string) => {
    if (next !== scope) trackEvent('leaderboard_tab_change', { tab: next === 'rising' ? 'rising-stars' : next === 'top' ? 'top-solvers' : next });
    setScope(next);
  }, [scope]);
  const changeTheme = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    trackEvent('theme_toggle', { to: theme === 'light' ? 'dark' : 'light' });
    toggleTheme(event);
  }, [theme, toggleTheme]);

  useEffect(() => {
    if (error) trackEvent('data_load_error', { message: error.message || 'unknown' });
  }, [error]);

  return <MotionConfig reducedMotion="user">
    {loading ? <LeaderboardLoading theme={theme} toggleTheme={changeTheme} />
      : error || !data ? <LeaderboardError theme={theme} toggleTheme={changeTheme} />
        : <LeaderboardPage data={data} search={search} setSearch={setSearch} scope={scope} setScope={changeScope} onSelect={openSolver} theme={theme} toggleTheme={changeTheme} />}
    {data && <ProfileDialog data={data} name={selectedSolver} onClose={closeSolver} />}
  </MotionConfig>;
}
