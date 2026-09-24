export interface OtpRequest {
  email: string
}

export interface OtpResponse {
  status: number
  body: string
}

export interface SignupRequest {
  email: string
  otp: string
  pass: string
  username: string
}

export interface SignupResponse {
  status: number
  body: string
}

export interface SigninRequest {
  ns: 'main'
  db: 'main'
  ac: 'users'
  email: string
  pass: string
}

export interface SigninResponse {
  code: number
  details: string
  token?: string
  description?: string
  information?: string
}

export interface LogoutResponse {
  success: boolean
}

export interface AuthSession {
  email: string
  token: string
}

// PATCH /api/main/main/password — requires an authenticated session.
// Confirmed against the real database/schema/api/password.surql (repomix,
// 2026-09-10): single `otp`, checked against $auth.email. Matches exactly.
export interface ChangePasswordRequest {
  pass: string
  otp: string
}

export interface ChangePasswordResponse {
  status: number
  body: string
}

// PATCH /api/main/main/email — requires an authenticated session.
// Confirmed against database/schema/api/email.surql (repomix, 2026-09-10).
// This is a TWO-OTP flow, not one: `otpOld` is checked against $auth.email
// (proves you still control the current inbox), `otpNew` is checked
// against `email` (proves you control the new inbox). Both must be valid
// or the whole request 400s. If `email` already belongs to another user,
// 409. This corrects CONTRACT.md's previous single-OTP documentation.
export interface ChangeEmailRequest {
  email: string
  otpOld: string
  otpNew: string
}

export interface ChangeEmailResponse {
  status: number
  body: string
}
