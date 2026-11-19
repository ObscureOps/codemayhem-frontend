import { useState } from 'react';
import type { ProblemLanguage, RunResult } from '../../api/types/problems';
import { diffLines } from './diff';
import { DiffView } from './DiffView';
import type { SubmissionState } from './useProblemSubmissionFlow';
import { CAUSE_TEXT, VERDICT_LABEL } from './verdict';

interface VerdictPanelProps {
  state: SubmissionState;
  elapsed: number;
  language: ProblemLanguage;
  // Resets the user's solved record and judges the current code again.
  onSolveAgain?: () => void;
  solveAgainBusy?: boolean;
  notice?: string | null;
}

const TIPS: Record<ProblemLanguage, string> = {
  C: 'Warnings are treated as errors, so an unused variable fails the build. Print exactly what the problem asks for and nothing else.',
  Java: 'Warnings are treated as errors (-Xlint -Werror). Your solution is compiled alongside the judge\'s Main class.',
  SQLite: 'Row order and column names are compared exactly. Add ORDER BY wherever order matters.',
};

const TONE = {
  pass: 'text-pass',
  fail: 'text-fail',
  signal: 'text-signal',
  muted: 'text-graphite',
} as const;

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

function Header({ label, tone, meta }: { label: string; tone: keyof typeof TONE; meta?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-graphite px-4 py-2 font-mono text-sm">
      <span className={`font-semibold ${TONE[tone]}`}>{label}</span>
      {meta && <span className="text-xs text-graphite">{meta}</span>}
    </div>
  );
}

function Output({ text }: { text: string }) {
  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-sm text-chalk">
      {text || <span className="text-graphite">(no output)</span>}
    </pre>
  );
}

function firstMismatch(expected: string, got: string) {
  const e = expected.split('\n');
  const g = got.split('\n');
  for (let i = 0; i < Math.max(e.length, g.length); i++) {
    if (e[i] !== g[i]) return { line: i + 1, expected: e[i], got: g[i] };
  }
  return null;
}

function WrongAnswerView({
  expected,
  got,
  truncated,
  durationMs,
}: {
  expected: RunResult;
  got: RunResult;
  truncated: boolean;
  durationMs: number;
}) {
  const [showDiff, setShowDiff] = useState(false);
  const mismatch = firstMismatch(expected.output, got.output);

  if (showDiff) {
    return <DiffView result={diffLines(got.output, expected.output)} onClose={() => setShowDiff(false)} />;
  }

  return (
    <>
      <Header label={VERDICT_LABEL.wrong_answer} tone="fail" meta={seconds(durationMs)} />
      <div className="space-y-3 p-4">
        {mismatch ? (
          <>
            <p className="font-mono text-xs text-graphite">First difference at line {mismatch.line}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1 font-mono text-xs text-graphite">expected</p>
                <Output text={mismatch.expected ?? ''} />
              </div>
              <div>
                <p className="mb-1 font-mono text-xs text-graphite">your output</p>
                <Output text={mismatch.got ?? ''} />
              </div>
            </div>
          </>
        ) : (
          <p className="font-mono text-sm text-chalk">
            The output text matches, but the exit status differs (expected {expected.status}, got {got.status}).
          </p>
        )}

        {truncated && (
          <p className="font-mono text-xs text-graphite">
            Output is capped at 4096 bytes. Very long output may be cut off before the real difference.
          </p>
        )}

        {mismatch && (
          <button
            onClick={() => setShowDiff(true)}
            className="font-mono text-xs text-graphite underline hover:text-chalk focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-signal"
          >
            see full diff (reveals the entire expected output)
          </button>
        )}
      </div>
    </>
  );
}

export function VerdictPanel({ state, elapsed, language, onSolveAgain, solveAgainBusy, notice }: VerdictPanelProps) {
  if (state.phase === 'idle') {
    return (
      <div className="space-y-2 p-4 font-mono text-sm text-graphite">
        <p>Submit runs your code against the judge's hidden harness and compares the result with the reference solution.</p>
        <p>{TIPS[language]}</p>
        <p className="text-xs">Ctrl/Cmd + Enter to submit.</p>
        {notice && <p className="text-fail">{notice}</p>}
      </div>
    );
  }

  if (state.phase === 'submitting') {
    return (
      <div role="status" aria-live="polite">
        <Header label="> judging" tone="signal" meta={seconds(elapsed)} />
        <p className="p-4 font-mono text-sm text-graphite">
          Compiling and running your code, then the reference solution. A busy server may queue your run.
        </p>
      </div>
    );
  }

  const { verdict, durationMs } = state;
  const meta = seconds(durationMs);

  return (
    <div role="status" aria-live="polite">
      {verdict.kind === 'accepted' && (
        <>
          <Header label={VERDICT_LABEL.accepted} tone="pass" meta={meta} />
          <p className="p-4 font-mono text-sm text-chalk">Your output matches the reference exactly. This problem is now marked solved.</p>
        </>
      )}

      {verdict.kind === 'wrong_answer' && (
        <WrongAnswerView
          expected={verdict.expected}
          got={verdict.got}
          truncated={verdict.truncated}
          durationMs={durationMs}
        />
      )}

      {verdict.kind === 'compile_error' && (
        <>
          <Header label={VERDICT_LABEL.compile_error} tone="fail" meta={meta} />
          <div className="space-y-3 p-4">
            <Output text={verdict.got.output} />
            <p className="font-mono text-xs text-graphite">{TIPS[language]}</p>
          </div>
        </>
      )}

      {verdict.kind === 'runtime_error' && (
        <>
          <Header label={VERDICT_LABEL.runtime_error} tone="fail" meta={`exit ${verdict.got.status} · ${meta}`} />
          <div className="space-y-3 p-4">
            <p className="font-mono text-sm text-chalk">{CAUSE_TEXT[verdict.cause]}</p>
            <Output text={verdict.got.output} />
          </div>
        </>
      )}

      {verdict.kind === 'already_solved' && (
        <>
          <Header label={VERDICT_LABEL.already_solved} tone="muted" />
          <div className="space-y-3 p-4 font-mono text-sm">
            <p className="text-graphite">
              The judge skips problems you have already solved, so this code was not run and nothing was checked.
            </p>
            {onSolveAgain && (
              <button
                onClick={onSolveAgain}
                disabled={solveAgainBusy}
                className="border border-signal px-3 py-1.5 text-signal transition-colors hover:bg-signal hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
              >
                {solveAgainBusy ? '[ resetting... ]' : '[ reset solved status and judge this code ]'}
              </button>
            )}
            {notice && <p className="text-fail">{notice}</p>}
          </div>
        </>
      )}

      {verdict.kind === 'invalid' && (
        <>
          <Header label={VERDICT_LABEL.invalid} tone="fail" />
          <p className="p-4 font-mono text-sm text-graphite">The server rejected this submission. Check that the problem still exists and try again.</p>
        </>
      )}

      {verdict.kind === 'unauthorized' && (
        <>
          <Header label={VERDICT_LABEL.unauthorized} tone="fail" />
          <p className="p-4 font-mono text-sm text-graphite">Your sign-in expired (tokens last 12 hours). Sign in again. Your code is saved in this browser.</p>
        </>
      )}

      {verdict.kind === 'server_error' && (
        <>
          <Header label={VERDICT_LABEL.server_error} tone="fail" meta={meta} />
          <p className="p-4 font-mono text-sm text-graphite">The judge failed on its side, not yours. Try again in a moment.</p>
        </>
      )}

      {verdict.kind === 'network_error' && (
        <>
          <Header label={VERDICT_LABEL.network_error} tone="fail" meta={meta} />
          <p className="p-4 font-mono text-sm text-graphite">Could not reach the server. Check your connection and try again.</p>
        </>
      )}
    </div>
  );
}
