import {
  looksLikeBusinessEmail,
  normalizeEmail,
  prepareProspectEmailUpdate as prepareShared,
  PROSPECT_EMAIL_INVALID,
  PROSPECT_EMAIL_NOT_BUSINESS,
} from '../../supabase/functions/_shared/prospect'

export {
  looksLikeBusinessEmail,
  normalizeEmail,
  PROSPECT_EMAIL_INVALID,
  PROSPECT_EMAIL_NOT_BUSINESS,
}

export type ProspectEmailUpdate =
  | { ok: true; email: string; normalized_email: string }
  | { ok: false; error: string }

export const prepareProspectEmailUpdate = (raw: string | null | undefined): ProspectEmailUpdate =>
  prepareShared(raw) as ProspectEmailUpdate

export const prospectEmailGuardMessage = (raw: string): string | null => {
  const prepared = prepareProspectEmailUpdate(raw)
  if (prepared.ok) return null
  if (!raw.trim()) return null
  return 'error' in prepared ? prepared.error : null
}

export const canCreateProspectEmailDraft = (prospect: {
  email: string | null | undefined
  do_not_contact: boolean
  status: string
}): boolean =>
  Boolean(prospect.email) && !prospect.do_not_contact && prospect.status === 'approved_for_contact'
