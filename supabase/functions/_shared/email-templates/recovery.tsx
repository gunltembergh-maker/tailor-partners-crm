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
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Redefinição de senha — Hub Tailor Partners</Preview>
    <Body style={main}>
      <Section style={header}>
        <Container style={headerContainer}>
          <Img
            src="https://jtlelokzpqkgvlwomfus.supabase.co/storage/v1/object/public/assets/Logo%20Tailor.png"
            width="160"
            height="auto"
            alt="Tailor Partners"
            style={{ margin: '0 auto', display: 'block' }}
          />
        </Container>
      </Section>

      <Container style={container}>
        <Heading style={h1}>Redefinir sua senha 🔐</Heading>
        <Text style={text}>
          Recebemos uma solicitação para redefinir sua senha no <strong>Hub Tailor Partners</strong>.
        </Text>
        <Text style={text}>
          Clique no botão abaixo para escolher uma nova senha. Este link é válido por tempo limitado.
        </Text>

        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Redefinir Minha Senha
          </Button>
        </Section>

        <Text style={footerNote}>
          Se você não solicitou a redefinição de senha, pode ignorar este e-mail. Sua senha não será alterada.
        </Text>
      </Container>

      <Section style={footer}>
        <Container style={footerContainer}>
          <Img
            src="https://jtlelokzpqkgvlwomfus.supabase.co/storage/v1/object/public/assets/Logo%20Tailor.png"
            width="80"
            height="auto"
            alt="Tailor Partners"
            style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }}
          />
          <Text style={footerText}>
            © 2026 Grupo Tailor Partners · Todos os direitos reservados
          </Text>
          <Text style={footerText}>
            Mensagem automática — não responda este e-mail
          </Text>
        </Container>
      </Section>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#f4f4f5', fontFamily: "'Source Sans 3', Arial, sans-serif", margin: '0', padding: '0' }
const header = { background: 'linear-gradient(135deg, #082537 0%, #0b3d57 100%)', padding: '32px 0', textAlign: 'center' as const }
const headerContainer = { padding: '0 25px' }
const container = { backgroundColor: '#ffffff', padding: '32px 28px', margin: '0 auto', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#082537', margin: '0 0 20px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#4a5568', lineHeight: '1.6', margin: '0 0 16px' }
const buttonSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = { backgroundColor: '#082537', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' as const, boxShadow: '0 4px 12px rgba(8, 37, 55, 0.25)' }
const footerNote = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
const footer = { backgroundColor: '#082537', padding: '24px 0', textAlign: 'center' as const }
const footerContainer = { padding: '0 25px' }
const footerText = { fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', margin: '0 0 4px', lineHeight: '1.5' }
