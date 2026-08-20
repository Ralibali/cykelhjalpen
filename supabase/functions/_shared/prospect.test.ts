import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  looksLikeBusinessEmail,
  normalizeEmail,
  prepareProspectEmailUpdate,
  PROSPECT_EMAIL_INVALID,
  PROSPECT_EMAIL_NOT_BUSINESS,
} from './prospect.ts'

Deno.test('prepareProspectEmailUpdate: sparar bara publikt företagsmejl', () => {
  assertEquals(prepareProspectEmailUpdate('INFO@Verkstad.SE'), {
    ok: true,
    email: 'info@verkstad.se',
    normalized_email: 'info@verkstad.se',
  })
})

Deno.test('prepareProspectEmailUpdate: blockerar personlig e-post', () => {
  assertEquals(prepareProspectEmailUpdate('anna@verkstad.se'), {
    ok: false,
    error: PROSPECT_EMAIL_NOT_BUSINESS,
  })
  assertEquals(looksLikeBusinessEmail('anna@verkstad.se'), false)
})

Deno.test('prepareProspectEmailUpdate: ogiltig adress', () => {
  assertEquals(prepareProspectEmailUpdate(''), { ok: false, error: PROSPECT_EMAIL_INVALID })
  assertEquals(normalizeEmail('ingen mejl'), null)
})
