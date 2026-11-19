import { uuidOf } from '../../api/client';
import type { RunResult } from '../../api/types/problems';

export type AuthoringResult =
  | { kind: 'ok'; id?: string }
  | { kind: 'conflict' }
  | { kind: 'incomplete' }
  | { kind: 'judge_failed'; run: RunResult }
  | { kind: 'rejected' }
  | { kind: 'not_applied' }
  | { kind: 'unauthorized' }
  | { kind: 'server_error' }
  | { kind: 'network_error' };

const isRunResult = (v: unknown): v is RunResult =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as RunResult).output === 'string' &&
  typeof (v as RunResult).status === 'number';

// POST /problem: 201 { id }, 400 "Bad Request" (missing field) or the
// failing run of the reference solution, 409 duplicate title and language.
export function classifyCreate(httpStatus: number, body: unknown): AuthoringResult {
  if (httpStatus === 201) {
    const id = (body as { id?: unknown } | null)?.id;
    return { kind: 'ok', id: id ? uuidOf(id) : undefined };
  }
  if (httpStatus === 409) return { kind: 'conflict' };
  if (httpStatus === 401 || httpStatus === 403) return { kind: 'unauthorized' };
  if (httpStatus === 400) {
    return isRunResult(body) ? { kind: 'judge_failed', run: body } : { kind: 'incomplete' };
  }
  return { kind: 'server_error' };
}

// PATCH /problem/:id: 204 saved, 400 "Bad Request" (not the author, problem
// missing, or a field missing) or the failing run of the new solution.
export function classifyUpdate(httpStatus: number, body: unknown): AuthoringResult {
  if (httpStatus === 204) return { kind: 'ok' };
  if (httpStatus === 401 || httpStatus === 403) return { kind: 'unauthorized' };
  if (httpStatus === 400) {
    return isRunResult(body) ? { kind: 'judge_failed', run: body } : { kind: 'rejected' };
  }
  return { kind: 'server_error' };
}
