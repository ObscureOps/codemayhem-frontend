import type { RunResult, RuntimeCause, Verdict } from '../../api/types/problems';

const OUTPUT_CAP_BYTES = 4096;

// 128 + signal number, as produced by trapseccomp and the shell.
// Verify the cpu_time and timeout rows against real failing runs.
const CAUSES: Record<number, RuntimeCause> = {
  159: 'blocked_syscall',
  152: 'cpu_time',
  137: 'killed',
  143: 'timeout',
  139: 'segfault',
  134: 'abort',
  153: 'file_size',
};

export const CAUSE_TEXT: Record<RuntimeCause, string> = {
  blocked_syscall: 'Your program tried to use a system call the sandbox does not allow.',
  cpu_time: 'Your program used too much CPU time (limit: 3 seconds).',
  killed: 'Your program was killed for using too much memory or time.',
  timeout: 'Your program ran past the time limit.',
  segfault: 'Your program crashed with a segmentation fault.',
  abort: 'Your program aborted. Check for failed assertions or undefined behavior.',
  file_size: 'Your program wrote too much data.',
  exit_code: 'Your program exited with a non-zero status.',
};

export const VERDICT_LABEL: Record<Verdict['kind'], string> = {
  accepted: 'Accepted',
  wrong_answer: 'Wrong answer',
  compile_error: 'Compile error',
  runtime_error: 'Runtime error',
  already_solved: 'Already solved',
  invalid: 'Invalid request',
  unauthorized: 'Session expired',
  server_error: 'Server error',
  network_error: 'Network error',
};

const isRunResult = (v: unknown): v is RunResult =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as RunResult).output === 'string' &&
  typeof (v as RunResult).status === 'number';

const bytes = (s: string) => new TextEncoder().encode(s).length;

export function classify(httpStatus: number, body: unknown): Verdict {
  if (httpStatus === 201) {
    const id = (body as { id?: unknown } | null)?.id;
    return { kind: 'accepted', solvedId: String(id ?? '') };
  }
  if (httpStatus === 409) return { kind: 'already_solved' };
  if (httpStatus === 401 || httpStatus === 403) return { kind: 'unauthorized' };

  if (httpStatus === 400 && typeof body === 'object' && body !== null) {
    const { expected, got } = body as { expected?: unknown; got?: unknown };

    if (isRunResult(got) && isRunResult(expected)) {
      if (got.reason === 'compiler error') return { kind: 'compile_error', got };
      if (got.reason === 'program error') {
        return { kind: 'runtime_error', got, cause: CAUSES[got.status] ?? 'exit_code' };
      }
      return {
        kind: 'wrong_answer',
        expected,
        got,
        truncated: bytes(got.output) >= OUTPUT_CAP_BYTES || bytes(expected.output) >= OUTPUT_CAP_BYTES,
      };
    }
  }

  if (httpStatus === 400) return { kind: 'invalid' };
  return { kind: 'server_error' };
}
