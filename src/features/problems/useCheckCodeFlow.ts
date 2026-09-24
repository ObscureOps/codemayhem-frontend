import { useCallback, useReducer, useRef } from 'react';
import { getMockTestCases, type MockTestCase } from '../../api/mocks/testCases';
import type { EditorFile } from './useMultiFileEditor';

export type CheckStatus = 'idle' | 'queued' | 'running' | 'done';

interface State {
  status: CheckStatus;
  results: MockTestCase[] | null;
  // Snapshot of the files as they were AT THE MOMENT check() was called —
  // not whatever's in the editor when the check finishes. This is what
  // 4f's checkpoint saving reads from, so a saved checkpoint always
  // matches the code that actually produced its score, even if the user
  // keeps typing while the mock "runs".
  submittedFiles: EditorFile[] | null;
}

type Action =
  | { type: 'START'; files: EditorFile[] }
  | { type: 'ADVANCE'; status: CheckStatus }
  | { type: 'DONE'; results: MockTestCase[] }
  | { type: 'RESET' };

const initialState: State = { status: 'idle', results: null, submittedFiles: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'START':
      return { status: 'queued', results: null, submittedFiles: action.files };
    case 'ADVANCE':
      return { ...state, status: action.status };
    case 'DONE':
      return { ...state, status: 'done', results: action.results };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// TEMPORARY MOCK-ONLY flow for "Check code" — see CONTRACT.md's 4d
// addendum. Kept as a separate reducer from useProblemSubmissionFlow
// since Run and Check are distinct actions with different outputs.
export function useCheckCodeFlow(variantId: string) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const check = useCallback(
    (files: EditorFile[]) => {
      clearTimers();
      dispatch({ type: 'START', files });
      timers.current.push(window.setTimeout(() => dispatch({ type: 'ADVANCE', status: 'running' }), 500));
      timers.current.push(
        window.setTimeout(() => {
          dispatch({ type: 'DONE', results: getMockTestCases(variantId) });
        }, 1600)
      );
    },
    [clearTimers, variantId]
  );

  const reset = useCallback(() => {
    clearTimers();
    dispatch({ type: 'RESET' });
  }, [clearTimers]);

  return { state, check, reset };
}
