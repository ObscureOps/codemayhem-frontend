import type { AuthoringResult } from './authoring';

interface AuthoringNoticeProps {
  result: AuthoringResult;
  okMessage: string;
}

const TEXT: Record<Exclude<AuthoringResult['kind'], 'ok' | 'judge_failed'>, string> = {
  conflict: 'A problem with this title already exists for this language. Pick a different title.',
  incomplete: 'Every field is required: title, description, starter code, harness and reference solution.',
  rejected: 'The server rejected the change. Only the author can edit a problem, and both harness and solution are required.',
  not_applied:
    'The server accepted the update, but the stored harness and solution did not change. The table may block edits to those fields. Ask the backend team to check problem.surql.',
  unauthorized: 'Your sign-in expired. Sign in again, then retry. Your edits are still on this page.',
  server_error: 'The server failed on its side. Try again in a moment.',
  network_error: 'Could not reach the server. Check your connection and try again.',
};

export function AuthoringNotice({ result, okMessage }: AuthoringNoticeProps) {
  if (result.kind === 'ok') {
    return (
      <p role="status" className="border border-pass px-4 py-3 font-mono text-sm text-pass">
        {okMessage}
      </p>
    );
  }

  if (result.kind === 'judge_failed') {
    const stage = result.run.reason === 'compiler error' ? 'did not compile' : 'crashed or exited with an error';
    return (
      <div role="alert" className="space-y-2 border border-fail px-4 py-3 font-mono text-sm">
        <p className="text-fail">
          The server ran your harness with your reference solution and it {stage} (exit status {result.run.status}).
          Fix the harness or the solution, then try again.
        </p>
        <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words text-xs text-graphite">
          {result.run.output || '(no output)'}
        </pre>
      </div>
    );
  }

  return (
    <p role="alert" className="border border-fail px-4 py-3 font-mono text-sm text-fail">
      {TEXT[result.kind]}
    </p>
  );
}
