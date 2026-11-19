import { useEffect, useState } from 'react';
import { apiClient } from '../../api/client';
import type { Marks, Problem, ProblemSummary, SolvedInfo } from '../../api/types/problems';

export type Load<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

export interface ProblemListData {
  problems: ProblemSummary[];
  solved: Record<string, SolvedInfo>;
  liked: Set<string>;
  bookmarked: Set<string>;
}

export interface ProblemDetailData {
  problem: Problem | null;
  solved: SolvedInfo | null;
  liked: boolean;
  bookmarked: boolean;
  attempt: string | null;
}

const NO_MARKS: Marks = { liked: [], bookmarked: [] };

// Solved, marks and attempts are best effort: a failure in any of them must
// not stop the problem itself from loading.
export function useProblemList(): Load<ProblemListData> {
  const [state, setState] = useState<Load<ProblemListData>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClient.problems.list(),
      apiClient.problems.solved().catch((): Record<string, SolvedInfo> => ({})),
      apiClient.problems.marks().catch((): Marks => NO_MARKS),
    ])
      .then(([problems, solved, marks]) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          data: {
            problems,
            solved,
            liked: new Set(marks.liked),
            bookmarked: new Set(marks.bookmarked),
          },
        });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ status: 'error', message: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

// Callers key the component that uses this by `id`, so state starts fresh
// for every problem.
export function useProblem(id: string): Load<ProblemDetailData> {
  const [state, setState] = useState<Load<ProblemDetailData>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiClient.problems.get(id),
      apiClient.problems.solved().catch((): Record<string, SolvedInfo> => ({})),
      apiClient.problems.marks().catch((): Marks => NO_MARKS),
      apiClient.problems.getAttempt(id).catch((): string | null => null),
    ])
      .then(([problem, solved, marks, attempt]) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          data: {
            problem,
            solved: solved[id] ?? null,
            liked: marks.liked.includes(id),
            bookmarked: marks.bookmarked.includes(id),
            attempt,
          },
        });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ status: 'error', message: error.message });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}

// Resolves user ids to usernames through GET /profile/:id (cached in the
// client). Names appear as they arrive; unknown ids simply stay missing.
export function useUsernames(ids: readonly (string | null | undefined)[]): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = [...new Set(ids.filter((value): value is string => !!value))].sort().join(',');

  useEffect(() => {
    if (!key) return;
    let cancelled = false;

    Promise.all(
      key.split(',').map(async (userId) => {
        const profile = await apiClient.profiles.get(userId);
        return [userId, profile?.username] as const;
      }),
    )
      .then((entries) => {
        if (cancelled) return;
        setNames((previous) => {
          const next = { ...previous };
          for (const [userId, username] of entries) {
            if (username) next[userId] = username;
          }
          return next;
        });
      })
      .catch(() => {
        // Usernames are cosmetic.
      });

    return () => {
      cancelled = true;
    };
  }, [key]);

  return names;
}
