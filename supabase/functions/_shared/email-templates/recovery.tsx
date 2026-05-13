/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Återställ ditt lösenord på Updro</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>
            <span style={logoPart1}>⚡ upd</span>
            <span style={logoPart2}>ro</span>
          </Text>
        </Section>
        <Heading style={h1}>Återställ ditt lösenord</Heading>
        <Text style={text}>
          Vi fick en förfrågan om att återställa lösenordet för ditt konto på Updro. Klicka på knappen nedan för att välja ett nytt lösenord.
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button style={button} href={confirmationUrl}>
            Återställ lösenord
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          Har du inte begärt detta? Ignorera det här mailet – ditt lösenord ändras inte.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif" }
const container = { padding: '48px 28px', maxWidth: '520px', margin: '0 auto' }
const logoSection = { marginBottom: '32px' }
const logoText = { fontSize: '24px', fontWeight: 'bold' as const, margin: '0', lineHeight: '1' }
const logoPart1 = { color: '#0F1118' }
const logoPart2 = { color: '#FF851A' }
const h1 = {
  fontSize: '26px',
  fontWeight: '700' as const,
  fontFamily: "'Plus Jakarta Sans', 'Helvetica Neue', Arial, sans-serif",
  color: '#0F1118',
  margin: '0 0 16px',
}
const text = {
  fontSize: '15px',
  color: '#555B66',
  lineHeight: '1.7',
  margin: '0 0 20px',
}
const button = {
  backgroundColor: '#FF851A',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '10px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
}
const hr = { borderColor: '#EAEDF0', margin: '28px 0' }
const footer = { fontSize: '12px', color: '#999DA5', margin: '0' }
