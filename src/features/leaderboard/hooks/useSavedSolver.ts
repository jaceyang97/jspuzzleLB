import { useSyncExternalStore } from 'react';
import { createLocalStorage } from '@ui-sdk/core';

const savedSolver = createLocalStorage('jspuzzle.my-profile');

export function useSavedSolver() {
  return useSyncExternalStore(savedSolver.subscribe, savedSolver.get, () => null);
}

export function saveSolver(name: string | null) {
  return name === null ? savedSolver.remove() : savedSolver.set(name);
}
