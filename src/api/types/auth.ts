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
