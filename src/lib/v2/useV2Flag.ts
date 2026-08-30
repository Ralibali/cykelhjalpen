// React-hook för V2-feature-flags. Fails CLOSED: false tills svaret landar.
// Contract: docs/v2/CONTRACTS.md §5 (flaggorna är alltid OFF by default).

import { useEffect, useState } from 'react'
import { isV2FlagOnFor } from './flags'
import type { V2FlagKey } from './contracts'

export function useV2Flag(
  key: V2FlagKey,
  opts: { citySlug?: string | null; subjectId?: string | null } = {},
): boolean {
  const [on, setOn] = useState(false)

  useEffect(() => {
    let alive = true
    isV2FlagOnFor(key, opts)
      .then((value) => { if (alive) setOn(value) })
      .catch(() => { if (alive) setOn(false) })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, opts.citySlug ?? null, opts.subjectId ?? null])

  return on
}
