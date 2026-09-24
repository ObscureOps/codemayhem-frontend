import { useState, type FormEvent } from 'react'
import { Lock, Mail, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { usePasswordFlow } from '../features/auth/passwordFlow'
import { useEmailFlow } from '../features/auth/emailFlow'
import OtpInput from '../components/OtpInput'

type PasswordField = 'otp' | 'password' | 'confirmPassword'
type EmailField = 'newEmail' | 'currentOtp' | 'newOtp'

function fieldClass(active: boolean) {
  return `w-full border py-2.5 pl-10 pr-3 text-sm outline-none transition-colors bg-transparent text-ink placeholder:text-graphite ${
    active ? 'border-signal shadow-[0_0_0_1px_var(--color-signal)]' : 'border-graphite'
  }`
}

function iconClass(active: boolean) {
  return active ? 'text-signal' : 'text-graphite'
}

export default function SecurityPage() {
  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Security</h1>
        <p className="mt-1 font-mono text-xs text-graphite">
          Manage how you sign in and keep your account secure.
        </p>
      </div>

      <PasswordSection />
      <EmailSection />

      {/* Two-Factor Authentication — disabled placeholder */}
      <section className="border border-graphite/40 p-6 opacity-60">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-graphite" strokeWidth={1.75} aria-hidden="true" />
          <div>
            <h2 className="font-display text-base font-semibold text-ink">
              Two-Factor Authentication
            </h2>
            <p className="mt-1 font-mono text-xs text-graphite">
              Add an extra layer of protection to your account.
            </p>
            <p className="mt-3 inline-block border border-graphite/50 px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-graphite">
              not available yet
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

function PasswordSection() {
  const { state, sendOtp, submit, reset, email } = usePasswordFlow()

  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<PasswordField | null>(null)

  const otpSent = state.otpSent
  const sendingOtp = state.phase === 'sending_otp'
  const submitting = state.phase === 'submitting'
  const success = state.phase === 'success'

  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

  const isReady =
    otp.length === 6 && password.length > 0 && confirmPassword.length > 0 && !passwordsMismatch

  async function handleRequestCode() {
    if (sendingOtp) return
    await sendOtp()
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isReady || submitting) return
    submit({ otp, pass: password })
  }

  function handleStartOver() {
    reset()
    setOtp('')
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <section className="border border-graphite/40 p-6">
      <div className="flex items-start gap-3">
        <Lock className="mt-0.5 h-5 w-5 text-signal" strokeWidth={1.75} aria-hidden="true" />
        <div className="flex-1">
          <h2 className="font-display text-base font-semibold text-ink">Password</h2>
          <p className="mt-1 font-mono text-xs text-graphite">Keep your account secure.</p>

          {success ? (
            <div className="mt-5">
              <p className="font-mono text-xs text-pass">✓ Password updated successfully.</p>
              <button
                type="button"
                onClick={handleStartOver}
                className="mt-3 font-mono text-xs text-graphite underline underline-offset-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
              >
                change it again
              </button>
            </div>
          ) : !otpSent ? (
            <div className="mt-5">
              <button
                type="button"
                onClick={handleRequestCode}
                disabled={sendingOtp}
                className="cursor-pointer border border-signal bg-signal px-4 py-2 font-mono text-sm text-ink transition-colors disabled:cursor-not-allowed disabled:border-graphite disabled:bg-transparent disabled:text-graphite"
              >
                {sendingOtp ? 'sending code…' : '[ request verification code ]'}
              </button>
              {email && (
                <p className="mt-2 font-mono text-xs text-graphite">Code will be sent to {email}</p>
              )}
              {state.error && <p className="mt-2 font-mono text-xs text-fail">error: {state.error}</p>}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-5">
              <OtpInput
                variant="light"
                value={otp}
                onChange={setOtp}
                focused={focusedField === 'otp'}
                onFocus={() => setFocusedField('otp')}
                onBlur={() => setFocusedField(null)}
                helperText={email ? `verification code sent to ${email}` : undefined}
              />

              <div>
                <label className="mb-2 block text-sm text-ink">New password</label>
                <div className="relative">
                  <Lock
                    size={16}
                    className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${iconClass(focusedField === 'password')}`}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="********"
                    className={`${fieldClass(focusedField === 'password')} pr-10`}
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
                <label className="mb-2 block text-sm text-ink">Confirm new password</label>
                <div className="relative">
                  <Lock
                    size={16}
                    className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${iconClass(focusedField === 'confirmPassword')}`}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onFocus={() => setFocusedField('confirmPassword')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="********"
                    className={fieldClass(focusedField === 'confirmPassword')}
                    required
                  />
                </div>
                {passwordsMismatch && (
                  <p className="mt-2 font-mono text-xs text-fail">error: passwords do not match</p>
                )}
              </div>

              {state.error && <p className="font-mono text-xs text-fail">error: {state.error}</p>}

              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={!isReady || submitting}
                  className="cursor-pointer border border-signal bg-signal px-4 py-2 font-mono text-sm text-ink transition-colors disabled:cursor-not-allowed disabled:border-graphite disabled:bg-transparent disabled:text-graphite"
                >
                  {submitting ? 'updating…' : '[ update password ]'}
                </button>
                <button
                  type="button"
                  onClick={handleRequestCode}
                  disabled={sendingOtp}
                  className="font-mono text-xs text-graphite underline underline-offset-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                >
                  {sendingOtp ? 'resending…' : 'resend code'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

function EmailSection() {
  const { state, sendCurrentOtp, sendNewOtp, submit, reset, currentEmail } = useEmailFlow()

  const [newEmail, setNewEmail] = useState('')
  const [currentOtp, setCurrentOtp] = useState('')
  const [newOtp, setNewOtp] = useState('')
  const [focusedField, setFocusedField] = useState<EmailField | null>(null)

  const sendingCurrentOtp = state.phase === 'sending_current_otp'
  const sendingNewOtp = state.phase === 'sending_new_otp'
  const submitting = state.phase === 'submitting'
  const success = state.phase === 'success'

  // A previously-sent new-email code only counts if it was sent to
  // whatever's currently typed — editing the address after sending
  // invalidates the held code against what /email will actually check.
  const normalizedNewEmail = newEmail.trim().toLowerCase()
  const newOtpValidForCurrentInput =
    state.newOtpSentTo !== null && state.newOtpSentTo === normalizedNewEmail

  const canSendNewOtp = normalizedNewEmail.length > 3 && !sendingNewOtp

  const isReady =
    currentOtp.length === 6 &&
    newOtp.length === 6 &&
    newOtpValidForCurrentInput &&
    normalizedNewEmail.length > 3

  async function handleSendCurrentOtp() {
    if (sendingCurrentOtp) return
    await sendCurrentOtp()
  }

  async function handleSendNewOtp() {
    if (!canSendNewOtp) return
    await sendNewOtp(newEmail)
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isReady || submitting) return
    submit({ email: normalizedNewEmail, otpOld: currentOtp, otpNew: newOtp })
  }

  function handleStartOver() {
    reset()
    setNewEmail('')
    setCurrentOtp('')
    setNewOtp('')
  }

  return (
    <section className="border border-graphite/40 p-6">
      <div className="flex items-start gap-3">
        <Mail className="mt-0.5 h-5 w-5 text-signal" strokeWidth={1.75} aria-hidden="true" />
        <div className="flex-1">
          <h2 className="font-display text-base font-semibold text-ink">Email</h2>
          <p className="mt-1 font-mono text-xs text-graphite">
            Change your account email address. This requires proving you control both
            your current and new inbox.
          </p>

          {success ? (
            <div className="mt-5">
              <p className="font-mono text-xs text-pass">✓ Email updated successfully.</p>
              <button
                type="button"
                onClick={handleStartOver}
                className="mt-3 font-mono text-xs text-graphite underline underline-offset-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
              >
                change it again
              </button>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-6">
              {/* Step 1 — prove current email */}
              <div>
                <p className="mb-2 font-mono text-xs uppercase tracking-wide text-graphite">
                  Step 1 — verify current email
                </p>
                {!state.currentOtpSent ? (
                  <>
                    <button
                      type="button"
                      onClick={handleSendCurrentOtp}
                      disabled={sendingCurrentOtp}
                      className="cursor-pointer border border-signal bg-signal px-4 py-2 font-mono text-sm text-ink transition-colors disabled:cursor-not-allowed disabled:border-graphite disabled:bg-transparent disabled:text-graphite"
                    >
                      {sendingCurrentOtp ? 'sending code…' : '[ send code to current email ]'}
                    </button>
                    {currentEmail && (
                      <p className="mt-2 font-mono text-xs text-graphite">
                        Code will be sent to {currentEmail}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <OtpInput
                      variant="light"
                      value={currentOtp}
                      onChange={setCurrentOtp}
                      focused={focusedField === 'currentOtp'}
                      onFocus={() => setFocusedField('currentOtp')}
                      onBlur={() => setFocusedField(null)}
                      helperText={currentEmail ? `verification code sent to ${currentEmail}` : undefined}
                    />
                    <button
                      type="button"
                      onClick={handleSendCurrentOtp}
                      disabled={sendingCurrentOtp}
                      className="mt-2 font-mono text-xs text-graphite underline underline-offset-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                    >
                      {sendingCurrentOtp ? 'resending…' : 'resend code'}
                    </button>
                  </>
                )}
                {state.currentOtpError && (
                  <p className="mt-2 font-mono text-xs text-fail">error: {state.currentOtpError}</p>
                )}
              </div>

              {/* Step 2 — prove new email */}
              {state.currentOtpSent && (
                <div>
                  <p className="mb-2 font-mono text-xs uppercase tracking-wide text-graphite">
                    Step 2 — verify new email
                  </p>

                  <div className="mb-4">
                    <label className="mb-2 block text-sm text-ink">New email address</label>
                    <div className="relative">
                      <Mail
                        size={16}
                        className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${iconClass(focusedField === 'newEmail')}`}
                      />
                      <input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onFocus={() => setFocusedField('newEmail')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="you@dcism.org"
                        className={fieldClass(focusedField === 'newEmail')}
                        required
                      />
                    </div>
                    {!newOtpValidForCurrentInput && state.newOtpSentTo !== null && (
                      <p className="mt-2 font-mono text-xs text-graphite">
                        This address changed since the last code was sent — send a new one.
                      </p>
                    )}
                  </div>

                  {!newOtpValidForCurrentInput ? (
                    <button
                      type="button"
                      onClick={handleSendNewOtp}
                      disabled={!canSendNewOtp}
                      className="cursor-pointer border border-signal bg-signal px-4 py-2 font-mono text-sm text-ink transition-colors disabled:cursor-not-allowed disabled:border-graphite disabled:bg-transparent disabled:text-graphite"
                    >
                      {sendingNewOtp ? 'sending code…' : '[ send code to new email ]'}
                    </button>
                  ) : (
                    <>
                      <OtpInput
                        variant="light"
                        value={newOtp}
                        onChange={setNewOtp}
                        focused={focusedField === 'newOtp'}
                        onFocus={() => setFocusedField('newOtp')}
                        onBlur={() => setFocusedField(null)}
                        helperText={`verification code sent to ${state.newOtpSentTo}`}
                      />
                      <button
                        type="button"
                        onClick={handleSendNewOtp}
                        disabled={sendingNewOtp}
                        className="mt-2 font-mono text-xs text-graphite underline underline-offset-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                      >
                        {sendingNewOtp ? 'resending…' : 'resend code'}
                      </button>
                    </>
                  )}
                  {state.newOtpError && (
                    <p className="mt-2 font-mono text-xs text-fail">error: {state.newOtpError}</p>
                  )}
                </div>
              )}

              {/* Submit */}
              {state.currentOtpSent && newOtpValidForCurrentInput && (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  {state.submitError && (
                    <p className="font-mono text-xs text-fail">error: {state.submitError}</p>
                  )}
                  <button
                    type="submit"
                    disabled={!isReady || submitting}
                    className="cursor-pointer self-start border border-signal bg-signal px-4 py-2 font-mono text-sm text-ink transition-colors disabled:cursor-not-allowed disabled:border-graphite disabled:bg-transparent disabled:text-graphite"
                  >
                    {submitting ? 'updating…' : '[ update email ]'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
