import { assert, assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import {
  buildEditedEmail,
  oneClickUnsubscribeUrl,
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
