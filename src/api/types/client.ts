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

    // Requires an authenticated session — the client reads the token from
    // getSession() internally, callers never pass it directly.
    changePassword(req: { pass: string; otp: string }): Promise<ChangePasswordResponse>

    // Requires an authenticated session. `otpOld` must have been requested
    // for the current session email, `otpNew` for the `email` being
    // switched to — two separate POST /otp calls before this one.
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
    // Routes to POST /gcc when language is 'c', POST /java when 'java'.
    // No auth, no mock layer — compilerms is called directly.
    run(language: FreestyleLanguage, req: FreestyleRequest): Promise<FreestyleResponse>
  }
}
