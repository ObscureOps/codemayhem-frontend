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

const BASE_URL = 'https://codemayhem-api.dcism.org'
// SurrealDB's native auth endpoints (signin) are served at the bare host.
// Custom `DEFINE API` endpoints (otp, signup, profile, password, email)
// are served under /api/:namespace/:database/:endpoint — confirmed
// against the real schema, not the bare path written in the DEFINE API
// statement itself.
const CUSTOM_API_BASE = `${BASE_URL}/api/main/main`

// compilerms is a completely separate Go service (compiler/execution
// sandbox), not part of codemayhem-api/SurrealDB. No auth required —
// confirmed via source (no auth middleware) and a live curl test
// (2026-09-15). See CONTRACT.md "Freestyle Coding" section.
const COMPILERMS_BASE_URL = 'https://compilerms.dcism.org'

const SESSION_STORAGE_KEY = 'ciscode.session'

// /signup and /email both compare $request.body.email against the
// already-normalized (lowercase, trimmed) value stored in the `otps`
// table. Every OTP-adjacent request must send the same normalized email
// or the lookup silently misses — normalizing once, here, keeps that
// consistent everywhere it's used.
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

// PATCH /api/main/main/password — confirmed against the real
// password.surql (repomix, 2026-09-10): single `otp` checked against
// $auth.email, body { otp, pass }, 204 on success. Matches what was built
// on assumption alone in Milestone 5 Part B — no changes needed.
//
// Auth transport is still UNVERIFIED: `Authorization: Bearer <token>` is
// SurrealDB's standard HTTP-API convention, used here because it's the
// reasonable default, but it hasn't been confirmed against a live request
// against this deployment yet. If this or changeEmail below ever returns
// 401 against a real signed-in session, check the header/scheme first.
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

// PATCH /api/main/main/email — confirmed against the real email.surql
// (repomix, 2026-09-10). This is a two-OTP endpoint: `otpOld` is checked
// against $auth.email (the CURRENT session email), `otpNew` against the
// `email` field in this same body (the NEW address). Both must already
// exist via separate POST /otp calls before this fires. 409 if `email`
// already belongs to another user. This corrects the single-OTP shape
// CONTRACT.md previously (incorrectly) documented.
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

// POST /gcc or POST /java on compilerms, depending on `language`. Field
// is "sources" (plural), confirmed via live curl test (2026-09-15) —
// "source" (singular) does not match the real wire shape. compilerms
// returns HTTP 200 even on compile/runtime failure (see `reason` in the
// response); only a genuinely malformed request or a server-side crash
// produce a non-200 here. No auth, no mock layer.
async function runFreestyle(
  language: FreestyleLanguage,
  req: FreestyleRequest,
): Promise<FreestyleResponse> {
  const path = language === 'c' ? '/gcc' : '/java'

  const res = await fetch(`${COMPILERMS_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })

  if (!res.ok) {
    throw new Error(`compilerms request failed: ${res.status}`)
  }

  // compilerms doesn't reliably send Content-Type: application/json on
  // the response — parse as JSON regardless of the declared content type.
  return res.json() as Promise<FreestyleResponse>
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

async function getStoredSession(): Promise<AuthSession | null> {
  const raw =
    localStorage.getItem(SESSION_STORAGE_KEY) ??
    sessionStorage.getItem(SESSION_STORAGE_KEY)

  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
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
}
