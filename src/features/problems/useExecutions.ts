
import { useCallback, useState } from 'react';
import type { EditorFile } from './useMultiFileEditor';

export interface ExecutionCheckpoint {
  id: string;
  timestamp: number;
  score: string; // e.g. "2/4"
  passed: boolean; // true only if totalCount > 0 and every test passed
  files: EditorFile[];
}

// STORAGE DECISION (4f, made now per the Milestone 4 doc's explicit ask):
// session-only, in-memory. Not persisted to localStorage. There is no
// contracted endpoint yet to list a user's past submissions for a
// problem (see CONTRACT.md — the `attempted` relation is unconfirmed),
// so persisting a checkpoint list now would create data with nothing
// real to reconcile against later, and a migration problem once backend
// does ship a real endpoint. Revisit this decision specifically when
// `attempted` gets a documented REST surface.
export function useExecutions() {
  const [checkpoints, setCheckpoints] = useState<ExecutionCheckpoint[]>([]);

  const addCheckpoint = useCallback((files: EditorFile[], passedCount: number, totalCount: number) => {
    setCheckpoints((prev) => [
      {
        id: `exec-${Date.now()}-${prev.length}`,
        timestamp: Date.now(),
        score: `${passedCount}/${totalCount}`,
        passed: totalCount > 0 && passedCount === totalCount,
        files,
      },
      ...prev,
    ]);
  }, []);

  const clearAll = useCallback(() => setCheckpoints([]), []);

  return { checkpoints, addCheckpoint, clearAll };
}
