import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, User, Lock, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useSignupFlow } from '../features/auth/signupFlow'

type Field = 'email' | 'otp' | 'username' | 'password' | 'confirmPassword'

export default function SignupPage() {
  const navigate = useNavigate()
  const { state, sendOtp, submit } = useSignupFlow()

  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<Field | null>(null)
  const [dotCount, setDotCount] = useState(0)

  const otpSent = state.otpSent
  const sendingOtp = state.phase === 'sending_otp'
  const submitting = state.phase === 'submitting'

  const showSendButton = email.trim().length > 2

  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

  const isReady =
    email.trim().length > 0 &&
    otp.length === 6 &&
    username.trim().length > 0 &&
    password.length > 0 &&
    confirmPassword.length > 0 &&
    !passwordsMismatch

  useEffect(() => {
    if (state.phase === 'success') {
      navigate('/login', {
        replace: true,
        state: { message: 'Account created. You can now sign in.' },
      })
    }
  }, [state.phase, navigate])

  useEffect(() => {
    const busy = sendingOtp || submitting

    if (!busy) {
      setDotCount(0)
      return
    }

    const id = window.setInterval(() => setDotCount((d) => (d + 1) % 4), 350)
    return () => window.clearInterval(id)
  }, [sendingOtp, submitting])

  async function handleSendOtp() {
    if (!showSendButton || sendingOtp) return
    await sendOtp(email)
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isReady || submitting) return
    submit({ email, otp, username, pass: password })
  }

  function fieldClass(field: Field) {
    return `w-full border py-2.5 pl-10 pr-3 text-sm outline-none transition-colors bg-transparent text-chalk placeholder:text-graphite ${
      focusedField === field
        ? 'border-signal shadow-[0_0_0_1px_var(--color-signal)]'
        : 'border-graphite'
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
          <Mail
            size={16}
            className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${iconClass('email')}`}
          />
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            disabled={otpSent}
            placeholder="you@dcism.org"
            className={fieldClass('email')}
            required
          />
        </div>
      </div>

      {!otpSent ? (
        <>
          <div
            className="overflow-hidden transition-all"
            style={{ maxHeight: showSendButton ? '70px' : '0px', opacity: showSendButton ? 1 : 0 }}
          >
            <button
              type="button"
              onClick={handleSendOtp}
              disabled={!showSendButton || sendingOtp}
              className={`w-full py-2.5 font-mono text-sm transition-colors ${
                showSendButton
                  ? 'cursor-pointer border border-signal bg-signal text-ink'
                  : 'cursor-not-allowed border border-graphite bg-transparent text-graphite'
              }`}
            >
              {sendingOtp ? `sending code${'.'.repeat(dotCount)}` : '[ send verification code ]'}
            </button>
          </div>

          {state.error && <p className="font-mono text-xs text-fail">error: {state.error}</p>}
        </>
      ) : (
        <>
          <div>
            <label className="mb-2 block text-sm text-chalk">Verification code</label>
            <div className="relative">
              <KeyRound
                size={16}
                className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${iconClass('otp')}`}
              />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onFocus={() => setFocusedField('otp')}
                onBlur={() => setFocusedField(null)}
                placeholder="123456"
                maxLength={6}
                className={`${fieldClass('otp')} font-mono tracking-[0.2em]`}
                required
              />
            </div>
            <p className="mt-2 font-mono text-xs text-graphite">
              verification code sent to {email}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm text-chalk">Username</label>
            <div className="relative">
              <User
                size={16}
                className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${iconClass('username')}`}
              />
              <input
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                placeholder="juan_dc"
                className={fieldClass('username')}
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-chalk">Password</label>
            <div className="relative">
              <Lock
                size={16}
                className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${iconClass('password')}`}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                placeholder="********"
                className={`${fieldClass('password')} pr-10`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-chalk">Confirm password</label>
            <div className="relative">
              <Lock
                size={16}
                className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${iconClass('confirmPassword')}`}
              />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                placeholder="********"
                className={fieldClass('confirmPassword')}
                required
              />
            </div>

            {passwordsMismatch && (
              <p className="mt-2 font-mono text-xs text-fail">error: passwords do not match</p>
            )}
            {state.error && <p className="mt-2 font-mono text-xs text-fail">error: {state.error}</p>}
          </div>

          <button
            type="submit"
            disabled={!isReady || submitting}
            className={`mt-1 w-full py-2.5 font-mono text-sm transition-colors ${
              isReady
                ? 'cursor-pointer border border-signal bg-signal text-ink'
                : 'cursor-not-allowed border border-graphite bg-transparent text-graphite'
            }`}
          >
            {submitting ? `provisioning${'.'.repeat(dotCount)}` : '[ join the arena ]'}
          </button>

          <button
            type="button"
            onClick={handleSendOtp}
            disabled={sendingOtp}
            className="font-mono text-xs text-graphite underline underline-offset-4 hover:text-chalk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
          >
            {sendingOtp ? `resending${'.'.repeat(dotCount)}` : 'resend verification code'}
          </button>
        </>
      )}

      <p className="text-center text-xs text-graphite">
        By creating an account, you agree to our{' '}
        <span className="text-chalk underline">Terms of Service</span> and{' '}
        <span className="text-chalk underline">Privacy Policy</span>.
      </p>
    </form>
  )
}
