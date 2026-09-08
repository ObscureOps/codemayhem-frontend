export type Difficulty = 'Easy' | 'Medium' | 'Hard';
export type Language = 'c' | 'java' | 'sql';

export interface SampleOutput {
  label: string;
  content: string;
}

export interface Problem {
  id: string;
  title: string;
  difficulty: Difficulty;
  author: string;
  tags: string[];
  hints?: string[];
  solution?: string;
}

export interface ProblemVariant {
  id: string;
  problemId: string;
  language: Language;
  body: string;
  boilerplate: string;
  sampleOutputs?: SampleOutput[];
  // `harness` intentionally omitted — backend-internal, never sent to the frontend.
}

export interface ProblemSubmitFile {
  name: string;
  content: string;
}

// PROVISIONAL — see CONTRACT.md "Problems (provisional)". `files` (CHANGED
// 4c, was `code: string`) — multi-file editor needs to submit more than
// one file. Also assumes problemId is a problems_variants id. Unconfirmed.
export interface ProblemSubmitRequest {
  problemId: string;
  language: Language;
  files: ProblemSubmitFile[];
}

export interface ProblemSubmitResponse {
  submissionId: string;
  status: 'queued';
}

export type ProblemSubmissionStatus = 'queued' | 'compiling' | 'running' | 'result';

export interface ProblemResult {
  stdout?: string;
  stderr?: string;
}

export interface ProblemSubmissionStatusResponse {
  id: string;
  status: ProblemSubmissionStatus;
  result?: ProblemResult;
}
