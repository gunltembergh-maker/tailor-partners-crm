/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
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
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme seu e-mail para o Hub Tailor Partners</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://jtlelokzpqkgvlwomfus.supabase.co/storage/v1/object/public/assets/Logo%20Tailor.png"
          width="140"
          height="auto"
          alt="Tailor Partners"
          style={{ margin: '0 0 24px' }}
        />
        <Heading style={h1}>Confirme seu e-mail</Heading>
        <Text style={text}>
          Obrigado por se cadastrar no{' '}
          <Link href={siteUrl} style={link}>
            <strong>Hub Tailor Partners</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Por favor, confirme seu endereço de e-mail (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) clicando no botão abaixo:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Verificar E-mail
        </Button>
        <Text style={footer}>
          Se você não criou uma conta, pode ignorar este e-mail com segurança.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Source Sans 3', Arial, sans-serif" }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(210, 40%, 17%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(210, 10%, 45%)',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'hsl(210, 35%, 45%)', textDecoration: 'underline' }
const button = {
  backgroundColor: 'hsl(210, 40%, 17%)',
  color: 'hsl(40, 20%, 96%)',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
