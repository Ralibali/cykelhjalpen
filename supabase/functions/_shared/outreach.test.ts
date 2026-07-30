import { assert, assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  buildClickTrackingUrl,
  buildEditedEmail,
  oneClickUnsubscribeUrl,
  OUTREACH_WORKSHOP_URL,
  replaceWorkshopUrlWithTracking,
  unsubscribeUrl,
} from './outreach.ts'

const TOKEN = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

Deno.test('buildEditedEmail: escapar HTML och bevarar avregistreringsfot', () => {
  const message = 'Hej!\n\nVi såg <script>alert(1)</script> på er sajt.\n\nVänliga hälsningar,\nChristoffer'
  const { text, html } = buildEditedEmail({ unsubscribe_token: TOKEN }, message)

  // Rå text ska innehålla admin-brödtexten oförändrad
  assertStringIncludes(text, 'Vi såg <script>alert(1)</script>')

  // HTML får INTE innehålla script-tag – ska vara escapad
  assert(!html.includes('<script>'), 'HTML innehåller oescapad <script>')
  assertStringIncludes(html, '&lt;script&gt;alert(1)&lt;/script&gt;')

  // Nyrader mellan paragrafer blir separata <p>
  assertStringIncludes(html, '<p style="margin:0 0 16px')

  // Avregistreringsfot läggs till både i text och HTML
  const humanUrl = unsubscribeUrl(TOKEN)
  assertStringIncludes(text, humanUrl)
  assertStringIncludes(html, humanUrl)
})

Deno.test('buildEditedEmail: dubblerar inte fot om admin redan skrev in unsubscribe-länken', () => {
  const url = unsubscribeUrl(TOKEN)
  const message = `Kort meddelande.\n\nAvregistrera: ${url}`
  const { text, html } = buildEditedEmail({ unsubscribe_token: TOKEN }, message)

  // Ska bara finnas EN förekomst av URL:en i text
  const matches = text.split(url).length - 1
  assertEquals(matches, 1)
  // HTML: URL:en är den admin skrev, ingen extra fot
  assert(!html.includes('Vill ni inte få fler mejl från oss? <a'))
})

Deno.test('oneClickUnsubscribeUrl: bygger en funktions-URL som en mail-provider kan POST:a till', () => {
  const url = oneClickUnsubscribeUrl('https://xyz.supabase.co', TOKEN)
  assertEquals(
    url,
    `https://xyz.supabase.co/functions/v1/prospect-unsubscribe?token=${TOKEN}`,
  )
})

Deno.test('oneClickUnsubscribeUrl: trimmar avslutande slash', () => {
  const url = oneClickUnsubscribeUrl('https://xyz.supabase.co/', TOKEN)
  assert(!url.includes('.co//'))
})

const ACTIVITY_ID = '11111111-2222-3333-4444-555555555555'

Deno.test('buildClickTrackingUrl: pekar på outreach-click med aktivitet och token', () => {
  const url = buildClickTrackingUrl('https://xyz.supabase.co', ACTIVITY_ID, TOKEN)
  assertEquals(
    url,
    `https://xyz.supabase.co/functions/v1/outreach-click?a=${ACTIVITY_ID}&t=${TOKEN}`,
  )
})

Deno.test('buildClickTrackingUrl: trimmar avslutande slash', () => {
  const url = buildClickTrackingUrl('https://xyz.supabase.co/', ACTIVITY_ID, TOKEN)
  assert(!url.includes('.co//'))
})

Deno.test('replaceWorkshopUrlWithTracking: ersätter alla förekomster i text', () => {
  const tracking = buildClickTrackingUrl('https://xyz.supabase.co', ACTIVITY_ID, TOKEN)
  const input = `Registrera er här: ${OUTREACH_WORKSHOP_URL}\nLäs mer: ${OUTREACH_WORKSHOP_URL}`
  const result = replaceWorkshopUrlWithTracking(input, tracking)
  assertEquals(result.split(tracking).length - 1, 2)
  assert(!result.includes(OUTREACH_WORKSHOP_URL))
})

Deno.test('replaceWorkshopUrlWithTracking: escapar & i HTML-läge', () => {
  const tracking = buildClickTrackingUrl('https://xyz.supabase.co', ACTIVITY_ID, TOKEN)
  const html = `<a href="${OUTREACH_WORKSHOP_URL}">${OUTREACH_WORKSHOP_URL}</a>`
  const result = replaceWorkshopUrlWithTracking(html, tracking, true)
  assertStringIncludes(result, `a=${ACTIVITY_ID}&amp;t=${TOKEN}`)
  assert(!result.includes(`?a=${ACTIVITY_ID}&t=`))
  // Ohtml-läget lämnar & orört
  const plain = replaceWorkshopUrlWithTracking(html, tracking)
  assertStringIncludes(plain, `a=${ACTIVITY_ID}&t=${TOKEN}`)
})

Deno.test('replaceWorkshopUrlWithTracking: orörd text utan registreringslänk', () => {
  const tracking = buildClickTrackingUrl('https://xyz.supabase.co', ACTIVITY_ID, TOKEN)
  const input = 'Hej! Det här mejlet har ingen länk.'
  assertEquals(replaceWorkshopUrlWithTracking(input, tracking), input)
})
