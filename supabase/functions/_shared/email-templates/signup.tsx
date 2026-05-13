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
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Bekräfta din e-post för Updro</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>
            <span style={logoPart1}>⚡ upd</span>
            <span style={logoPart2}>ro</span>
          </Text>
        </Section>
        <Heading style={h1}>Välkommen till Updro!</Heading>
        <Text style={text}>
          Kul att du registrerat dig på{' '}
          <Link href={siteUrl} style={link}>
            <strong>Updro</strong>
          </Link>
          ! Du är snart redo att hitta rätt byrå för ditt projekt.
        </Text>
        <Text style={text}>
          Bekräfta din e-postadress (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) genom att klicka på knappen nedan:
        </Text>
        <Section style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <Button style={button} href={confirmationUrl}>
            Bekräfta e-post
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          Har du inte skapat ett konto på Updro? Ignorera det här mailet.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
const link = { color: '#FF851A', textDecoration: 'underline' }
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
