/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Hub Grupo Tailor Partners'
const SITE_URL = 'https://hub.tailorpartners.com.br'

interface TemplateExampleProps {
  nome?: string
  mensagem?: string
}

const TemplateExampleEmail = ({ nome, mensagem }: TemplateExampleProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Teste do módulo transacional — Hub Tailor Partners</Preview>
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
        <Heading style={h1}>
          {nome ? `Olá, ${nome} 👋` : 'Olá 👋'}
        </Heading>
        <Text style={text}>
          Este é um email de teste do novo <strong>módulo de comunicações transacionais</strong> do {SITE_NAME}.
        </Text>
        {mensagem ? (
          <Text style={text}>{mensagem}</Text>
        ) : (
          <Text style={text}>
            Se você está lendo isso, o pipeline de envio está funcionando corretamente: template renderizado, fila processada, entrega confirmada.
          </Text>
        )}

        <Section style={buttonSection}>
          <Button style={button} href={SITE_URL}>
            Acessar o Hub
          </Button>
        </Section>

        <Text style={footerNote}>
          Este é um email automático. Por favor, não responda.
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

export const template = {
  component: TemplateExampleEmail,
  subject: 'Teste do módulo transacional — Hub Tailor Partners',
  displayName: 'Template de exemplo (teste)',
  previewData: { nome: 'Alessandro', mensagem: 'Teste do módulo transacional.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#f4f4f5', fontFamily: "'Source Sans 3', Arial, sans-serif", margin: '0', padding: '0' }
const header = { background: 'linear-gradient(135deg, #082537 0%, #0b3d57 100%)', padding: '32px 0', textAlign: 'center' as const }
const headerContainer = { padding: '0 25px' }
const container = { backgroundColor: '#ffffff', padding: '32px 28px', margin: '0 auto', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#082537', margin: '0 0 20px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#4a5568', lineHeight: '1.6', margin: '0 0 16px' }
const buttonSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = { backgroundColor: '#0A2337', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' as const, boxShadow: '0 4px 12px rgba(10, 35, 55, 0.25)' }
const footerNote = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
const footer = { backgroundColor: '#082537', padding: '24px 0', textAlign: 'center' as const }
const footerContainer = { padding: '0 25px' }
const footerText = { fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', margin: '0 0 4px', lineHeight: '1.5' }
