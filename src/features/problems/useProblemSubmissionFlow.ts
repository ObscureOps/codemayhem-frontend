import { useCallback, useReducer, useRef } from 'react';
import type { Language, ProblemResult, ProblemSubmissionStatus, ProblemSubmitFile } from '../../api/types/problems';
import { mockSubmit } from '../../api/mocks/problems';

interface State {
  status: 'idle' | ProblemSubmissionStatus;
  result: ProblemResult | null;
}

type Action =
  | { type: 'SUBMIT' }
  | { type: 'ADVANCE'; status: ProblemSubmissionStatus }
  | { type: 'RESULT'; result: ProblemResult }
  | { type: 'RESET' };

const initialState: State = { status: 'idle', result: null };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SUBMIT':
      return { status: 'queued', result: null };
    case 'ADVANCE':
      return { ...state, status: action.status };
    case 'RESULT':
      return { status: 'result', result: action.result };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useProblemSubmissionFlow() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const submit = useCallback(
    (language: Language, files: ProblemSubmitFile[], variantId: string) => {
      clearTimers();
      dispatch({ type: 'SUBMIT' });

      timers.current.push(
        window.setTimeout(() => dispatch({ type: 'ADVANCE', status: 'compiling' }), 500)
      );
      timers.current.push(
        window.setTimeout(() => dispatch({ type: 'ADVANCE', status: 'running' }), 1200)
      );
      timers.current.push(
        window.setTimeout(async () => {
          const result = await mockSubmit(variantId, language, files);
          dispatch({ type: 'RESULT', result });
        }, 2200)
      );
    },
    [clearTimers]
  );

  const reset = useCallback(() => {
    clearTimers();
    dispatch({ type: 'RESET' });
  }, [clearTimers]);

  return { state, submit, reset };
}
