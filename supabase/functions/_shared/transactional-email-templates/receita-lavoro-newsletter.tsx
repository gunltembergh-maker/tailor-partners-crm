/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Bloco {
  receita_competencia: number
  receita_caixa: number
  meta_periodo: number
  atingimento: number | null
  defasagem: number
  previsto_caixa: number
  atingimento_caixa: number | null
}

interface LavoroPayload {
  ano: number
  mes: number
  mes_nome: string
  semestre_label: string
  mes_bloco: Bloco
  semestre_bloco: Bloco
  ano_bloco: Bloco
  variacao_mes_anterior: number | null
  variacao_ano_anterior: number | null
  gerado_em?: string
}

interface Props {
  payload: LavoroPayload
  recipientName?: string
  hubUrl?: string
}

const formatBRL = (v: number | null | undefined) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const formatPct = (v: number | null | undefined) => {
  if (v === null || v === undefined || !isFinite(Number(v))) return '—'
  return `${(Number(v) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

const variacaoFrase = (pct: number | null | undefined, label: string): { texto: string; cor: string } => {
  if (pct === null || pct === undefined || !isFinite(Number(pct))) {
    return { texto: `Sem dado para comparar (${label})`, cor: '#9CA3AF' }
  }
  const v = Number(pct) * 100
  const abs = Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  const dir = v >= 0 ? 'maior' : 'menor'
  const cor = v >= 0 ? '#16A34A' : '#DC2626'
  return { texto: `Receita Caixa ${abs}% ${dir} que ${label}`, cor }
}

const BlocoCard = ({ titulo, sub, bloco }: { titulo: string; sub: string; bloco: Bloco }) => (
  <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={blocoTableStyle}>
    <tbody>
      <tr>
        <td style={blocoTdStyle}>
          <Text style={blocoTituloStyle}>{titulo}</Text>
          <Text style={blocoSubStyle}>{sub}</Text>
          <div style={blocoDividerStyle} />
          <Text style={blocoLabelStyle}>Receita Competência</Text>
          <Text style={blocoValueStyle}>{formatBRL(bloco?.receita_competencia)}</Text>
          <Text style={blocoLabelStyle}>Receita Caixa</Text>
          <Text style={blocoValueStyle}>{formatBRL(bloco?.receita_caixa)}</Text>
          <Text style={blocoLabelStyle}>Atingimento (Competência)</Text>
          <Text style={blocoAtingStyle}>{formatPct(bloco?.atingimento)}</Text>
        </td>
      </tr>
    </tbody>
  </table>
)

const ReceitaLavoroNewsletter = ({ payload, hubUrl = 'https://hub.tailorpartners.com.br/dashboard/receita-lavoro' }: Props) => {
  if (!payload || !payload.mes_bloco) {
    throw new Error('[receita-lavoro-newsletter] props.payload ausente ou incompleto.')
  }
  const { ano, mes_nome, semestre_label, mes_bloco, semestre_bloco, ano_bloco } = payload
  const mesLabel = `${mes_nome}/${ano}`

  const varMes = variacaoFrase(payload.variacao_mes_anterior, 'o mês anterior')
  const varAno = variacaoFrase(payload.variacao_ano_anterior, 'o mesmo mês do ano passado')

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{`Receita Lavoro Seguros — ${mesLabel}`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* HEADER */}
          <Section style={headerStyle}>
            <Img
              src="https://jtlelokzpqkgvlwomfus.supabase.co/storage/v1/object/public/assets/Logo%20Tailor.png"
              width="140"
              height="auto"
              alt="Tailor Partners"
              style={{ margin: '0 auto', display: 'block' }}
            />
            <div style={dividerLineStyle} />
            <Text style={headerEyebrowStyle}>HUB GRUPO TAILOR PARTNERS</Text>
            <Text style={headerSubtitleStyle}>Receita Lavoro Seguros</Text>
          </Section>

          <Section style={spacerStyle} />

          {/* Banner automático */}
          <Section style={autoBannerStyle}>
            <Text style={autoBannerTextStyle}>
              Este e-mail é automático e foi gerado pelo Hub. Para dúvidas, acesse o Hub Tailor Partners.
            </Text>
          </Section>

          {/* Frases de variação */}
          <Section style={sectionStyle}>
            <Text style={{ ...variacaoFraseStyle, color: varMes.cor }}>{varMes.texto}</Text>
            <Text style={{ ...variacaoFraseStyle, color: varAno.cor }}>{varAno.texto}</Text>
          </Section>

          {/* 3 blocos empilhados (fallback confiável em cliente de e-mail) */}
          <Section style={blocosSectionStyle}>
            <BlocoCard titulo="Mês" sub={mesLabel} bloco={mes_bloco} />
            <BlocoCard titulo="Semestre" sub={`${semestre_label}/${ano}`} bloco={semestre_bloco} />
            <BlocoCard titulo="Ano" sub={`YTD ${ano}`} bloco={ano_bloco} />
          </Section>

          {/* CTA */}
          <Section style={ctaSectionStyle}>
            <Button href={hubUrl} style={ctaButtonStyle}>
              Ver dashboard completo →
            </Button>
          </Section>

          <Hr style={hrStyle} />
          <Section style={footerStyle}>
            <Text style={footerTeamStyle}>Equipe de Dados &amp; AI</Text>
            <Text style={footerCompanyStyle}>Tailor Partners</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const bodyStyle = { backgroundColor: '#F5F1E8', fontFamily: "'Source Sans 3', Arial, sans-serif", margin: 0, padding: 0 } as const
const containerStyle = { maxWidth: '640px', margin: '0 auto', backgroundColor: '#ffffff' } as const

const headerStyle = { background: 'linear-gradient(135deg, #082537 0%, #0b3d57 100%)', padding: '40px 24px', textAlign: 'center' as const }
const dividerLineStyle = { width: '60px', height: '1px', backgroundColor: 'rgba(255,255,255,0.3)', margin: '24px auto' } as const
const headerEyebrowStyle = { color: '#A4C4D5', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' as const, margin: 0, fontFamily: "'Source Sans 3', Arial, sans-serif", fontWeight: 'normal' as const }
const headerSubtitleStyle = { color: '#ffffff', fontSize: '18px', margin: '6px 0 0 0', fontFamily: "'Source Sans 3', Arial, sans-serif" }

const spacerStyle = { backgroundColor: '#F5F1E8', padding: '12px 0', height: '12px', lineHeight: '12px' } as const

const autoBannerStyle = { backgroundColor: '#FAFAFA', padding: '12px 24px', borderBottom: '1px solid #EEEEEE' } as const
const autoBannerTextStyle = { color: '#73A7B7', fontSize: '12px', margin: 0, textAlign: 'center' as const, fontFamily: "'Source Sans 3', Arial, sans-serif" }

const sectionStyle = { padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }
const variacaoFraseStyle = { fontSize: '15px', fontWeight: 600 as const, margin: '4px 0', fontFamily: "'Source Sans 3', Arial, sans-serif", fontVariantNumeric: 'tabular-nums' as const, fontFeatureSettings: '"tnum"' }

const blocosSectionStyle = { padding: '16px 12px', backgroundColor: '#F5F1E8' }
const blocoTableStyle = { width: '100%', marginBottom: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #E5E7EB', borderLeft: '4px solid #082537' } as const
const blocoTdStyle = { padding: '18px 20px' } as const
const blocoTituloStyle = { color: '#082537', fontSize: '16px', margin: 0, fontWeight: 700 as const, fontFamily: "'Source Sans 3', Arial, sans-serif", textTransform: 'uppercase' as const, letterSpacing: '0.5px' }
const blocoSubStyle = { color: '#73A7B7', fontSize: '12px', margin: '2px 0 0 0', fontFamily: "'Source Sans 3', Arial, sans-serif" }
const blocoDividerStyle = { height: '1px', backgroundColor: '#E5E7EB', margin: '12px 0' } as const
const blocoLabelStyle = { color: '#4B6D88', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: '10px 0 2px 0', fontFamily: "'Source Sans 3', Arial, sans-serif" }
const blocoValueStyle = { color: '#082537', fontSize: '20px', fontWeight: 700 as const, margin: 0, fontFamily: "'Source Sans 3', Arial, sans-serif", fontVariantNumeric: 'tabular-nums' as const, fontFeatureSettings: '"tnum"' }
const blocoAtingStyle = { color: '#9B6B4A', fontSize: '18px', fontWeight: 700 as const, margin: 0, fontFamily: "'Source Sans 3', Arial, sans-serif", fontVariantNumeric: 'tabular-nums' as const, fontFeatureSettings: '"tnum"' }

const ctaSectionStyle = { padding: '32px 24px', textAlign: 'center' as const, backgroundColor: '#F5F1E8' }
const ctaButtonStyle = { backgroundColor: '#082537', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold' as const, textDecoration: 'none', display: 'inline-block' as const, fontFamily: "'Source Sans 3', Arial, sans-serif", boxShadow: '0 4px 12px rgba(8, 37, 55, 0.25)' }

const hrStyle = { borderColor: '#E5E7EB', margin: 0 }
const footerStyle = { padding: '24px', textAlign: 'center' as const, backgroundColor: '#ffffff' }
const footerTeamStyle = { color: '#082537', fontSize: '13px', margin: 0, fontWeight: 600 as const, fontFamily: "'Source Sans 3', Arial, sans-serif" }
const footerCompanyStyle = { color: '#73A7B7', fontSize: '12px', margin: '2px 0 0 0', fontFamily: "'Source Sans 3', Arial, sans-serif" }

export const template = {
  component: ReceitaLavoroNewsletter,
  subject: (data: any) => {
    const mesNome = data?.payload?.mes_nome || 'Mês'
    const ano = data?.payload?.ano || ''
    return `Receita Lavoro Seguros — ${mesNome}/${ano}`
  },
  displayName: 'Newsletter Receita Lavoro',
  previewData: {
    payload: {
      ano: 2026, mes: 7, mes_nome: 'Julho', semestre_label: 'S2',
      mes_bloco: { receita_competencia: 450000, receita_caixa: 380000, meta_periodo: 500000, atingimento: 0.9, defasagem: 70000, previsto_caixa: 400000, atingimento_caixa: 0.95 },
      semestre_bloco: { receita_competencia: 450000, receita_caixa: 380000, meta_periodo: 500000, atingimento: 0.9, defasagem: 70000, previsto_caixa: 400000, atingimento_caixa: 0.95 },
      ano_bloco: { receita_competencia: 2800000, receita_caixa: 2500000, meta_periodo: 3000000, atingimento: 0.93, defasagem: 300000, previsto_caixa: 2700000, atingimento_caixa: 0.92 },
      variacao_mes_anterior: 0.05,
      variacao_ano_anterior: -0.12,
    },
  },
} satisfies TemplateEntry

export default ReceitaLavoroNewsletter
