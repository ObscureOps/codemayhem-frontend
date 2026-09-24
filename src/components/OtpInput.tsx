
import { KeyRound } from 'lucide-react'

interface OtpInputProps {
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  focused?: boolean
  helperText?: string
  /**
   * 'dark' matches the auth pages (ink background, chalk text) — the
   * original inline SignupPage styling. 'light' matches in-app pages like
   * Security, which render on the chalk background from AppShell.
   */
  variant?: 'dark' | 'light'
}

export default function OtpInput({
  value,
  onChange,
  onFocus,
  onBlur,
  focused = false,
  helperText,
  variant = 'dark',
}: OtpInputProps) {
  const textColor = variant === 'dark' ? 'text-chalk' : 'text-ink'

  return (
    <div>
      <label className={`mb-2 block text-sm ${textColor}`} htmlFor="otp-input">
        Verification code
      </label>
      <div className="relative">
        <KeyRound
          size={16}
          className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-colors ${
            focused ? 'text-signal' : 'text-graphite'
          }`}
        />
        <input
          id="otp-input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="123456"
          maxLength={6}
          className={`w-full border py-2.5 pl-10 pr-3 text-sm font-mono tracking-[0.2em] outline-none transition-colors bg-transparent ${textColor} placeholder:text-graphite ${
            focused ? 'border-signal shadow-[0_0_0_1px_var(--color-signal)]' : 'border-graphite'
          }`}
          required
        />
      </div>
      {helperText && <p className="mt-2 font-mono text-xs text-graphite">{helperText}</p>}
    </div>
  )
}
