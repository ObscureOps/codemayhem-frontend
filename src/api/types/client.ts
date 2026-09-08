import type {
  AuthSession,
  LogoutResponse,
  OtpRequest,
  OtpResponse,
  SigninResponse,
  SignupResponse,
} from './auth'

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

    logout(): Promise<LogoutResponse>

    getSession(): Promise<AuthSession | null>
    setSession(session: AuthSession, persist: boolean): Promise<void>
    clearSession(): Promise<void>
  }
}
