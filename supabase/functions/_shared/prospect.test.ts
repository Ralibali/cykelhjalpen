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
  assertEquals(prepareProspectEmailUpdate('cykla@stigscykel.se'), {
    ok: true,
    email: 'cykla@stigscykel.se',
    normalized_email: 'cykla@stigscykel.se',
  })
  assertEquals(prepareProspectEmailUpdate('cykla@stigscykel.se', 'https://www.stigscykel.se'), {
    ok: true,
    email: 'cykla@stigscykel.se',
    normalized_email: 'cykla@stigscykel.se',
  })
})

Deno.test('looksLikeBusinessEmail: accepterar icke-personlig lokal på företagsdomän', () => {
  const accepted = [
    'cykla@stigscykel.se',
    'order@verkstad.se',
    'mail@cykel.se',
    'shop@bike.com',
    'office@firma.se',
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
    assertEquals(looksLikeBusinessEmail(email), true, email)
  }
})

Deno.test('looksLikeBusinessEmail: webbplatsdomän matchar även okänd lokal', () => {
  assertEquals(looksLikeBusinessEmail('cykla@stigscykel.se', 'stigscykel.se'), true)
  assertEquals(looksLikeBusinessEmail('cykla@stigscykel.se', 'https://www.stigscykel.se'), true)
  assertEquals(looksLikeBusinessEmail('john@stigscykel.se', 'https://stigscykel.se/'), true)
  assertEquals(looksLikeBusinessEmail('john@stigscykel.se', 'https://norrkopings-cykel.se'), false)
})

Deno.test('looksLikeBusinessEmail: blockerar konsumentinkorgar', () => {
  const rejected = [
    'info@gmail.com',
    'kontakt@hotmail.com',
    'hej@outlook.com',
    'info@gmail.se',
    'support@hotmail.se',
    'service@live.com',
    'shop@outlook.se',
    'info@icloud.com',
    'kontakt@me.com',
    'hej@yahoo.com',
    'shop@yahoo.se',
  ]
  for (const email of rejected) {
    assertEquals(looksLikeBusinessEmail(email), false, email)
    assertEquals(looksLikeBusinessEmail(email, 'gmail.com'), false, email)
  }
})

Deno.test('prepareProspectEmailUpdate: blockerar konsumentinkorg även med företagsprefix', () => {
  assertEquals(prepareProspectEmailUpdate('info@gmail.com'), {
    ok: false,
    error: PROSPECT_EMAIL_NOT_BUSINESS,
  })
})

Deno.test('prepareProspectEmailUpdate: blockerar personlig e-post på okänd domän', () => {
  assertEquals(prepareProspectEmailUpdate('anna@verkstad.se'), {
    ok: false,
    error: PROSPECT_EMAIL_NOT_BUSINESS,
  })
  assertEquals(looksLikeBusinessEmail('anna@verkstad.se'), false)
  assertEquals(looksLikeBusinessEmail('john@verkstad.se'), false)
  assertEquals(looksLikeBusinessEmail('anna.svensson@cykel.se'), false)
  assertEquals(looksLikeBusinessEmail('firstname@workshop.se'), false)
  assertEquals(looksLikeBusinessEmail('lastname@workshop.se'), false)
  assertEquals(looksLikeBusinessEmail('personal@workshop.se'), false)
  assertEquals(looksLikeBusinessEmail('christoffer@gmail.com'), false)
  assertEquals(looksLikeBusinessEmail(null), false)
  assertEquals(looksLikeBusinessEmail(''), false)
})

Deno.test('prepareProspectEmailUpdate: ogiltig adress', () => {
  assertEquals(prepareProspectEmailUpdate(''), { ok: false, error: PROSPECT_EMAIL_INVALID })
  assertEquals(prepareProspectEmailUpdate(null), { ok: false, error: PROSPECT_EMAIL_INVALID })
  assertEquals(normalizeEmail('ingen mejl'), null)
})
