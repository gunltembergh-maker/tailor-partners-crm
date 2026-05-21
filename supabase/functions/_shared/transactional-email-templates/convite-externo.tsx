/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  nome: string
  email: string
  senha_provisoria: string
  token: string
  empresa?: string
  link_ativacao: string
  expira_em_dias?: number
}

const ConviteExterno = ({
  nome,
  email,
  senha_provisoria,
  empresa,
  link_ativacao,
  expira_em_dias = 7,
}: Props) => {
  const displayName = nome || email?.split('@')[0] || 'Convidado'
  const subjectLine = `Convite Hub Tailor Partners — ${displayName}`

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{subjectLine}</Preview>
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
            <Text style={headerEyebrow}>HUB GRUPO TAILOR PARTNERS</Text>
            <Text style={headerSubtitle}>Convite de Acesso</Text>
          </Container>
        </Section>

        {/* CORPO */}
        <Container style={container}>
          <Heading style={h1}>Olá, {displayName}! 👋</Heading>

          <Text style={text}>
            Você foi convidado para acessar o <strong>Hub Tailor Partners</strong>
            {empresa ? <> em nome de <strong>{empresa}</strong></> : null} — a
            plataforma central de gestão comercial do Grupo Tailor.
          </Text>
          <Text style={text}>
            Para ativar sua conta, use os dados abaixo na tela de ativação:
          </Text>

          {/* CREDENCIAIS */}
          <Section style={credBox}>
            <Text style={credLabel}>E-MAIL DE ACESSO</Text>
            <Text style={credValueEmail}>{email}</Text>

            <Text style={{ ...credLabel, marginTop: '14px' }}>SENHA PROVISÓRIA</Text>
            <Text style={credValueSenha}>{senha_provisoria}</Text>

            <Text style={credHint}>
              Esta senha provisória é usada apenas uma vez, para definir sua senha
              definitiva na próxima tela.
            </Text>
          </Section>

          {/* CTA */}
          <Section style={buttonSection}>
            <Button style={buttonCta} href={link_ativacao}>
              Ativar minha conta
            </Button>
            <Text style={ctaHint}>
              Ou copie e cole este link no seu navegador:<br />
              <a href={link_ativacao} style={{ color: '#082537', wordBreak: 'break-all' }}>
                {link_ativacao}
              </a>
            </Text>
          </Section>

          {/* Aviso de expiração */}
          <Section style={warningBox}>
            <Text style={warningText}>
              ⏱️ Este convite expira em {expira_em_dias} dias. Após esse prazo,
              será necessário solicitar um novo convite ao administrador.
            </Text>
          </Section>

          <Text style={footerNote}>
            Se você não esperava este convite, pode ignorar este e-mail com segurança.
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
  component: ConviteExterno,
  subject: (data: any) => `Convite Hub Tailor Partners — ${data?.nome || 'Bem-vindo'}`,
  displayName: 'Convite Usuário Externo',
  previewData: {
    nome: 'André Guimarães',
    email: 'andre@empresa.com.br',
    senha_provisoria: 'AbC1XyZ2',
    token: 'preview-token',
    empresa: 'Empresa X',
    link_ativacao: 'https://hub.tailorpartners.com.br/auth/ativar-conta?token=preview-token',
    expira_em_dias: 7,
  },
}

export default ConviteExterno

/* === ESTILOS === */
const main = { backgroundColor: '#f4f4f5', fontFamily: "'Source Sans 3', Arial, sans-serif", margin: '0', padding: '0' }
const header = { background: 'linear-gradient(135deg, #082537 0%, #0b3d57 100%)', padding: '32px 0', textAlign: 'center' as const }
const headerContainer = { padding: '0 25px' }
const headerEyebrow = { fontSize: '11px', color: 'rgba(255,255,255,0.6)', letterSpacing: '2px', margin: '16px 0 4px', textAlign: 'center' as const, fontWeight: 'bold' as const }
const headerSubtitle = { fontSize: '15px', color: '#ffffff', margin: '0', textAlign: 'center' as const, fontWeight: '600' as const }
const container = { backgroundColor: '#ffffff', padding: '32px 28px', margin: '0 auto', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#082537', margin: '0 0 20px', lineHeight: '1.3' }
const text = { fontSize: '15px', color: '#4a5568', lineHeight: '1.6', margin: '0 0 16px' }
const credBox = { backgroundColor: '#f7f8fa', borderRadius: '12px', padding: '22px 24px', margin: '24px 0', border: '1px solid #e2e8f0' }
const credLabel = { fontSize: '11px', fontWeight: 'bold' as const, color: '#9B6B4A', margin: '0 0 4px', textTransform: 'uppercase' as const, letterSpacing: '1px' }
const credValueEmail = { fontSize: '16px', color: '#082537', margin: '0', fontWeight: '600' as const, wordBreak: 'break-all' as const }
const credValueSenha = { fontSize: '22px', color: '#082537', margin: '0', fontWeight: 'bold' as const, fontFamily: 'Courier New, monospace', backgroundColor: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px dashed #9B6B4A', letterSpacing: '2px', display: 'inline-block' as const }
const credHint = { fontSize: '12px', color: '#718096', margin: '12px 0 0', lineHeight: '1.5' }
const buttonSection = { textAlign: 'center' as const, margin: '28px 0 8px' }
const buttonCta = { backgroundColor: '#082537', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 32px', textDecoration: 'none', display: 'inline-block' as const, boxShadow: '0 4px 12px rgba(8, 37, 55, 0.25)' }
const ctaHint = { fontSize: '11px', color: '#a0aec0', margin: '12px 0 0', textAlign: 'center' as const, lineHeight: '1.5' }
const warningBox = { backgroundColor: '#fffbeb', border: '1px solid #f59e0b', borderRadius: '10px', padding: '12px 18px', margin: '24px 0' }
const warningText = { fontSize: '14px', color: '#92400e', margin: '0', fontWeight: '600' as const }
const footerNote = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
const footer = { backgroundColor: '#082537', padding: '24px 0', textAlign: 'center' as const }
const footerContainer = { padding: '0 25px' }
const footerText = { fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)', margin: '0 0 4px', lineHeight: '1.5' }
