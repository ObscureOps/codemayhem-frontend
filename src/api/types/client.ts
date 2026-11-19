import type {
  AuthSession,
  ChangeEmailResponse,
  ChangePasswordResponse,
  LogoutResponse,
  OtpRequest,
  OtpResponse,
  SigninResponse,
  SignupResponse,
} from './auth'
import type { FreestyleLanguage, FreestyleRequest, FreestyleResponse } from './freestyle'
import type {
  CommunitySolution,
  CreateProblemInput,
  Marks,
  MarkKind,
  Problem,
  ProblemSubmitResponse,
  ProblemSummary,
  Profile,
  SolvedInfo,
  UpdateProblemInput,
  UpdateProblemMetaInput,
} from './problems'

export interface ApiClient {
  auth: {
    requestOtp(req: OtpRequest): Promise<OtpResponse>

    signup(req: {
      email: string
      otp: string
      pass: string
      username: string
    }): Promise<SignupResponse>

    signin(req: { email: string; pass: string }): Promise<SigninResponse>

    changePassword(req: { pass: string; otp: string }): Promise<ChangePasswordResponse>

    changeEmail(req: {
      email: string
      otpOld: string
      otpNew: string
    }): Promise<ChangeEmailResponse>

    logout(): Promise<LogoutResponse>

    getSession(): Promise<AuthSession | null>
    setSession(session: AuthSession, persist: boolean): Promise<void>
    clearSession(): Promise<void>
  }

  freestyle: {
    run(language: FreestyleLanguage, req: FreestyleRequest): Promise<FreestyleResponse>
  }

  problems: {
    // Reads and simple writes go through SurrealDB's native /sql endpoint.
    list(): Promise<ProblemSummary[]>
    // null when the id is malformed or the problem does not exist.
    get(id: string): Promise<Problem | null>
    // problemId -> info about the solved record the user can read.
    solved(): Promise<Record<string, SolvedInfo>>

    // Custom API: POST /problem/:id, POST /problem, PATCH /problem/:id.
    // They return the raw status and parsed body.
    submit(id: string, solution: string, signal?: AbortSignal): Promise<ProblemSubmitResponse>
    create(input: CreateProblemInput, signal?: AbortSignal): Promise<ProblemSubmitResponse>
    update(id: string, input: UpdateProblemInput, signal?: AbortSignal): Promise<ProblemSubmitResponse>

    // Author only: edit title, description, difficulty and starter code, or
    // delete the whole problem. Both throw with the database's message on failure.
    updateMeta(id: string, input: UpdateProblemMetaInput): Promise<void>
    remove(id: string): Promise<void>

    // Deletes the user's own solved record so the problem can be judged again.
    // The judge answers 409 and skips running code while that record exists.
    resetSolved(id: string): Promise<void>

    // `attempted` relation: the last solution this user submitted.
    saveAttempt(id: string, solution: string): Promise<void>
    getAttempt(id: string): Promise<string | null>

    // Flips solved.is_public for the user's own solved record.
    setPublic(id: string, isPublic: boolean): Promise<void>
    community(id: string): Promise<CommunitySolution[]>

    // `liked` and `bookmarked` relations (own records only).
    marks(): Promise<Marks>
    setMark(kind: MarkKind, id: string, on: boolean): Promise<void>
  }

  profiles: {
    // GET /profile/:id, cached per session. null when unavailable.
    get(id: string): Promise<Profile | null>
  }
}
