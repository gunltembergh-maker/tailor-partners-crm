/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  nome_admin?: string
  titulo: string
  mensagem: string
  tipo?: string
  link_acao: string
}

const AlertaAdminPendencia = ({
  nome_admin,
  titulo,
  mensagem,
  link_acao,
}: Props) => {
  const displayName = nome_admin || 'Admin'

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{titulo}</Preview>
      <Body style={main}>
        {/* HEADER */}
        <Section style={header}>
          <Container style={headerContainer}>
            <Img
              src="https://jtlelokzpqkgvlwomfus.supabase.co/storage/v1/object/public/assets/Logo%20Tailor.png"
              width="160"
              height="auto"
              alt="Tailor Partners"
              style={{ margin: '0 auto', display: 'block' }}
            />
            <Text style={headerEyebrow}>🔔 PENDÊNCIA NO HUB</Text>
            <Text style={headerSubtitle}>Alerta para Administradores</Text>
          </Container>
        </Section>

        {/* CORPO */}
        <Container style={container}>
          <Heading style={h1}>Olá, {displayName}</Heading>

          <Text style={text}>
            Uma nova pendência foi registrada no Hub e está aguardando sua análise.
          </Text>

          {/* Card da notificação */}
          <Section style={cardBox}>
            <Text style={cardLabel}>NOTIFICAÇÃO</Text>
            <Text style={cardTitle}>{titulo}</Text>
            <Text style={cardMessage}>{mensagem}</Text>
          </Section>

          {/* CTA */}
          <Section style={buttonSection}>
            <Button style={buttonCta} href={link_acao}>
              Acessar Hub
            </Button>
            <Text style={ctaHint}>
              Ou copie e cole este link no seu navegador:<br />
              <a href={link_acao} style={{ color: '#082537', wordBreak: 'break-all' }}>
                {link_acao}
              </a>
            </Text>
          </Section>

          <Text style={footerNote}>
            Você recebeu este email porque tem perfil ADMIN no Hub Tailor Partners.
            Para evitar spam, alertas do mesmo tipo são agrupados a cada 30 minutos.
          </Text>
        </Container>

        {/* FOOTER */}
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
}

export const template: TemplateEntry = {
  component: AlertaAdminPendencia,
  subject: (data: any) => `🔔 Hub Tailor — ${data?.titulo || 'Pendência aguardando análise'}`,
  displayName: 'Alerta Admin Pendência',
  previewData: {
    nome_admin: 'Alessandro',
    titulo: 'Novo usuário aguardando aprovação',
    mensagem: 'O usuário fulano@empresa.com.br solicitou acesso ao Hub e está aguardando sua análise.',
    tipo: 'novo_usuario',
    link_acao: 'https://hub.tailorpartners.com.br/admin/usuarios',
  },
}

export default AlertaAdminPendencia

/* === ESTILOS === */
const main = { backgroundColor: '#f4f4f5', fontFamily: "'Source Sans 3', Arial, sans-serif", margin: '0', padding: '0' }
const header = { background: 'linear-gradient(135deg, #082537 0%, #0b3d57 100%)', padding: '32px 0', textAlign: 'center' as const }
const headerContainer = { padding: '0 25px' }
const headerEyebrow = { fontSize: '11px', color: '#D5CFC0', letterSpacing: '2px', margin: '16px 0 4px', textAlign: 'center' as const, fontWeight: 'bold' as const }
const headerSubtitle = { fontSize: '15px', color: '#ffffff', margin: '0', textAlign: 'center' as const, fontWeight: '600' as const }
const container = { backgroundColor: '#ffffff', padding: '32px 28px', margin: '0 auto', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#082537', margin: '0 0 20px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#4a5568', lineHeight: '1.6', margin: '0 0 16px' }
const cardBox = { backgroundColor: '#f7f8fa', borderLeft: '4px solid #9B6B4A', borderRadius: '8px', padding: '20px 22px', margin: '24px 0' }
const cardLabel = { fontSize: '11px', fontWeight: 'bold' as const, color: '#9B6B4A', margin: '0 0 8px', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const cardTitle = { fontSize: '17px', color: '#082537', margin: '0 0 10px', fontWeight: 'bold' as const, lineHeight: '1.4' }
const cardMessage = { fontSize: '14px', color: '#4a5568', margin: '0', lineHeight: '1.6' }
const buttonSection = { textAlign: 'center' as const, margin: '28px 0 8px' }
const buttonCta = { backgroundColor: '#082537', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 32px', textDecoration: 'none', display: 'inline-block' as const, boxShadow: '0 4px 12px rgba(8, 37, 55, 0.25)' }
const ctaHint = { fontSize: '11px', color: '#a0aec0', margin: '12px 0 0', textAlign: 'center' as const, lineHeight: '1.5' }
const footerNote = { fontSize: '12px', color: '#999999', margin: '24px 0 0', lineHeight: '1.5' }
const footer = { backgroundColor: '#082537', padding: '24px 0', textAlign: 'center' as const }
const footerContainer = { padding: '0 25px' }
const footerText = { fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', margin: '0 0 4px', lineHeight: '1.5' }
