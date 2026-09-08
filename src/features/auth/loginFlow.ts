import { useReducer } from 'react'
import { apiClient } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

type LoginState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'error'; message: string }
  | { status: 'success' }

type LoginAction =
  | { type: 'submit' }
  | { type: 'error'; message: string }
  | { type: 'success' }
  | { type: 'reset' }

function reducer(state: LoginState, action: LoginAction): LoginState {
  switch (action.type) {
    case 'submit':
      return { status: 'submitting' }
    case 'error':
      return { status: 'error', message: action.message }
    case 'success':
      return { status: 'success' }
    case 'reset':
      return { status: 'idle' }
    default:
      return state
  }
}

export function useLoginFlow() {
  const [state, dispatch] = useReducer(reducer, { status: 'idle' })
  const { signIn } = useAuth()

  async function submit(fields: { email: string; pass: string; rememberMe: boolean }) {
    dispatch({ type: 'submit' })
    try {
      const res = await apiClient.auth.signin({ email: fields.email, pass: fields.pass })
      if (res.code === 200 && res.token) {
        await signIn({ email: fields.email, token: res.token }, fields.rememberMe)
        dispatch({ type: 'success' })
      } else {
        dispatch({ type: 'error', message: 'invalid_credentials' })
      }
    } catch {
      dispatch({ type: 'error', message: 'network_error' })
    }
  }

  return { state, submit, reset: () => dispatch({ type: 'reset' }) }
}
