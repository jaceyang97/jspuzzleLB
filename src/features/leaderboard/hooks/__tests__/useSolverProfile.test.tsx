import { act, renderHook } from '@testing-library/react';
import { trackEvent } from '../../../../utils/analytics';
import { useSolverProfile } from '../useSolverProfile';

jest.mock('../../../../utils/analytics', () => ({ trackEvent: jest.fn() }));

describe('useSolverProfile', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/?view=rising-stars');
    jest.clearAllMocks();
  });

  afterEach(() => jest.restoreAllMocks());

  test('opens a shared profile without adding a duplicate history entry', () => {
    window.history.replaceState(null, '', '/?view=rising-stars&solver=Calvin%20Pozderac');
    const push = jest.spyOn(window.history, 'pushState');
    const { result } = renderHook(() => useSolverProfile('rising-stars'));

    expect(result.current.selectedSolver).toBe('Calvin Pozderac');
    expect(push).not.toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith('solver_profile_open', { solver: 'Calvin Pozderac', source: 'url' });
  });

  test('preserves other URL parameters and records the profile source and dwell time', () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1000);
    const { result } = renderHook(() => useSolverProfile('rising-stars'));

    act(() => result.current.openSolver('Danica Xiong', 'new_today'));
    expect(new URLSearchParams(window.location.search).get('solver')).toBe('Danica Xiong');
    expect(new URLSearchParams(window.location.search).get('view')).toBe('rising-stars');
    expect(trackEvent).toHaveBeenCalledWith('solver_profile_open', { solver: 'Danica Xiong', source: 'new_today' });

    now.mockReturnValue(6500);
    act(() => result.current.closeSolver());
    expect(window.location.search).toBe('?view=rising-stars');
    expect(trackEvent).toHaveBeenCalledWith('solver_profile_close', { solver: 'Danica Xiong', seconds: 6 });
  });

  test('follows browser history without pushing another entry', () => {
    const { result } = renderHook(() => useSolverProfile('top-solvers'));
    act(() => result.current.openSolver('Calvin Pozderac'));
    const push = jest.spyOn(window.history, 'pushState');

    act(() => {
      window.history.replaceState(null, '', '/?view=rising-stars');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.selectedSolver).toBeNull();
    act(() => {
      window.history.replaceState(null, '', '/?view=rising-stars&solver=Calvin%20Pozderac');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current.selectedSolver).toBe('Calvin Pozderac');
    expect(push).not.toHaveBeenCalled();
  });
});
