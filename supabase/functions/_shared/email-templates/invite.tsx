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
  Hr,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
  recipient: string
  nomeCompleto?: string
  perfil?: string
  area?: string
  gestor?: string
  empresa?: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
  recipient,
  nomeCompleto,
  perfil,
  area,
  gestor,
  empresa,
}: InviteEmailProps) => {
  const displayName = nomeCompleto || 'Colaborador'
  const subjectLine = `${displayName}, seu acesso ao Hub Tailor Partners está pronto 🎯`

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{subjectLine}</Preview>
      <Body style={main}>
        {/* HEADER com gradiente escuro */}
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

        {/* CORPO */}
        <Container style={container}>
          {/* Saudação */}
          <Heading style={h1}>Olá, {displayName}! 👋</Heading>

          {/* Texto de boas-vindas */}
          <Text style={text}>
            Você foi convidado para acessar o <strong>Hub Tailor Partners</strong> — a plataforma central de gestão comercial do Grupo Tailor.
          </Text>
          <Text style={text}>
            Aqui você acompanha em tempo real sua carteira, captação, AuC, receita e tudo mais. Tudo em um só lugar, feito para você.
          </Text>

          {/* Botão CTA */}
          <Section style={buttonSection}>
            <Button style={button} href={confirmationUrl}>
              Aceitar Convite e Criar Minha Senha
            </Button>
          </Section>

          {/* Card de Informações */}
          <Section style={infoCard}>
            <Heading style={infoTitle}>Informações do seu acesso</Heading>
            <Text style={infoRow}>
              <strong>E-mail:</strong> {recipient}
            </Text>
            {perfil && (
              <Text style={infoRow}>
                <strong>Perfil:</strong> {perfil}
              </Text>
            )}
            {area && (
              <Text style={infoRow}>
                <strong>Área:</strong> {area}
              </Text>
            )}
            {gestor && (
              <Text style={infoRow}>
                <strong>Gestor:</strong> {gestor}
              </Text>
            )}
            {empresa && (
              <Text style={infoRow}>
                <strong>Empresa:</strong> {empresa}
              </Text>
            )}
            <Text style={statusBadge}>✓ Pré-aprovado</Text>
          </Section>

          {/* Aviso de expiração */}
          <Section style={warningBox}>
            <Text style={warningText}>
              ⏱️ Este convite expira em 2 horas.
            </Text>
          </Section>

          <Text style={footerNote}>
            Se você não esperava este convite, pode ignorar este e-mail com segurança.
          </Text>
        </Container>

        {/* FOOTER escuro */}
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
              © 2025 Tailor Partners · Todos os direitos reservados
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

export default InviteEmail

/* ── Estilos ── */

const main = {
  backgroundColor: '#f4f4f5',
  fontFamily: "'Source Sans 3', Arial, sans-serif",
  margin: '0',
  padding: '0',
}

const header = {
  background: 'linear-gradient(135deg, #082537 0%, #0b3d57 100%)',
  padding: '32px 0',
  textAlign: 'center' as const,
}

const headerContainer = {
  padding: '0 25px',
}

const container = {
  backgroundColor: '#ffffff',
  padding: '32px 28px',
  margin: '0 auto',
  maxWidth: '560px',
}

const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#082537',
  margin: '0 0 20px',
  lineHeight: '1.3',
}

const text = {
  fontSize: '15px',
  color: '#4a5568',
  lineHeight: '1.6',
  margin: '0 0 16px',
}

const buttonSection = {
  textAlign: 'center' as const,
  margin: '28px 0',
}

const button = {
  backgroundColor: '#082537',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block' as const,
  boxShadow: '0 4px 12px rgba(8, 37, 55, 0.25)',
}

const infoCard = {
  backgroundColor: '#f7f8fa',
  borderRadius: '12px',
  padding: '20px 24px',
  margin: '24px 0',
  border: '1px solid #e2e8f0',
}

const infoTitle = {
  fontSize: '14px',
  fontWeight: 'bold' as const,
  color: '#082537',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}

const infoRow = {
  fontSize: '14px',
  color: '#4a5568',
  lineHeight: '1.5',
  margin: '0 0 6px',
}

const statusBadge = {
  display: 'inline-block' as const,
  backgroundColor: '#dcfce7',
  color: '#166534',
  fontSize: '13px',
  fontWeight: 'bold' as const,
  borderRadius: '20px',
  padding: '4px 14px',
  margin: '10px 0 0',
}

const warningBox = {
  backgroundColor: '#fffbeb',
  border: '1px solid #f59e0b',
  borderRadius: '10px',
  padding: '12px 18px',
  margin: '20px 0',
}

const warningText = {
  fontSize: '14px',
  color: '#92400e',
  margin: '0',
  fontWeight: '600' as const,
}

const footerNote = {
  fontSize: '12px',
  color: '#999999',
  margin: '24px 0 0',
}

const footer = {
  backgroundColor: '#082537',
  padding: '24px 0',
  textAlign: 'center' as const,
}

const footerContainer = {
  padding: '0 25px',
}

const footerText = {
  fontSize: '11px',
  color: 'rgba(255, 255, 255, 0.5)',
  margin: '0 0 4px',
  lineHeight: '1.5',
}
