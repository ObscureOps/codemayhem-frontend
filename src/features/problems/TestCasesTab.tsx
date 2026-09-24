import { useState } from 'react';
import type { CheckStatus } from './useCheckCodeFlow';
import type { MockTestCase } from '../../api/mocks/testCases';
import { DiffView } from './DiffView';
import { diffLines } from './diff';

interface TestCasesTabProps {
  status: CheckStatus;
  results: MockTestCase[] | null;
  onCheck: () => void;
}

export function TestCasesTab({ status, results, onCheck }: TestCasesTabProps) {
  const [openTestId, setOpenTestId] = useState<string | null>(null);

  if (openTestId && results) {
    const test = results.find((t) => t.id === openTestId);
    if (test) {
      return (
        <DiffView
          result={diffLines(test.actualOutput, test.expectedOutput)}
          onClose={() => setOpenTestId(null)}
        />
      );
    }
  }

  const passedCount = results?.filter((t) => t.passed).length ?? 0;
  const totalCount = results?.length ?? 0;
  // FIX (4f): 0/0 previously rendered green ("passedCount === totalCount"
  // is true at 0 === 0) — misleading for a problem with no mock test
  // cases at all. Now only green when there's at least one test and all passed.
  const allPassed = totalCount > 0 && passedCount === totalCount;

  return (
    <div className="p-4">
      {status === 'idle' && (
        <button
          onClick={onCheck}
          className="w-full font-mono text-sm text-graphite border border-graphite px-3 py-2 hover:text-ink hover:border-ink transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
        >
          [ check code ]
        </button>
      )}

      {(status === 'queued' || status === 'running') && (
        <p className="font-mono text-sm text-graphite" role="status" aria-live="polite">
          {status === 'queued' ? '> queued' : '> running tests...'}
        </p>
      )}

      {status === 'done' && results && (
        <>
          <ul className="space-y-2 mb-4">
            {results.map((test) => (
              <li key={test.id} className="flex items-center justify-between border-b border-graphite pb-2">
                <span className="font-mono text-sm flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${test.passed ? 'bg-pass' : 'bg-fail'}`} />
                  {test.name}
                </span>
                {!test.passed && (
                  <button
                    onClick={() => setOpenTestId(test.id)}
                    className="font-mono text-xs text-graphite underline hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
                  >
                    see what's wrong
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="font-mono text-sm">
            Score: <span className={allPassed ? 'text-pass' : 'text-fail'}>{passedCount}/{totalCount}</span>
          </p>
          <button
            onClick={onCheck}
            className="mt-3 font-mono text-xs text-graphite underline hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
          >
            check again
          </button>
        </>
      )}
    </div>
  );
}
