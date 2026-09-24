import { useReducer } from 'react'
import { apiClient } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

type PasswordPhase = 'idle' | 'sending_otp' | 'otp_sent' | 'submitting' | 'success'

interface PasswordState {
  phase: PasswordPhase
  otpSent: boolean
  error: string | null
}

type PasswordAction =
  | { type: 'send_otp_start' }
  | { type: 'send_otp_success' }
  | { type: 'send_otp_error'; message: string }
  | { type: 'submit_start' }
  | { type: 'submit_error'; message: string }
  | { type: 'submit_success' }
  | { type: 'reset' }

const initialState: PasswordState = { phase: 'idle', otpSent: false, error: null }

// Same one-way `otpSent` flag as useSignupFlow: a resend only ever moves
// phase to 'sending_otp' and back to 'otp_sent' — it never resets otpSent
// to false, so a failed resend doesn't flash the UI back to the
// pre-code state.
function reducer(state: PasswordState, action: PasswordAction): PasswordState {
  switch (action.type) {
    case 'send_otp_start':
      return { ...state, phase: 'sending_otp', error: null }
    case 'send_otp_success':
      return { phase: 'otp_sent', otpSent: true, error: null }
    case 'send_otp_error':
      return {
        phase: state.otpSent ? 'otp_sent' : 'idle',
        otpSent: state.otpSent,
        error: action.message,
      }
    case 'submit_start':
      return { ...state, phase: 'submitting', error: null }
    case 'submit_error':
      return { phase: 'otp_sent', otpSent: true, error: action.message }
    case 'submit_success':
      return { phase: 'success', otpSent: true, error: null }
    case 'reset':
      return initialState
    default:
      return state
  }
}

function otpErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'Unable to send a verification code to your account email.'
    case 429:
      return 'Too many code requests. Please wait before trying again.'
    default:
      return 'Unable to send the verification code.'
  }
}

function changePasswordErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'The verification code is invalid or expired.'
    case 401:
      return 'Your session has expired. Please sign in again.'
    default:
      return 'Unable to change your password.'
  }
}

export function usePasswordFlow() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { user } = useAuth()

  // The OTP goes to the signed-in user's own email — never a typed field,
  // per the "pull from getSession(), never ask the user to type it" rule.
  async function sendOtp(): Promise<boolean> {
    if (!user) {
      dispatch({ type: 'send_otp_error', message: 'You must be signed in.' })
      return false
    }

    dispatch({ type: 'send_otp_start' })

    try {
      const response = await apiClient.auth.requestOtp({ email: user.email })

      if (response.status === 201) {
        dispatch({ type: 'send_otp_success' })
        return true
      }

      dispatch({ type: 'send_otp_error', message: otpErrorMessage(response.status) })
      return false
    } catch {
      dispatch({
        type: 'send_otp_error',
        message: 'Unable to reach the authentication service.',
      })
      return false
    }
  }

  async function submit(fields: { otp: string; pass: string }): Promise<boolean> {
    dispatch({ type: 'submit_start' })

    try {
      const response = await apiClient.auth.changePassword(fields)

      // Contract says 204 No Content on success. Also accepting 200 in
      // case the live deployment differs from the documented shape —
      // this mismatch, if it happens, should be reported back rather
      // than silently masked.
      if (response.status === 204 || response.status === 200) {
        dispatch({ type: 'submit_success' })
        return true
      }

      dispatch({ type: 'submit_error', message: changePasswordErrorMessage(response.status) })
      return false
    } catch {
      dispatch({
        type: 'submit_error',
        message: 'Unable to reach the authentication service.',
      })
      return false
    }
  }

  function reset() {
    dispatch({ type: 'reset' })
  }

  return { state, sendOtp, submit, reset, email: user?.email ?? null }
}
