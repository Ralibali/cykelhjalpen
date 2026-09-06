// Frontend helpers for the workshop magic-quote SMS link.
// Flag is OFF unless the DB row is enabled OR a preview env override is set.
// Never set VITE_WORKSHOP_MAGIC_QUOTE in production.

import { useEffect, useState } from 'react'
import { isV2FlagOn } from '@/lib/v2/flags'
import {
  WORKSHOP_MAGIC_QUOTE_FLAG,
  parseTruthyEnv,
} from '../../supabase/functions/_shared/workshop-quote-core'

export {
  WORKSHOP_MAGIC_QUOTE_FLAG,
  WORKSHOP_QUOTE_TOKEN_ERROR_SV,
  buildWorkshopQuoteSms,
  parseTruthyEnv,
  validateQuoteForm,
  validateQuoteToken,
  workshopQuoteUrl,
} from '../../supabase/functions/_shared/workshop-quote-core'

export function frontendWorkshopMagicQuoteEnvOn(): boolean {
  return parseTruthyEnv(import.meta.env.VITE_WORKSHOP_MAGIC_QUOTE as string | undefined)
}

export async function isWorkshopMagicQuoteOn(): Promise<boolean> {
  if (frontendWorkshopMagicQuoteEnvOn()) return true
  return isV2FlagOn(WORKSHOP_MAGIC_QUOTE_FLAG)
}

/** null while loading, then the flag state. Fails closed (false). */
export function useWorkshopMagicQuoteFlag(): boolean | null {
  const [state, setState] = useState<boolean | null>(null)
  useEffect(() => {
    let cancelled = false
    isWorkshopMagicQuoteOn()
      .then((on) => { if (!cancelled) setState(on) })
      .catch(() => { if (!cancelled) setState(false) })
    return () => { cancelled = true }
  }, [])
  return state
}
