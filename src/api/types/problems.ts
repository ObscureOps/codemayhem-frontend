export type Difficulty = 'Easy' | 'Medium' | 'Hard';

// Editor language (CodeEditor and Freestyle use these values).
export type Language = 'c' | 'java' | 'sql';

// Backend language value stored on the `problems` table.
export type ProblemLanguage = 'C' | 'Java' | 'SQLite';

export const PROBLEM_LANGUAGES: ProblemLanguage[] = ['C', 'Java', 'SQLite'];
export const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

export const EDITOR_LANGUAGE: Record<ProblemLanguage, Language> = {
  C: 'c',
  Java: 'java',
  SQLite: 'sql',
};

export interface ProblemSummary {
  id: string; // bare UUID, safe for URLs
  title: string;
  difficulty: Difficulty;
  language: ProblemLanguage;
  authorId: string | null;
  problemHash: string;
  createdAt: string;
}

export interface Problem extends ProblemSummary {
  body: string;
  boilerplate: string;
  updatedAt: string;
  // Present only when the viewer is the author (field-level permissions).
  harness?: string;
  solution?: string;
}

// Shape returned by compilerms, embedded in the judge response.
export interface RunResult {
  output: string;
  status: number;
  reason?: 'compiler error' | 'program error';
}

export type RuntimeCause =
  | 'blocked_syscall'
  | 'cpu_time'
  | 'killed'
  | 'timeout'
  | 'segfault'
  | 'abort'
  | 'file_size'
  | 'exit_code';

export type Verdict =
  | { kind: 'accepted'; solvedId: string }
  | { kind: 'wrong_answer'; expected: RunResult; got: RunResult; truncated: boolean }
  | { kind: 'compile_error'; got: RunResult }
  | { kind: 'runtime_error'; got: RunResult; cause: RuntimeCause }
  | { kind: 'already_solved' }
  | { kind: 'invalid' }
  | { kind: 'unauthorized' }
  | { kind: 'server_error' }
  | { kind: 'network_error' };

export interface ProblemSubmitResponse {
  status: number;
  body: unknown;
}

export interface CreateProblemInput {
  title: string;
  difficulty: Difficulty;
  language: ProblemLanguage;
  body: string;
  boilerplate: string;
  harness: string;
  solution: string;
}

// PATCH /problem/:id only accepts these two fields.
export interface UpdateProblemInput {
  harness: string;
  solution: string;
}

// Written straight to the problems table by the author. These fields do not
// feed problem_hash, so editing them never marks earlier solves as outdated.
export interface UpdateProblemMetaInput {
  title: string;
  difficulty: Difficulty;
  body: string;
  boilerplate: string;
}

export interface SolvedInfo {
  hash: string;
  isPublic: boolean;
}

export interface CommunitySolution {
  id: string;
  userId: string;
  solution: string;
  problemHash: string;
  createdAt: string;
}

export type MarkKind = 'liked' | 'bookmarked';

export interface Marks {
  liked: string[];
  bookmarked: string[];
}

export interface Profile {
  username: string;
  createdAt: string;
}
