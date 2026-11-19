import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import type { CommunitySolution } from '../../api/types/problems';
import type { Load } from './useProblemData';

export type CommunityState = { status: 'idle' } | Load<CommunitySolution[]>;

// Loads public solutions the first time `enabled` becomes true.
export function useCommunity(problemId: string, enabled: boolean): CommunityState {
  const [state, setState] = useState<CommunityState>({ status: 'idle' });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    apiClient.problems
      .community(problemId)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ status: 'error', message: error.message });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, problemId]);

  return enabled && state.status === 'idle' ? { status: 'loading' } : state;
}
