import { assertEquals, assertStringIncludes } from 'jsr:@std/assert'
import {
  buildCustomerPickEmailHtml,
  buildCustomerPickEmailText,
  buildCustomerPickSubject,
  buildLoserEmailHtml,
  buildLoserEmailText,
  buildLoserSubject,
  buildWinnerEmailHtml,
  buildWinnerEmailText,
  buildWinnerSubject,
} from './winner.ts'

Deno.test('vinnarmejl utan reglering ber om betalning', () => {
  const html = buildWinnerEmailHtml('Cykelverkstan AB', 'Anna', false)
  assertStringIncludes(html, 'Cykelverkstan AB')
  assertStringIncludes(html, 'Anna')
  assertStringIncludes(html, '50 kr exkl. moms')
  const text = buildWinnerEmailText('Cykelverkstan AB', 'Anna', false)
  assertStringIncludes(text, '50 kr exkl. moms')
  assertStringIncludes(text, 'cykelhjalpen.se/dashboard/verkstad')
})

Deno.test('vinnarmejl med gratis-lead säger att kontakten är upplåst', () => {
  const html = buildWinnerEmailHtml('Cykelverkstan AB', 'Anna', true)
  assertStringIncludes(html, 'gratis-lead')
  assertStringIncludes(html, 'upplåsta')
  if (html.includes('50 kr exkl. moms')) throw new Error('reglerat mejl ska inte be om betalning')
})

Deno.test('vinnarmejl escapar html i namn', () => {
  const html = buildWinnerEmailHtml('<b>Verkstan</b>', 'Anna', true)
  if (html.includes('<b>Verkstan</b>')) throw new Error('namn måste escapas')
  assertStringIncludes(html, '&lt;b&gt;')
})

Deno.test('ämnesrad för vinnare nämner kunden', () => {
  assertEquals(buildWinnerSubject('Anna'), 'Du vann ärendet från Anna!')
})

Deno.test('förlorarmejl förklarar att svaret kostade inget', () => {
  const html = buildLoserEmailHtml('Cykelverkstan AB', 'Punktering')
  assertStringIncludes(html, 'Punktering')
  assertStringIncludes(html, 'kostade inget')
  const text = buildLoserEmailText('Cykelverkstan AB', 'Punktering')
  assertStringIncludes(text, 'kostade inget')
  assertEquals(buildLoserSubject(), 'Kunden valde en annan verkstad den här gången')
})

Deno.test('kundens bekräftelsemejl nämner vald verkstad', () => {
  const url = 'https://cykelhjalpen.se/mitt-arende/abc'
  const html = buildCustomerPickEmailHtml('Anna', 'Cykelverkstan AB', url)
  assertStringIncludes(html, 'Cykelverkstan AB')
  assertStringIncludes(html, url)
  const text = buildCustomerPickEmailText('Anna', 'Cykelverkstan AB', url)
  assertStringIncludes(text, 'hör av sig')
  assertEquals(buildCustomerPickSubject('Cykelverkstan AB'), 'Du har valt Cykelverkstan AB')
})

Deno.test('kundens bekräftelse ljuger inte när vinsten inte är reglerad', () => {
  const url = 'https://cykelhjalpen.se/mitt-arende/abc'
  const html = buildCustomerPickEmailHtml('Anna', 'Cykelverkstan AB', url, false)
  assertStringIncludes(html, 'så snart uppdraget är aktiverat')
  if (html.includes('har fått dina kontaktuppgifter')) {
    throw new Error('oreglerad vinst får inte påstå att kontaktuppgifter delats')
  }
  const text = buildCustomerPickEmailText('Anna', 'Cykelverkstan AB', url, false)
  assertStringIncludes(text, 'så snart uppdraget är aktiverat')
})

Deno.test('kundens bekräftelse bekräftar delning när vinsten är reglerad', () => {
  const url = 'https://cykelhjalpen.se/mitt-arende/abc'
  const html = buildCustomerPickEmailHtml('Anna', 'Cykelverkstan AB', url, true)
  assertStringIncludes(html, 'har fått dina kontaktuppgifter')
  const text = buildCustomerPickEmailText('Anna', 'Cykelverkstan AB', url, true)
  assertStringIncludes(text, 'har fått dina kontaktuppgifter')
})
