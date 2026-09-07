import { describe, expect, it } from 'vitest'
import { buildEditedEmail } from '../../supabase/functions/_shared/outreach'

describe('edited recruitment invitations', () => {
  it('preserves the selected city in a clickable signup link and includes unsubscribe', () => {
    const url = 'https://cykelhjalpen.se/registrera/verkstad?stad=goteborg&utm_source=outreach'
    const email = buildEditedEmail({ unsubscribe_token: 'test-token' }, `Hej!\n\nSkapa konto:\n${url}`)
    expect(email.text).toContain(url)
    expect(email.html).toContain('href="https://cykelhjalpen.se/registrera/verkstad?stad=goteborg&amp;utm_source=outreach"')
    expect(email.html).toContain('href="https://cykelhjalpen.se/avregistrera/test-token"')
  })

  it('keeps company text and non-http links inert', () => {
    const email = buildEditedEmail({ unsubscribe_token: 'test-token' }, '<img src=x onerror=alert(1)> javascript:alert(1)')
    expect(email.html).not.toContain('<img')
    expect(email.html).not.toContain('href="javascript:')
    expect(email.html).toContain('&lt;img')
  })
})
