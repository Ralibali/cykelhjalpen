// Frontend helpers for the workshop magic-quote SMS link.
// Flag is OFF unless the DB row is enabled OR a preview env override is set.
// Never set VITE_WORKSHOP_MAGIC_QUOTE in production.

import { useCallback, useEffect, useState } from 'react'
import { isV2FlagOn, setV2FlagEnabled } from '@/lib/v2/flags'
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

/** Admin toggle for the DB flag (the preview env override is not affected). */
export function setWorkshopMagicQuoteEnabled(enabled: boolean): Promise<void> {
  return setV2FlagEnabled(WORKSHOP_MAGIC_QUOTE_FLAG, enabled)
}

/**
 * [state, reload]: state is null while loading, then the flag state.
 * Fails closed (false). Call reload() after toggling the flag.
 */
export function useWorkshopMagicQuoteFlag(): [boolean | null, () => void] {
  const [state, setState] = useState<boolean | null>(null)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    let cancelled = false
    isWorkshopMagicQuoteOn()
      .then((on) => { if (!cancelled) setState(on) })
      .catch(() => { if (!cancelled) setState(false) })
    return () => { cancelled = true }
  }, [version])
  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return [state, reload]
}
