import type { ProblemResult, ProblemSubmissionStatus } from '../../api/types/problems';
import type { CheckStatus } from './useCheckCodeFlow';

const STEPS: ProblemSubmissionStatus[] = ['queued', 'compiling', 'running', 'result'];

interface SubmissionPanelProps {
  status: 'idle' | ProblemSubmissionStatus;
  result: ProblemResult | null;
  onSubmit: () => void;
  onReset: () => void;
  checkStatus: CheckStatus;
  onCheck: () => void;
}

// The run control is this screen's one signature element (Part C): a
// button that becomes a live compile-status ticker. `signal` is spent
// here and nowhere else. The check-code control sits alongside it —
// restoring the Run/Check split the Milestone 4 spec called for and 4c
// missed — but stays a plain label toggle; its actual progress and
// results live in the right panel's Test Cases tab, per the spec's own
// wording ("updates each test's pass/fail state in the right panel").
export function SubmissionPanel({
  status,
  result,
  onSubmit,
  onReset,
  checkStatus,
  onCheck,
}: SubmissionPanelProps) {
  const checking = checkStatus === 'queued' || checkStatus === 'running';

  if (status === 'idle') {
    return (
      <div className="p-4 border-t border-graphite flex gap-3">
        <button
          onClick={onSubmit}
          className="font-mono text-sm text-signal border border-signal px-4 py-2 hover:bg-signal hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          [ run ]
        </button>
        <button
          onClick={onCheck}
          disabled={checking}
          className="font-mono text-sm text-graphite border border-graphite px-4 py-2 hover:text-ink hover:border-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
        >
          {checking ? '[ checking... ]' : '[ check ]'}
        </button>
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(status);

  return (
    <div className="p-4 border-t border-graphite font-mono text-sm" role="status" aria-live="polite">
      {STEPS.map((step, i) => (
        <div key={step} className={i === currentIndex ? 'text-signal' : 'text-graphite'}>
          {i <= currentIndex ? '>' : ' '} {step}
        </div>
      ))}

      {status === 'result' && result && (
        <pre className="mt-3 pt-3 border-t border-graphite whitespace-pre-wrap text-chalk">
          {result.stdout}
          {result.stderr && <span className="text-fail">{'\n' + result.stderr}</span>}
        </pre>
      )}

      <div className="flex gap-4 mt-3">
        {status === 'result' && (
          <button
            onClick={onReset}
            className="text-graphite underline hover:text-chalk focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
          >
            reset
          </button>
        )}
        <button
          onClick={onCheck}
          disabled={checking}
          className="text-graphite underline hover:text-chalk disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
        >
          {checking ? 'checking...' : '[ check ]'}
        </button>
      </div>
    </div>
  );
}
