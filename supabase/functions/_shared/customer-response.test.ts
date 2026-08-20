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
  assertStringIncludes(html, 'Välj verkstad redan nu')
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

Deno.test('engelsk variant av ämne, sms och mejl', () => {
  assertEquals(buildCustomerResponseSubject('Puncture', 'en'), 'New quote for your bike – Puncture')
  const sms = buildCustomerResponseSms('Cykelverkstan AB', buildCustomerResponseUrl(TOKEN), 'en')
  assertStringIncludes(sms, 'sent you a quote')
  assertEquals(sms.toLowerCase().includes('compare'), false)
  const html = buildCustomerResponseEmailHtml('Anna', 'Cykelverkstan', buildCustomerResponseUrl(TOKEN), 'en')
  assertStringIncludes(html, 'Choose the workshop now')
  assertStringIncludes(html, 'contact details')
  const text = buildCustomerResponseEmailText('Anna', 'Cykelverkstan', buildCustomerResponseUrl(TOKEN), 'en')
  assertStringIncludes(text, 'Hi Anna!')
})

Deno.test('en offert säger inte att kunden ska vänta på fler', () => {
  const html = buildCustomerResponseEmailHtml('Anna', 'Cykelverkstan', buildCustomerResponseUrl(TOKEN), 'sv', 1)
  assertEquals(html.toLowerCase().includes('jämför'), false)
  assertStringIncludes(html, 'Välj redan nu')
  assertStringIncludes(html, 'först när du valt i Cykelhjälpen')
  const sms = buildCustomerResponseSms('Cykelverkstan AB', buildCustomerResponseUrl(TOKEN), 'sv', 1)
  assertEquals(sms.toLowerCase().includes('jämför'), false)
  assertStringIncludes(sms, 'Välj redan nu')
})

Deno.test('två offerter får jämföra-språk', () => {
  const html = buildCustomerResponseEmailHtml('Anna', 'Cykelverkstan', buildCustomerResponseUrl(TOKEN), 'sv', 2)
  assertStringIncludes(html, 'Jämför förslagen')
  assertStringIncludes(html, 'först när du valt i Cykelhjälpen')
  const sms = buildCustomerResponseSms('Cykelverkstan AB', buildCustomerResponseUrl(TOKEN), 'sv', 2)
  assertStringIncludes(sms, 'Jämför och välj verkstad redan nu')
})
