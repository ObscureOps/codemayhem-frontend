import type { ApiClient } from './types/client'
import type {
  AuthSession,
  ChangeEmailResponse,
  ChangePasswordResponse,
  OtpRequest,
  OtpResponse,
  SigninRequest,
  SigninResponse,
  SignupRequest,
  SignupResponse,
} from './types/auth'
import type { FreestyleLanguage, FreestyleRequest, FreestyleResponse } from './types/freestyle'
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
} from './types/problems'

const BASE_URL = 'https://codemayhem-api.dcism.org'
// SurrealDB's native auth endpoints (signin) are served at the bare host.
// Custom `DEFINE API` endpoints (otp, signup, profile, password, email,
// problem) are served under /api/:namespace/:database/:endpoint.
const CUSTOM_API_BASE = `${BASE_URL}/api/main/main`

// compilerms is a completely separate Go service (compiler/execution
// sandbox), not part of codemayhem-api/SurrealDB. No auth required.
const COMPILERMS_BASE_URL = 'https://compilerms.dcism.org'

const SESSION_STORAGE_KEY = 'ciscode.session'

// /signup and /email both compare $request.body.email against the
// already-normalized (lowercase, trimmed) value stored in the `otps`
// table. Every OTP-adjacent request must send the same normalized email.
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function requestOtp(req: OtpRequest): Promise<OtpResponse> {
  const res = await fetch(`${CUSTOM_API_BASE}/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: normalizeEmail(req.email) }),
  })

  return { status: res.status, body: await res.text() }
}

async function realSignup(req: {
  email: string
  otp: string
  pass: string
  username: string
}): Promise<SignupResponse> {
  const body: SignupRequest = {
    email: normalizeEmail(req.email),
    otp: req.otp.trim(),
    pass: req.pass,
    username: req.username.trim(),
  }

  const res = await fetch(`${CUSTOM_API_BASE}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  return { status: res.status, body: await res.text() }
}

async function realSignin(req: {
  email: string
  pass: string
}): Promise<SigninResponse> {
  const body: SigninRequest = {
    ns: 'main',
    db: 'main',
    ac: 'users',
    email: normalizeEmail(req.email),
    pass: req.pass,
  }

  const res = await fetch(`${BASE_URL}/signin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  return res.json() as Promise<SigninResponse>
}

// PATCH /api/main/main/password: single `otp` checked against $auth.email,
// body { otp, pass }, 204 on success.
async function realChangePassword(req: {
  pass: string
  otp: string
}): Promise<ChangePasswordResponse> {
  const session = await getStoredSession()

  if (!session) {
    return { status: 401, body: 'No active session' }
  }

  const res = await fetch(`${CUSTOM_API_BASE}/password`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({ pass: req.pass, otp: req.otp.trim() }),
  })

  return { status: res.status, body: await res.text() }
}

// PATCH /api/main/main/email: two-OTP endpoint. `otpOld` is checked against
// $auth.email, `otpNew` against the new `email`. 409 if the new address
// already belongs to another user.
async function realChangeEmail(req: {
  email: string
  otpOld: string
  otpNew: string
}): Promise<ChangeEmailResponse> {
  const session = await getStoredSession()

  if (!session) {
    return { status: 401, body: 'No active session' }
  }

  const res = await fetch(`${CUSTOM_API_BASE}/email`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify({
      email: normalizeEmail(req.email),
      otpOld: req.otpOld.trim(),
      otpNew: req.otpNew.trim(),
    }),
  })

  return { status: res.status, body: await res.text() }
}

// POST /gcc, POST /java, or POST /sqlite3tmp on compilerms, depending on
// `language`. sqlite3tmp takes only `{ stdin }`. compilerms returns HTTP
// 200 even on compile/runtime failure (see `reason` in the response).
async function runFreestyle(
  language: FreestyleLanguage,
  req: FreestyleRequest,
): Promise<FreestyleResponse> {
  const path =
    language === 'c' ? '/gcc' : language === 'java' ? '/java' : '/sqlite3tmp'

  const res = await fetch(`${COMPILERMS_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })

  if (!res.ok) {
    throw new Error(`compilerms request failed: ${res.status}`)
  }

  // compilerms doesn't reliably send Content-Type: application/json on
  // the response, so parse as JSON regardless of the declared content type.
  return res.json() as Promise<FreestyleResponse>
}

// ---- Problems ------------------------------------------------------------

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
const STRICT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Record ids come back as strings like "problems:<uuid>" (possibly wrapped
// in angle brackets or u'...'). The UUID is all the frontend needs.
export function uuidOf(raw: unknown): string {
  const match = String(raw).match(UUID_RE)
  return match ? match[0].toLowerCase() : String(raw)
}

// SurrealQL string literal. JSON string escapes (\n, \", \\, \uXXXX) are
// valid SurrealQL, so user text can be embedded safely.
function lit(value: string): string {
  return JSON.stringify(value)
}

// Record reference for a problem. The id is interpolated into a query, so
// it must be a strict UUID.
function problemRef(id: string): string {
  if (!STRICT_UUID_RE.test(id)) throw new Error('Invalid problem id')
  return `type::record("problems", type::uuid("${id}"))`
}

interface SqlStatement {
  status: string
  result: unknown
}

// SurrealDB answers a rejected query with a JSON body such as
// { code, details, description, information }. Surface that text so a failure
// says why instead of only giving the status code.
async function failureMessage(res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  let detail = text

  try {
    const data = JSON.parse(text) as {
      information?: string
      description?: string
      details?: string
    }
    detail = data.information ?? data.description ?? data.details ?? text
  } catch {
    // Plain-text body, use it as is.
  }

  const trimmed = detail.trim().slice(0, 300)
  return trimmed
    ? `Database request failed (${res.status}): ${trimmed}`
    : `Database request failed (${res.status})`
}

// The only place that talks to /sql. Returns one result per statement and
// fails if any statement failed. If the backend adds dedicated read
// endpoints later, this is the helper to replace.
async function sqlMany(query: string): Promise<unknown[]> {
  const session = await getStoredSession()
  if (!session) throw new Error('Your session expired. Please sign in again.')

  const res = await fetch(`${BASE_URL}/sql`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'text/plain',
      'Surreal-NS': 'main',
      'Surreal-DB': 'main',
      Authorization: `Bearer ${session.token}`,
    },
    body: query,
  })

  if (res.status === 401) {
    await clearStoredSession()
    throw new Error('Your session expired. Please sign in again.')
  }

  if (!res.ok) throw new Error(await failureMessage(res))

  const data = (await res.json()) as SqlStatement[]
  for (const statement of data) {
    if (statement.status !== 'OK') {
      throw new Error(
        typeof statement.result === 'string' ? statement.result : 'Query failed',
      )
    }
  }

  return data.map((statement) => statement.result)
}

async function sql<T>(query: string): Promise<T> {
  const results = await sqlMany(query)
  return results[0] as T
}

interface ProblemRow {
  id: unknown
  title: string
  difficulty: ProblemSummary['difficulty']
  language: ProblemSummary['language']
  author?: unknown
  problem_hash: string
  created_at: string
  updated_at?: string
  body?: string
  boilerplate?: string
  harness?: string
  solution?: string
}

function toSummary(row: ProblemRow): ProblemSummary {
  return {
    id: uuidOf(row.id),
    title: row.title,
    difficulty: row.difficulty,
    language: row.language,
    authorId: row.author ? uuidOf(row.author) : null,
    problemHash: row.problem_hash,
    createdAt: row.created_at,
  }
}

async function listProblems(): Promise<ProblemSummary[]> {
  const rows = await sql<ProblemRow[]>(
    'SELECT id, title, difficulty, language, author, problem_hash, created_at FROM problems ORDER BY created_at DESC;',
  )
  return rows.map(toSummary)
}

async function getProblem(id: string): Promise<Problem | null> {
  if (!STRICT_UUID_RE.test(id)) return null

  const rows = await sql<ProblemRow[]>(`SELECT * FROM ${problemRef(id)};`)
  const row = rows[0]
  if (!row) return null

  return {
    ...toSummary(row),
    body: row.body ?? '',
    boilerplate: row.boilerplate ?? '',
    updatedAt: row.updated_at ?? row.created_at,
    harness: row.harness,
    solution: row.solution,
  }
}

// The `solved` select permission is "signed in AND is_public", so private
// solved records may be unreadable. Callers must treat this as best effort.
async function listSolved(): Promise<Record<string, SolvedInfo>> {
  const rows = await sql<
    { out: unknown; problem_hash: string; is_public?: boolean }[]
  >('SELECT out, problem_hash, is_public FROM solved WHERE in = $auth.id;')

  const map: Record<string, SolvedInfo> = {}
  for (const row of rows) {
    map[uuidOf(row.out)] = { hash: row.problem_hash, isPublic: row.is_public === true }
  }
  return map
}

// Shared by submit, create and update: JSON request with the session token,
// returning the raw status and the parsed (or plain text) body.
async function authedJson(
  method: 'POST' | 'PATCH',
  path: string,
  payload: unknown,
  signal?: AbortSignal,
): Promise<ProblemSubmitResponse> {
  const session = await getStoredSession()
  if (!session) return { status: 401, body: 'No active session' }

  const res = await fetch(`${CUSTOM_API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`,
    },
    body: JSON.stringify(payload),
    signal,
  })

  const text = await res.text()
  let body: unknown = text
  try {
    body = JSON.parse(text)
  } catch {
    // Plain-text bodies such as "Bad Request" stay as strings.
  }

  return { status: res.status, body }
}

function submitProblem(id: string, solution: string, signal?: AbortSignal) {
  return authedJson('POST', `/problem/${id}`, { solution }, signal)
}

function createProblem(input: CreateProblemInput, signal?: AbortSignal) {
  return authedJson('POST', '/problem', input, signal)
}

function updateProblem(id: string, input: UpdateProblemInput, signal?: AbortSignal) {
  return authedJson('PATCH', `/problem/${id}`, input, signal)
}

// The problems table lets the author update every field except harness and
// solution (those have field-level update NONE, which is why PATCH exists).
// language is READONLY and created_at is READONLY, so they are not sent.
async function updateMeta(id: string, input: UpdateProblemMetaInput): Promise<void> {
  const fields = {
    title: input.title,
    difficulty: input.difficulty,
    body: input.body,
    boilerplate: input.boilerplate,
  }
  await sql(`UPDATE ${problemRef(id)} MERGE ${JSON.stringify(fields)} RETURN NONE;`)
}

async function removeProblem(id: string): Promise<void> {
  await sql(`DELETE ${problemRef(id)} RETURN NONE;`)
}

// The judge answers 409 and skips running code while a solved record exists,
// and the solved table has a unique (in, out) index. The table's delete
// permission is `$auth.id = in.id`, so users may delete their own record.
async function resetSolved(id: string): Promise<void> {
  await sql(`DELETE solved WHERE in = $auth.id AND out = ${problemRef(id)} RETURN NONE;`)
}

// Relations are written with plain parameters, exactly like the backend's own
// `RELATE ONLY $auth->solved->$problem`. Writing `$auth.id->edge->...` inline
// is read as a graph path and is rejected with a 400.
//
// `attempted` has a unique (in, out) index, so the old attempt is removed
// before the new one is created.
async function saveAttempt(id: string, solution: string): Promise<void> {
  await sqlMany(`
    LET $p = ${problemRef(id)};
    DELETE attempted WHERE in = $auth.id AND out = $p RETURN NONE;
    RELATE ONLY $auth->attempted->$p SET solution = ${lit(solution)} RETURN NONE;
  `)
}

async function getAttempt(id: string): Promise<string | null> {
  const rows = await sql<string[]>(
    `SELECT VALUE solution FROM attempted WHERE in = $auth.id AND out = ${problemRef(id)} LIMIT 1;`,
  )
  return rows[0] ?? null
}

// Matches by (in, out) instead of by record id, because the id of a private
// solved record cannot be read back after a reload.
async function setPublic(id: string, isPublic: boolean): Promise<void> {
  await sql(
    `UPDATE solved SET is_public = ${isPublic ? 'true' : 'false'} WHERE in = $auth.id AND out = ${problemRef(id)} RETURN NONE;`,
  )
}

async function listCommunity(id: string): Promise<CommunitySolution[]> {
  const rows = await sql<
    { id: unknown; in: unknown; solution: string; problem_hash: string; created_at: string }[]
  >(
    `SELECT id, in, solution, problem_hash, created_at FROM solved WHERE out = ${problemRef(id)} AND is_public = true ORDER BY created_at DESC LIMIT 50;`,
  )

  return rows.map((row) => ({
    id: uuidOf(row.id),
    userId: uuidOf(row.in),
    solution: row.solution,
    problemHash: row.problem_hash,
    createdAt: row.created_at,
  }))
}

async function listMarks(): Promise<Marks> {
  const [liked, bookmarked] = (await sqlMany(
    'SELECT VALUE out FROM liked WHERE in = $auth.id; SELECT VALUE out FROM bookmarked WHERE in = $auth.id;',
  )) as unknown[][]

  return {
    liked: (liked ?? []).map(uuidOf),
    bookmarked: (bookmarked ?? []).map(uuidOf),
  }
}

// Delete first so turning a mark on twice never trips the unique index.
async function setMark(kind: MarkKind, id: string, on: boolean): Promise<void> {
  if (kind !== 'liked' && kind !== 'bookmarked') throw new Error('Invalid mark')

  const remove = `
    LET $p = ${problemRef(id)};
    DELETE ${kind} WHERE in = $auth.id AND out = $p RETURN NONE;
  `

  await sqlMany(on ? `${remove} RELATE ONLY $auth->${kind}->$p RETURN NONE;` : remove)
}

// ---- Profiles ------------------------------------------------------------

const profileCache = new Map<string, Profile>()

async function getProfile(id: string): Promise<Profile | null> {
  if (!STRICT_UUID_RE.test(id)) return null

  const cached = profileCache.get(id)
  if (cached) return cached

  const session = await getStoredSession()
  if (!session) return null

  try {
    const res = await fetch(`${CUSTOM_API_BASE}/profile/${id}`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
    if (!res.ok) return null

    const data = (await res.json()) as { username?: string; created_at?: string }
    if (!data.username) return null

    const profile: Profile = { username: data.username, createdAt: data.created_at ?? '' }
    profileCache.set(id, profile)
    return profile
  } catch {
    return null
  }
}

// "Remember me": persist=true -> localStorage (survives browser restart),
// persist=false -> sessionStorage (cleared when the browser/tab closes).
// The backend token itself still expires after 12h regardless.

async function storeSession(session: AuthSession, persist: boolean): Promise<void> {
  localStorage.removeItem(SESSION_STORAGE_KEY)
  sessionStorage.removeItem(SESSION_STORAGE_KEY)

  ;(persist ? localStorage : sessionStorage).setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify(session),
  )
}

// Reads the `exp` claim (seconds since epoch) from the JWT payload. If the
// token cannot be decoded we treat it as not expired and let the server
// decide, so a format change never locks users out.
function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split('.')[1]
    if (!payload) return false

    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const { exp } = JSON.parse(json) as { exp?: number }

    return typeof exp === 'number' && exp * 1000 <= Date.now()
  } catch {
    return false
  }
}

async function getStoredSession(): Promise<AuthSession | null> {
  const raw =
    localStorage.getItem(SESSION_STORAGE_KEY) ??
    sessionStorage.getItem(SESSION_STORAGE_KEY)

  if (!raw) return null

  let session: AuthSession
  try {
    session = JSON.parse(raw) as AuthSession
  } catch {
    return null
  }

  // An expired token can never work again. Drop it so the app sends the
  // user to the login page instead of failing every request with a 401.
  if (isTokenExpired(session.token)) {
    await clearStoredSession()
    return null
  }

  return session
}

async function clearStoredSession(): Promise<void> {
  localStorage.removeItem(SESSION_STORAGE_KEY)
  sessionStorage.removeItem(SESSION_STORAGE_KEY)
}

export const apiClient: ApiClient = {
  auth: {
    requestOtp: (req) => requestOtp(req),
    signup: (req) => realSignup(req),
    signin: (req) => realSignin(req),
    changePassword: (req) => realChangePassword(req),
    changeEmail: (req) => realChangeEmail(req),

    logout: async () => ({ success: true }),

    getSession: () => getStoredSession(),
    setSession: (session, persist) => storeSession(session, persist),
    clearSession: () => clearStoredSession(),
  },

  freestyle: {
    run: (language, req) => runFreestyle(language, req),
  },

  problems: {
    list: () => listProblems(),
    get: (id) => getProblem(id),
    solved: () => listSolved(),
    submit: (id, solution, signal) => submitProblem(id, solution, signal),
    create: (input, signal) => createProblem(input, signal),
    update: (id, input, signal) => updateProblem(id, input, signal),
    updateMeta: (id, input) => updateMeta(id, input),
    remove: (id) => removeProblem(id),
    resetSolved: (id) => resetSolved(id),
    saveAttempt: (id, solution) => saveAttempt(id, solution),
    getAttempt: (id) => getAttempt(id),
    setPublic: (id, isPublic) => setPublic(id, isPublic),
    community: (id) => listCommunity(id),
    marks: () => listMarks(),
    setMark: (kind, id, on) => setMark(kind, id, on),
  },

  profiles: {
    get: (id) => getProfile(id),
  },
}
