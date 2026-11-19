import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../../api/client';
import type { Verdict } from '../../api/types/problems';
import { classify } from './verdict';

export type SubmissionState =
  | { phase: 'idle' }
  | { phase: 'submitting'; startedAt: number }
  | { phase: 'done'; verdict: Verdict; durationMs: number };

export interface HistoryEntry {
  id: number;
  at: number;
  durationMs: number;
  verdict: Verdict;
  solution: string;
}

const HISTORY_LIMIT = 20;

// The server returns one response after two sandbox runs and gives no stage
// information, so the only honest progress signal is elapsed time.
export function useProblemSubmissionFlow(problemId: string) {
  const [state, setState] = useState<SubmissionState>({ phase: 'idle' });
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const inFlight = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const nextId = useRef(1);

  useEffect(() => {
    if (state.phase !== 'submitting') return;
    const timer = window.setInterval(() => setElapsed(Date.now() - state.startedAt), 200);
    return () => window.clearInterval(timer);
  }, [state]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const submit = useCallback(
    async (solution: string) => {
      // The server cannot cancel a running job, so never start a second one.
      if (inFlight.current) return;
      inFlight.current = true;

      const controller = new AbortController();
      abortRef.current = controller;
      const startedAt = Date.now();
      setElapsed(0);
      setState({ phase: 'submitting', startedAt });

      let verdict: Verdict;
      try {
        const res = await apiClient.problems.submit(problemId, solution, controller.signal);
        verdict = classify(res.status, res.body);
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          inFlight.current = false;
          return;
        }
        verdict = { kind: 'network_error' };
      }

      inFlight.current = false;
      const durationMs = Date.now() - startedAt;
      setState({ phase: 'done', verdict, durationMs });
      setHistory((prev) =>
        [{ id: nextId.current++, at: Date.now(), durationMs, verdict, solution }, ...prev].slice(0, HISTORY_LIMIT),
      );
    },
    [problemId],
  );

  const reset = useCallback(() => setState({ phase: 'idle' }), []);

  return { state, elapsed, history, submit, reset, isSubmitting: state.phase === 'submitting' };
}
