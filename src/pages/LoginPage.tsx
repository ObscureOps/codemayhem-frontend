import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useLoginFlow } from '../features/auth/loginFlow'

type Field = 'email' | 'password'

export default function LoginPage() {
  const navigate = useNavigate()
  const { state, submit } = useLoginFlow()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<Field | null>(null)
  const [dotCount, setDotCount] = useState(0)

  const showPasswordField = email.trim().length > 2
  const isReady = email.length > 0 && password.length > 0
  const submitting = state.status === 'submitting'

  useEffect(() => {
    if (state.status === 'success') {
      navigate('/', { replace: true })
      // Without this, if /login was the first page in this tab, pressing
      // back after a successful login has nothing to fall back to and
      // exits the app entirely. Pushing a duplicate entry means "back"
      // lands on the dashboard again instead of leaving the app.
      window.history.pushState(null, '', '/')
    }
  }, [state.status, navigate])

  useEffect(() => {
    if (!submitting) {
      setDotCount(0)
      return
    }
    const id = window.setInterval(() => setDotCount((d) => (d + 1) % 4), 350)
    return () => window.clearInterval(id)
  }, [submitting])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!isReady || submitting) return
    submit({ email, pass: password, rememberMe })
  }

  function fieldClass(field: Field) {
    return `w-full border py-2.5 pl-10 pr-3 text-sm outline-none transition-colors bg-transparent text-chalk placeholder:text-graphite ${
      focusedField === field ? 'border-signal shadow-[0_0_0_1px_var(--color-signal)]' : 'border-graphite'
    }`
  }

  function iconClass(field: Field) {
    return focusedField === field ? 'text-signal' : 'text-graphite'
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <label className="mb-2 block text-sm text-chalk">Email</label>
        <div className="relative">
          <Mail size={16} className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${iconClass('email')}`} />
          <input
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            placeholder="you@dcism.org"
            className={fieldClass('email')}
          />
        </div>
      </div>

      <div
        className="flex flex-col gap-4 overflow-hidden transition-all"
        style={{ maxHeight: showPasswordField ? '300px' : '0px', opacity: showPasswordField ? 1 : 0 }}
      >
        <div>
          <label className="mb-2 block text-sm text-chalk">Password</label>
          <div className="relative">
            <Lock
              size={16}
              className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${iconClass('password')}`}
            />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              placeholder="********"
              className={`${fieldClass('password')} pr-10`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-graphite"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {state.status === 'error' && <p className="mt-2 font-mono text-xs text-fail">error: {state.message}</p>}
        </div>

        <label className="flex items-center gap-2 text-sm text-graphite">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 accent-signal"
          />
          Keep me logged in
        </label>
      </div>

      <button
        type="submit"
        disabled={!isReady || submitting}
        className={`mt-1 w-full py-2.5 font-mono text-sm transition-colors ${
          isReady ? 'cursor-pointer border border-signal bg-signal text-ink' : 'cursor-not-allowed border border-graphite bg-transparent text-graphite'
        }`}
      >
        {submitting ? `authenticating${'.'.repeat(dotCount)}` : '[ enter the arena ]'}
      </button>
    </form>
  )
}
