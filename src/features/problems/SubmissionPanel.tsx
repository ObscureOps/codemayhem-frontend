
import type { ProblemResult, ProblemSubmissionStatus } from '../../api/types/problems';

const STEPS: ProblemSubmissionStatus[] = ['queued', 'compiling', 'running', 'result'];

interface SubmissionPanelProps {
  status: 'idle' | ProblemSubmissionStatus;
  result: ProblemResult | null;
  onSubmit: () => void;
  onReset: () => void;
}

// This is the screen's one signature element (Part C): a single control
// that is the submit button in its idle state, then becomes a live
// compile-status ticker — the Problems-page analog of "the battle timer
// is the one bold element." `signal` is spent here and nowhere else on
// this screen.
export function SubmissionPanel({ status, result, onSubmit, onReset }: SubmissionPanelProps) {
  if (status === 'idle') {
    return (
      <div className="p-4 border-t border-graphite">
        <button
          onClick={onSubmit}
          className="font-mono text-sm text-signal border border-signal px-4 py-2 hover:bg-signal hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          [ submit ]
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

      {status === 'result' && (
        <button
          onClick={onReset}
          className="mt-3 text-graphite underline hover:text-chalk focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
        >
          reset
        </button>
      )}
    </div>
  );
}
