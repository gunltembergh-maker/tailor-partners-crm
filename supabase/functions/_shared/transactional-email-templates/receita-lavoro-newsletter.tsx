/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface LavoroPayload {
  ano: number
  mes: number
  mes_nome: string
  receita_competencia_mes: number
  receita_competencia_ano: number
  receita_caixa_mes: number
  previsto_caixa_mes: number
  atingimento_caixa_mes: number | null
  gerado_em?: string
}

interface Props {
  payload: LavoroPayload
  recipientName?: string
  hubUrl?: string
}

// Paleta Lavoro (exceção: só neste template)
const NAVY = '#14405C'
const AZUL_CLARO = '#8AAFC9'
const AZUL_VIVO = '#00BAF2'
const WHITE = '#FFFFFF'
const ALERT_AMBER = '#D97706'
const ALERT_RED = '#DC2626'

const LOGO_BRANCO =
  'https://jtlelokzpqkgvlwomfus.supabase.co/storage/v1/object/public/assets/Logo_Lavoro_Seguros_Branca.png'

const formatBRL = (v: number | null | undefined) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const formatPct = (v: number | null | undefined) => {
  if (v === null || v === undefined || !isFinite(Number(v))) return '—'
  return `${(Number(v) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

const atingimentoColor = (v: number | null | undefined): string => {
  if (v === null || v === undefined || !isFinite(Number(v))) return AZUL_CLARO
  const pct = Number(v)
  if (pct >= 0.7) return AZUL_VIVO
  if (pct >= 0.5) return ALERT_AMBER
  return ALERT_RED
}

const KpiRow = ({ titulo, valor, valueColor }: { titulo: string; valor: string; valueColor?: string }) => (
  <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={rowTableStyle}>
    <tbody>
      <tr>
        <td style={rowTdStyle}>
          <Text style={rowLabelStyle}>{titulo}</Text>
          <Text style={{ ...rowValueStyle, color: valueColor || NAVY }}>{valor}</Text>
        </td>
      </tr>
    </tbody>
  </table>
)

const ReceitaLavoroNewsletter = ({
  payload,
  hubUrl = 'https://hub.tailorpartners.com.br/dashboard/receita-lavoro',
}: Props) => {
  if (!payload || typeof payload.receita_competencia_mes === 'undefined') {
    throw new Error('[receita-lavoro-newsletter] props.payload ausente ou incompleto.')
  }
  const { ano, mes_nome } = payload
  const mesLabel = `${mes_nome}/${ano}`

  const atingPct = payload.atingimento_caixa_mes
  const barPct = Math.max(0, Math.min(1, Number(atingPct || 0))) * 100
  const barColor = atingimentoColor(atingPct)

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{`Receita Lavoro Seguros — ${mesLabel}`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* HEADER navy com logo branco */}
          <Section style={headerStyle}>
            <Img
              src={LOGO_BRANCO}
              width="180"
              height="auto"
              alt="Lavoro Seguros"
              style={{ margin: '0 auto', display: 'block' }}
            />
          </Section>

          {/* Título/mês */}
          <Section style={titleSectionStyle}>
            <Text style={eyebrowStyle}>NEWSLETTER · RECEITA</Text>
            <Heading style={titleStyle}>{mesLabel}</Heading>
          </Section>

          {/* 5 KPIs em linhas */}
          <Section style={kpiSectionStyle}>
            <KpiRow titulo="Receita Competência (Mês)" valor={formatBRL(payload.receita_competencia_mes)} />
            <KpiRow titulo={`Receita Competência (YTD ${ano})`} valor={formatBRL(payload.receita_competencia_ano)} />
            <KpiRow titulo="Receita Caixa (Mês)" valor={formatBRL(payload.receita_caixa_mes)} />
            <KpiRow titulo="Previsto Caixa (Mês)" valor={formatBRL(payload.previsto_caixa_mes)} />

            {/* Atingimento com barra de progresso */}
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ ...rowTableStyle, borderLeft: `4px solid ${barColor}` }}>
              <tbody>
                <tr>
                  <td style={rowTdStyle}>
                    <Text style={rowLabelStyle}>Atingimento de Caixa (Mês)</Text>
                    <Text style={{ ...rowValueStyle, color: barColor, fontSize: '28px' }}>{formatPct(atingPct)}</Text>
                    <div style={progressTrackStyle}>
                      <div style={{ ...progressFillStyle, width: `${barPct}%`, backgroundColor: barColor }} />
                    </div>
                    <Text style={progressCaptionStyle}>Receita Caixa / Previsto Caixa no mês</Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* CTA */}
          <Section style={ctaSectionStyle}>
            <Button href={hubUrl} style={ctaButtonStyle}>
              Ver detalhamento completo no Hub →
            </Button>
          </Section>

          <Hr style={hrStyle} />
          <Section style={footerStyle}>
            <Text style={footerTeamStyle}>Equipe de Dados &amp; AI</Text>
            <Text style={footerCompanyStyle}>Tailor Partners · Lavoro Seguros</Text>
            {payload.gerado_em && (
              <Text style={footerGeradoStyle}>Gerado em {payload.gerado_em}</Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const bodyStyle = { backgroundColor: '#FFFFFF', fontFamily: "Arial, Helvetica, sans-serif", margin: 0, padding: 0 } as const
const containerStyle = { maxWidth: '640px', margin: '0 auto', backgroundColor: WHITE } as const

const headerStyle = { backgroundColor: NAVY, padding: '36px 24px', textAlign: 'center' as const }

const titleSectionStyle = { padding: '28px 24px 8px 24px', textAlign: 'center' as const, backgroundColor: WHITE }
const eyebrowStyle = { color: AZUL_CLARO, fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' as const, margin: 0, fontWeight: 600 as const }
const titleStyle = { color: NAVY, fontSize: '24px', margin: '6px 0 0 0', fontWeight: 700 as const }

const kpiSectionStyle = { padding: '16px 20px 8px 20px', backgroundColor: WHITE }

const rowTableStyle = {
  width: '100%',
  marginBottom: '12px',
  backgroundColor: WHITE,
  border: `1px solid #E5EEF4`,
  borderLeft: `4px solid ${AZUL_VIVO}`,
  borderRadius: '6px',
} as const
const rowTdStyle = { padding: '16px 20px' } as const
const rowLabelStyle = {
  color: AZUL_CLARO,
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.6px',
  margin: 0,
  fontWeight: 600 as const,
}
const rowValueStyle = {
  color: NAVY,
  fontSize: '22px',
  fontWeight: 700 as const,
  margin: '6px 0 0 0',
  fontVariantNumeric: 'tabular-nums' as const,
  fontFeatureSettings: '"tnum"',
}

const progressTrackStyle = {
  width: '100%',
  height: '8px',
  backgroundColor: '#EAF2F8',
  borderRadius: '4px',
  marginTop: '12px',
  overflow: 'hidden' as const,
} as const
const progressFillStyle = { height: '8px', borderRadius: '4px' } as const
const progressCaptionStyle = { color: AZUL_CLARO, fontSize: '11px', margin: '8px 0 0 0' }

const ctaSectionStyle = { padding: '28px 24px 32px 24px', textAlign: 'center' as const, backgroundColor: WHITE }
const ctaButtonStyle = {
  backgroundColor: AZUL_VIVO,
  color: WHITE,
  padding: '14px 28px',
  borderRadius: '6px',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
  display: 'inline-block' as const,
  boxShadow: '0 4px 12px rgba(0, 186, 242, 0.25)',
}

const hrStyle = { borderColor: '#E5EEF4', margin: 0 }
const footerStyle = { padding: '20px 24px', textAlign: 'center' as const, backgroundColor: WHITE }
const footerTeamStyle = { color: NAVY, fontSize: '12px', margin: 0, fontWeight: 600 as const }
const footerCompanyStyle = { color: AZUL_CLARO, fontSize: '11px', margin: '2px 0 0 0' }
const footerGeradoStyle = { color: AZUL_CLARO, fontSize: '10px', margin: '6px 0 0 0' }

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
      ano: 2026,
      mes: 7,
      mes_nome: 'Julho',
      receita_competencia_mes: 450000,
      receita_competencia_ano: 2800000,
      receita_caixa_mes: 380000,
      previsto_caixa_mes: 500000,
      atingimento_caixa_mes: 0.76,
      gerado_em: '01/07/2026 08:35',
    },
  },
} satisfies TemplateEntry

export default ReceitaLavoroNewsletter
