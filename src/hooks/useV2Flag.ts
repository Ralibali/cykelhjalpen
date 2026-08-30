import { useEffect, useState } from 'react'
import { isV2FlagOn } from '@/lib/v2/flags'
import type { V2FlagKey } from '@/lib/v2/contracts'

/**
 * React binding for the V2 feature-flag reader (src/lib/v2/flags.ts).
 * Returns null while loading, then the flag state. Fails CLOSED (false) on
 * error — missing flags are OFF per contract §5.
 */
export function useV2Flag(key: V2FlagKey): boolean | null {
  const [state, setState] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    isV2FlagOn(key)
      .then((on) => { if (!cancelled) setState(on) })
      .catch(() => { if (!cancelled) setState(false) })
    return () => { cancelled = true }
  }, [key])
  return state
}
