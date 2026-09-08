import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react'
import { apiClient } from '../api/client'
import type { AuthSession } from '../api/types/auth'

interface AuthState {
  status: 'checking' | 'signed_out' | 'signed_in'
  user: AuthSession | null
}

type AuthAction =
  | { type: 'session_checked'; session: AuthSession | null }
  | { type: 'signed_in'; user: AuthSession }
  | { type: 'signed_out' }

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'session_checked':
      return action.session
        ? { status: 'signed_in', user: action.session }
        : { status: 'signed_out', user: null }
    case 'signed_in':
      return { status: 'signed_in', user: action.user }
    case 'signed_out':
      return { status: 'signed_out', user: null }
    default:
      return state
  }
}

interface AuthContextValue extends AuthState {
  signIn: (user: AuthSession, persist?: boolean) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, { status: 'checking', user: null })

  useEffect(() => {
    let cancelled = false
    apiClient.auth.getSession().then((session) => {
      if (!cancelled) dispatch({ type: 'session_checked', session })
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function signIn(user: AuthSession, persist = true) {
    await apiClient.auth.setSession(user, persist)
    dispatch({ type: 'signed_in', user })
  }

  async function signOut() {
    await apiClient.auth.logout()
    await apiClient.auth.clearSession()
    dispatch({ type: 'signed_out' })
  }

  return <AuthContext.Provider value={{ ...state, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
