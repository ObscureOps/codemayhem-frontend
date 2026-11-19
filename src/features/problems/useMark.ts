import { useCallback, useState } from 'react';
import { apiClient } from '../../api/client';
import type { MarkKind } from '../../api/types/problems';

// Optimistic toggle for the `liked` and `bookmarked` relations. Rolls back
// and reports the error if the server refuses.
export function useMark(kind: MarkKind, problemId: string, initial: boolean) {
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback(async () => {
    if (busy) return;
    const next = !on;
    setOn(next);
    setBusy(true);
    setError(null);

    try {
      await apiClient.problems.setMark(kind, problemId, next);
    } catch (e) {
      setOn(!next);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [busy, kind, on, problemId]);

  return { on, busy, error, toggle };
}
