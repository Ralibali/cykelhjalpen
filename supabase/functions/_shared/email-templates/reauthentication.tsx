/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Din verifieringskod för Updro</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>
            <span style={logoPart1}>⚡ upd</span>
            <span style={logoPart2}>ro</span>
          </Text>
        </Section>
        <Heading style={h1}>Bekräfta din identitet</Heading>
        <Text style={text}>Använd koden nedan för att verifiera dig:</Text>
        <Text style={codeStyle}>{token}</Text>
        <Hr style={hr} />
        <Text style={footer}>
          Koden upphör snart att gälla. Har du inte begärt detta? Ignorera det här mailet.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

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
const codeStyle = {
  fontFamily: "'JetBrains Mono', Courier, monospace",
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#FF851A',
  margin: '0 0 30px',
  letterSpacing: '6px',
  textAlign: 'center' as const,
}
const hr = { borderColor: '#EAEDF0', margin: '28px 0' }
const footer = { fontSize: '12px', color: '#999DA5', margin: '0' }
