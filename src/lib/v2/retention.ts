// V2 workshop-retention (frontend-sidan). Contract: docs/v2/CONTRACTS.md §2.7.
//
// Profilkompletthet-logiken delas med edge-funktionerna så att knuff-mejlet
// och dashboard-indikatorn alltid räknar samma sak.

import {
  computeProfileCompleteness,
  type ProfileCompleteness,
  type ProfileCompletenessInput,
} from '../../../supabase/functions/_shared/v2/retention'

export { computeProfileCompleteness }
export type { ProfileCompleteness, ProfileCompletenessInput }

/** Verkstadens opt-out per retention-cadence (tabell v2_workshop_notification_prefs). */
export interface WorkshopNotificationPrefs {
  digest_enabled: boolean
  seasonal_enabled: boolean
  performance_enabled: boolean
  profile_nudge_enabled: boolean
  review_notifications_enabled: boolean
  sms_enabled: boolean
}

export const DEFAULT_NOTIFICATION_PREFS: WorkshopNotificationPrefs = {
  digest_enabled: true,
  seasonal_enabled: true,
  performance_enabled: true,
  profile_nudge_enabled: true,
  review_notifications_enabled: true,
  sms_enabled: false,
}
