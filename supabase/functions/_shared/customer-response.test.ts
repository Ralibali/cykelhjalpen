import { assertEquals, assertStringIncludes } from 'jsr:@std/assert'
import {
  buildCustomerResponseEmailHtml,
  buildCustomerResponseEmailText,
  buildCustomerResponseSms,
  buildCustomerResponseSubject,
  buildCustomerResponseUrl,
  escapeCustomerHtml,
} from './customer-response.ts'

const TOKEN = '550e8400-e29b-41d4-a716-446655440000'

Deno.test('url pekar på kundens ärendesida', () => {
  assertEquals(
    buildCustomerResponseUrl(TOKEN),
    `https://cykelhjalpen.se/mitt-arende/${TOKEN}`,
  )
})

Deno.test('ämnesraden nämner reparationstypen', () => {
  assertEquals(buildCustomerResponseSubject('Punktering'), 'Nytt prisförslag på din cykel – Punktering')
})

Deno.test('sms innehåller verkstadsnamn och länk', () => {
  const sms = buildCustomerResponseSms('Cykelverkstan AB', buildCustomerResponseUrl(TOKEN))
  assertStringIncludes(sms, 'Cykelverkstan AB')
  assertStringIncludes(sms, 'cykelhjalpen.se/mitt-arende/')
})

Deno.test('sms håller sig inom tre delar (UCS-2) för normala verkstadsnamn', () => {
  // ÅÄÖ tvingar UCS-2-kodning: 67 tecken per del, max tre delar = 201 tecken.
  const sms = buildCustomerResponseSms('Rosendals Cykel & Sport', buildCustomerResponseUrl(TOKEN))
  if (sms.length > 201) throw new Error(`SMS för långt: ${sms.length} tecken`)
})

Deno.test('mejl-html escapar farliga tecken', () => {
  const html = buildCustomerResponseEmailHtml('<script>alert(1)</script>', 'Verkstan <b>& Söner', buildCustomerResponseUrl(TOKEN))
  if (html.includes('<script>')) throw new Error('Oescapat kundnamn i html')
  assertStringIncludes(html, 'Verkstan &lt;b&gt;&amp; Söner')
  assertStringIncludes(html, 'Se prisförslaget')
})

Deno.test('textvarianten fungerar utan html', () => {
  const text = buildCustomerResponseEmailText('Anna', 'Cykelverkstan', buildCustomerResponseUrl(TOKEN))
  assertStringIncludes(text, 'Hej Anna!')
  assertStringIncludes(text, 'Cykelverkstan')
  assertStringIncludes(text, 'https://')
})

Deno.test('escapeCustomerHtml hanterar null', () => {
  assertEquals(escapeCustomerHtml(null), '')
  assertEquals(escapeCustomerHtml('a & b'), 'a &amp; b')
})
