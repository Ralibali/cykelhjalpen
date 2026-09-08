import { trackClick } from '@/hooks/usePageTracking'
import { hasAnalyticsConsent } from './analyticsConsent'
import type { CykelCityName } from './cykelCities'

type Stage = 'started' | 'validation_blocked' | 'security_ready' | 'security_expired' | 'security_failed' | 'submit_clicked' | 'completed' | 'failed' | 'session_failed' | 'session_ready' | 'confirmation_required'
type Detail = { reason?: string; services_count?: number }

/** Fixed step labels only. Never pass form values, error messages or tokens here. */
export function trackWorkshopRegistration(stage: Stage, city: CykelCityName | '', detail: Detail = {}) {
  if (!hasAnalyticsConsent()) return
  try {
    trackClick(`workshop_registration_${stage}`, 'Verkstadsregistrering', {
      ...detail,
      city: city || 'unselected',
      stage: stage === 'completed' ? 'account_created' : stage,
    })
  } catch {
    // Analytics must never prevent registration or change a successful result.
  }
}
