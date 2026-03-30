/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Código de verificação — Hub Tailor Partners</Preview>
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
        <Heading style={h1}>Código de verificação 🔒</Heading>
        <Text style={text}>
          Use o código abaixo para confirmar sua identidade no <strong>Hub Tailor Partners</strong>:
        </Text>
        <Text style={codeStyle}>{token}</Text>
        <Text style={text}>
          Este código expirará em breve. Se você não solicitou esta verificação, pode ignorar este e-mail com segurança.
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

export default ReauthenticationEmail

const main = { backgroundColor: '#f4f4f5', fontFamily: "'Source Sans 3', Arial, sans-serif", margin: '0', padding: '0' }
const header = { background: 'linear-gradient(135deg, #082537 0%, #0b3d57 100%)', padding: '32px 0', textAlign: 'center' as const }
const headerContainer = { padding: '0 25px' }
const container = { backgroundColor: '#ffffff', padding: '32px 28px', margin: '0 auto', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#082537', margin: '0 0 20px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#4a5568', lineHeight: '1.6', margin: '0 0 16px' }
const codeStyle = { fontFamily: 'Courier, monospace', fontSize: '28px', fontWeight: 'bold' as const, color: '#082537', margin: '8px 0 24px', textAlign: 'center' as const, letterSpacing: '4px' }
const footer = { backgroundColor: '#082537', padding: '24px 0', textAlign: 'center' as const }
const footerContainer = { padding: '0 25px' }
const footerText = { fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', margin: '0 0 4px', lineHeight: '1.5' }
