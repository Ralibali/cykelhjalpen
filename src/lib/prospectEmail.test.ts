import { describe, expect, it } from 'vitest'
import {
  canCreateProspectEmailDraft,
  looksLikeBusinessEmail,
  normalizeEmail,
  prepareProspectEmailUpdate,
  prospectEmailGuardMessage,
  PROSPECT_EMAIL_INVALID,
  PROSPECT_EMAIL_NOT_BUSINESS,
} from './prospectEmail'

describe('looksLikeBusinessEmail', () => {
  it('accepterar publika företagsprefix på företagsdomän', () => {
    const accepted = [
      'cykla@stigscykel.se',
      'order@verkstad.se',
      'mail@cykel.se',
      'shop@bike.com',
      'info@verkstad.se',
      'kontakt@cykel.se',
      'contact@shop.com',
      'hej@lundacyklar.se',
      'support@example.com',
      'service@bike.se',
      'bokning@verkstad.se',
      'verkstad@firma.se',
      'workshop@bike.com',
      'sales@cykel.se',
      'kund@verkstad.se',
      'butik@cykel.se',
      'info.lund@verkstad.se',
      'kontakt-uppsala@cykel.se',
    ]
    for (const email of accepted) {
      expect(looksLikeBusinessEmail(email), email).toBe(true)
    }
  })

  it('blockerar konsumentinkorgar även med företagsprefix', () => {
    const rejected = [
      'info@gmail.com',
      'kontakt@hotmail.com',
      'hej@outlook.com',
      'info@gmail.se',
      'support@hotmail.se',
      'service@live.com',
      'shop@outlook.se',
    ]
    for (const email of rejected) {
      expect(looksLikeBusinessEmail(email), email).toBe(false)
    }
  })

  it('blockerar personliga och tomma adresser', () => {
    const rejected = [
      null,
      '',
      'john@verkstad.se',
      'anna.svensson@cykel.se',
      'firstname@workshop.se',
      'lastname@workshop.se',
      'personal@workshop.se',
      'christoffer@gmail.com',
    ]
    for (const email of rejected) {
      expect(looksLikeBusinessEmail(email), String(email)).toBe(false)
    }
  })
})

describe('normalizeEmail', () => {
  it('plockar ut och lowercasar en giltig adress', () => {
    expect(normalizeEmail('  INFO@Verkstad.SE  ')).toBe('info@verkstad.se')
    expect(normalizeEmail('Christoffer <info@cykelverkstad.se>')).toBe('info@cykelverkstad.se')
  })

  it('returnerar null när ingen e-post finns', () => {
    expect(normalizeEmail(null)).toBeNull()
    expect(normalizeEmail('ingen mejl här')).toBeNull()
  })
})

describe('prepareProspectEmailUpdate', () => {
  it('returnerar email och normalized_email för företagsmejl', () => {
    expect(prepareProspectEmailUpdate(' INFO@Cykel.se ')).toEqual({
      ok: true,
      email: 'info@cykel.se',
      normalized_email: 'info@cykel.se',
    })
    expect(prepareProspectEmailUpdate('cykla@stigscykel.se')).toEqual({
      ok: true,
      email: 'cykla@stigscykel.se',
      normalized_email: 'cykla@stigscykel.se',
    })
  })

  it('avvisar ogiltig, personlig och konsument-e-post', () => {
    expect(prepareProspectEmailUpdate('')).toEqual({ ok: false, error: PROSPECT_EMAIL_INVALID })
    expect(prepareProspectEmailUpdate(null)).toEqual({ ok: false, error: PROSPECT_EMAIL_INVALID })
    expect(prepareProspectEmailUpdate('john@verkstad.se')).toEqual({
      ok: false,
      error: PROSPECT_EMAIL_NOT_BUSINESS,
    })
    expect(prepareProspectEmailUpdate('info@gmail.com')).toEqual({
      ok: false,
      error: PROSPECT_EMAIL_NOT_BUSINESS,
    })
  })

  it('visar guard-text bara när en ogiltig adress är ifylld', () => {
    expect(prospectEmailGuardMessage('')).toBeNull()
    expect(prospectEmailGuardMessage('info@verkstad.se')).toBeNull()
    expect(prospectEmailGuardMessage('john@verkstad.se')).toBe(PROSPECT_EMAIL_NOT_BUSINESS)
  })
})

describe('canCreateProspectEmailDraft', () => {
  it('kräver sparad e-post, godkänd status och inte do-not-contact', () => {
    expect(canCreateProspectEmailDraft({
      email: 'info@verkstad.se',
      do_not_contact: false,
      status: 'approved_for_contact',
    })).toBe(true)
    expect(canCreateProspectEmailDraft({
      email: null,
      do_not_contact: false,
      status: 'approved_for_contact',
    })).toBe(false)
    expect(canCreateProspectEmailDraft({
      email: 'info@verkstad.se',
      do_not_contact: true,
      status: 'approved_for_contact',
    })).toBe(false)
    expect(canCreateProspectEmailDraft({
      email: 'info@verkstad.se',
      do_not_contact: false,
      status: 'new',
    })).toBe(false)
  })
})
