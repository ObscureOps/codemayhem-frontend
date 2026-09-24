import { useCallback, useState } from 'react'
import { apiClient } from '../../api/client'
import type {
  FreestyleLanguage,
  FreestyleRequest,
  FreestyleResponse,
} from '../../api/types/freestyle'

// Real state machine per Part B: idle -> submitted -> running -> result,
// with a distinct error branch for request/network failures. `submitted`
// and `running` stay separate states even though this client fires them
// back-to-back today, so a future queued/polling compilerms change won't
// require touching FreestylePage's render branches.
type Phase =
  | { kind: 'idle' }
  | { kind: 'submitted' }
  | { kind: 'running' }
  | { kind: 'result'; response: FreestyleResponse }
  | { kind: 'error'; message: string }

export function useFreestyleRun() {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })

  const run = useCallback(async (language: FreestyleLanguage, req: FreestyleRequest) => {
    setPhase({ kind: 'submitted' })
    setPhase({ kind: 'running' })

    try {
      const response = await apiClient.freestyle.run(language, req)
      setPhase({ kind: 'result', response })
    } catch (err) {
      setPhase({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Network error reaching compilerms.',
      })
    }
  }, [])

  const reset = useCallback(() => setPhase({ kind: 'idle' }), [])

  return { phase, run, reset }
}
