import { useReducer } from 'react'
import { apiClient } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

type EmailPhase =
  | 'idle'
  | 'sending_current_otp'
  | 'current_otp_sent'
  | 'sending_new_otp'
  | 'new_otp_sent'
  | 'submitting'
  | 'success'

interface EmailState {
  phase: EmailPhase
  currentOtpSent: boolean
  // The exact (normalized) address the last-sent "new email" code was
  // actually sent to. Tracked separately from a boolean flag because,
  // unlike password/signup, this address is user-editable — if they
  // retype the new email after sending a code, the held code no longer
  // matches what /email will check it against, and the UI needs to know
  // that to ask for a fresh send rather than submit a code that will 400.
  newOtpSentTo: string | null
  currentOtpError: string | null
  newOtpError: string | null
  submitError: string | null
}

type EmailAction =
  | { type: 'send_current_otp_start' }
  | { type: 'send_current_otp_success' }
  | { type: 'send_current_otp_error'; message: string }
  | { type: 'send_new_otp_start' }
  | { type: 'send_new_otp_success'; email: string }
  | { type: 'send_new_otp_error'; message: string }
  | { type: 'submit_start' }
  | { type: 'submit_error'; message: string }
  | { type: 'submit_success' }
  | { type: 'reset' }

const initialState: EmailState = {
  phase: 'idle',
  currentOtpSent: false,
  newOtpSentTo: null,
  currentOtpError: null,
  newOtpError: null,
  submitError: null,
}

function reducer(state: EmailState, action: EmailAction): EmailState {
  switch (action.type) {
    case 'send_current_otp_start':
      return { ...state, phase: 'sending_current_otp', currentOtpError: null }
    case 'send_current_otp_success':
      return { ...state, phase: 'current_otp_sent', currentOtpSent: true, currentOtpError: null }
    case 'send_current_otp_error':
      return {
        ...state,
        phase: state.currentOtpSent ? 'current_otp_sent' : 'idle',
        currentOtpError: action.message,
      }
    case 'send_new_otp_start':
      return { ...state, phase: 'sending_new_otp', newOtpError: null }
    case 'send_new_otp_success':
      return { ...state, phase: 'new_otp_sent', newOtpSentTo: action.email, newOtpError: null }
    case 'send_new_otp_error':
      return {
        ...state,
        phase: state.newOtpSentTo ? 'new_otp_sent' : 'current_otp_sent',
        newOtpError: action.message,
      }
    case 'submit_start':
      return { ...state, phase: 'submitting', submitError: null }
    case 'submit_error':
      return { ...state, phase: 'new_otp_sent', submitError: action.message }
    case 'submit_success':
      return { ...state, phase: 'success' }
    case 'reset':
      return initialState
    default:
      return state
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function otpErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'That address is not a valid account email.'
    case 429:
      return 'Too many code requests for that address. Please wait before trying again.'
    default:
      return 'Unable to send the verification code.'
  }
}

function changeEmailErrorMessage(status: number): string {
  switch (status) {
    case 400:
      return 'One of the verification codes is invalid or expired.'
    case 409:
      return 'That email is already in use by another account.'
    case 401:
      return 'Your session has expired. Please sign in again.'
    default:
      return 'Unable to update your email.'
  }
}

export function useEmailFlow() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { user } = useAuth()

  // Proves the caller still controls their CURRENT inbox — sent to the
  // session email, never a typed field.
  async function sendCurrentOtp(): Promise<boolean> {
    if (!user) {
      dispatch({ type: 'send_current_otp_error', message: 'You must be signed in.' })
      return false
    }

    dispatch({ type: 'send_current_otp_start' })

    try {
      const response = await apiClient.auth.requestOtp({ email: user.email })

      if (response.status === 201) {
        dispatch({ type: 'send_current_otp_success' })
        return true
      }

      dispatch({ type: 'send_current_otp_error', message: otpErrorMessage(response.status) })
      return false
    } catch {
      dispatch({
        type: 'send_current_otp_error',
        message: 'Unable to reach the authentication service.',
      })
      return false
    }
  }

  // Proves the caller controls the NEW address they're switching to.
  async function sendNewOtp(newEmail: string): Promise<boolean> {
    const normalized = normalizeEmail(newEmail)
    dispatch({ type: 'send_new_otp_start' })

    try {
      const response = await apiClient.auth.requestOtp({ email: normalized })

      if (response.status === 201) {
        dispatch({ type: 'send_new_otp_success', email: normalized })
        return true
      }

      dispatch({ type: 'send_new_otp_error', message: otpErrorMessage(response.status) })
      return false
    } catch {
      dispatch({
        type: 'send_new_otp_error',
        message: 'Unable to reach the authentication service.',
      })
      return false
    }
  }

  async function submit(fields: {
    email: string
    otpOld: string
    otpNew: string
  }): Promise<boolean> {
    dispatch({ type: 'submit_start' })

    try {
      const response = await apiClient.auth.changeEmail(fields)

      // Contract says 204 No Content on success; also accepting 200
      // defensively in case the live deployment differs from schema.
      if (response.status === 204 || response.status === 200) {
        dispatch({ type: 'submit_success' })
        return true
      }

      dispatch({ type: 'submit_error', message: changeEmailErrorMessage(response.status) })
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

  return {
    state,
    sendCurrentOtp,
    sendNewOtp,
    submit,
    reset,
    currentEmail: user?.email ?? null,
  }
}
