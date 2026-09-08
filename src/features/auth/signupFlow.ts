import { useReducer } from 'react'
import { apiClient } from '../../api/client'

type SignupPhase = 'idle' | 'sending_otp' | 'otp_sent' | 'submitting' | 'success'

interface SignupState {
  phase: SignupPhase
  otpSent: boolean
  error: string | null
}

type SignupAction =
  | { type: 'send_otp_start' }
  | { type: 'send_otp_success' }
  | { type: 'send_otp_error'; message: string }
  | { type: 'submit_start' }
  | { type: 'submit_error'; message: string }
  | { type: 'submit_success' }
  | { type: 'reset' }

const initialState: SignupState = { phase: 'idle', otpSent: false, error: null }

// Deliberately keeps `otpSent` as a one-way flag, separate from the
// transient `phase`. A resend only ever moves phase to 'sending_otp' and
// back — it never sets otpSent back to false, which is what made the
// earlier version flash back to the pre-OTP form on every resend.
function reducer(state: SignupState, action: SignupAction): SignupState {
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
      return 'Use a valid university email address.'
    case 429:
      return 'Too many code requests. Please wait before trying again.'
    default:
      return 'Unable to send the verification code.'
  }
}

function signupErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'The verification code is invalid or expired.'
    case 409:
      return 'That email or username is already registered.'
    default:
      return 'Unable to create your account.'
  }
}

export function useSignupFlow() {
  const [state, dispatch] = useReducer(reducer, initialState)

  async function sendOtp(email: string): Promise<boolean> {
    dispatch({ type: 'send_otp_start' })

    try {
      const response = await apiClient.auth.requestOtp({ email })

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

  async function submit(fields: {
    email: string
    otp: string
    username: string
    pass: string
  }): Promise<boolean> {
    dispatch({ type: 'submit_start' })

    try {
      const response = await apiClient.auth.signup(fields)

      if (response.status === 201) {
        dispatch({ type: 'submit_success' })
        return true
      }

      dispatch({ type: 'submit_error', message: signupErrorMessage(response.status) })
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

  return { state, sendOtp, submit, reset }
}
