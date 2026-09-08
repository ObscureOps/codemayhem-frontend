import type { ApiClient } from './types/client'
import type {
  AuthSession,
  OtpRequest,
  OtpResponse,
  SigninRequest,
  SigninResponse,
  SignupRequest,
  SignupResponse,
} from './types/auth'

const BASE_URL = 'https://code-api.dcism.org'

// SurrealDB's native auth endpoints (signin) are served at the bare host.
// Custom `DEFINE API` endpoints (otp, signup, profile) are served under
// /api/:namespace/:database/:endpoint — confirmed against the real schema,
// not the bare path written in the DEFINE API statement itself.
const CUSTOM_API_BASE = `${BASE_URL}/api/main/main`

const SESSION_STORAGE_KEY = 'ciscode.session'

// /signup checks the OTP by comparing $request.body.email against the
// already-normalized (lowercase, trimmed) value stored in the `otps` table.
// Both requests must send the same normalized email or the OTP check
// silently misses — normalizing once, here, keeps that consistent.
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

    logout: async () => ({ success: true }),

    getSession: () => getStoredSession(),
    setSession: (session, persist) => storeSession(session, persist),
    clearSession: () => clearStoredSession(),
  },
}
