/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Img, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ReceitaPayload {
  mes_referencia: {
    anomes: string
    mes_int: number
    ano_int: number
    mes_nome: string
    em_validacao: boolean
  }
  receita_mes: {
    valor: number
    mom_pct: number | null
    yoy_pct: number | null
    valor_mes_anterior?: number
    valor_mesmo_mes_ano_anterior?: number
  }
  categorias: Array<{ categoria: string; valor: number; percentual: number }>
  serie_12_meses: Array<{ anomes: string; mes_label: string; receita: number }>
  receita_acumulada_12_meses: number
  gerado_em: string
}

interface Props {
  payload: ReceitaPayload
  recipientName?: string
  hubUrl?: string
}

const formatBRL = (v: number) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatBRLCompact = (v: number) => {
  const n = Number(v)
  if (n >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')} Mi`
  if (n >= 1_000) return `R$ ${(n / 1_000).toFixed(0)} mil`
  return formatBRL(n)
}

const formatVariacao = (pct: number | null) => {
  if (pct === null || pct === undefined) return '—'
  const arrow = pct >= 0 ? '▲' : '▼'
  return `${arrow} ${Math.abs(Number(pct)).toString().replace('.', ',')}%`
}

const variacaoColor = (pct: number | null) =>
  pct === null || pct === undefined ? '#73A7B7' : Number(pct) >= 0 ? '#16A34A' : '#DC2626'

const ReceitaCaixaNewsletter = ({ payload, recipientName, hubUrl = 'https://hub.tailorpartners.com.br/dashboard/receita' }: Props) => {
  const { mes_referencia, receita_mes, categorias = [], serie_12_meses = [], receita_acumulada_12_meses, gerado_em } = payload
  const mesLabel = `${mes_referencia.mes_nome}/${mes_referencia.ano_int}`

  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{`Receita Caixa de ${mesLabel} — Hub Tailor Partners`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {/* HEADER */}
          <Section style={headerStyle}>
            <Img
              src="https://jtlelokzpqkgvlwomfus.supabase.co/storage/v1/object/public/assets/Logo%20Tailor.png"
              width="140"
              height="auto"
              alt="Tailor Partners"
              style={{ margin: '0 auto 16px', display: 'block' }}
            />
            <Heading as="h1" style={headerTitleStyle}>Newsletter Receita Caixa</Heading>
            <Text style={headerSubtitleStyle}>Hub Grupo Tailor Partners</Text>
          </Section>

          {/* BADGE EM VALIDAÇÃO */}
          {mes_referencia.em_validacao && (
            <Section style={validacaoBadgeStyle}>
              <Text style={validacaoTextStyle}>
                ⚠ Dados em validação — referência: {mesLabel}
              </Text>
            </Section>
          )}

          {/* KPI HERO */}
          <Section style={kpiSectionStyle}>
            <Text style={kpiLabelStyle}>RECEITA DO MÊS</Text>
            <Text style={kpiMesLabelStyle}>{mesLabel}</Text>
            <Text style={kpiValueStyle}>{formatBRL(receita_mes.valor)}</Text>

            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ marginTop: 16 }}>
              <tbody>
                <tr>
                  <td style={variacaoColStyle}>
                    <Text style={variacaoLabelStyle}>vs Mês Anterior</Text>
                    <Text style={{ ...variacaoValueBaseStyle, color: variacaoColor(receita_mes.mom_pct) }}>
                      {formatVariacao(receita_mes.mom_pct)}
                    </Text>
                  </td>
                  <td style={variacaoColStyle}>
                    <Text style={variacaoLabelStyle}>vs Mesmo Mês Ano Anterior</Text>
                    <Text style={{ ...variacaoValueBaseStyle, color: variacaoColor(receita_mes.yoy_pct) }}>
                      {formatVariacao(receita_mes.yoy_pct)}
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* CATEGORIAS */}
          <Section style={sectionStyle}>
            <Heading as="h2" style={sectionTitleStyle}>Receita por Categoria</Heading>
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Categoria</th>
                  <th style={thRightStyle}>Valor</th>
                  <th style={thRightStyle}>%</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((cat, i) => (
                  <tr key={i} style={i % 2 === 0 ? trEvenStyle : trOddStyle}>
                    <td style={tdStyle}>{cat.categoria}</td>
                    <td style={tdRightStyle}>{formatBRL(cat.valor)}</td>
                    <td style={tdRightStyle}>{Number(cat.percentual).toString().replace('.', ',')}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* SÉRIE 12 MESES */}
          <Section style={sectionStyle}>
            <Heading as="h2" style={sectionTitleStyle}>Evolução Últimos 12 Meses</Heading>
            <Text style={acumuladoLabelStyle}>
              Total acumulado: <strong>{formatBRLCompact(receita_acumulada_12_meses)}</strong>
            </Text>
            <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Mês</th>
                  <th style={thRightStyle}>Receita</th>
                </tr>
              </thead>
              <tbody>
                {serie_12_meses.map((m, i) => (
                  <tr key={i} style={i % 2 === 0 ? trEvenStyle : trOddStyle}>
                    <td style={tdStyle}>{m.mes_label}</td>
                    <td style={tdRightStyle}>{formatBRL(m.receita)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* CTA */}
          <Section style={ctaSectionStyle}>
            <Button href={hubUrl} style={ctaButtonStyle}>
              Ver análise completa no Hub →
            </Button>
          </Section>

          {/* FOOTER */}
          <Hr style={hrStyle} />
          <Section style={footerStyle}>
            <Text style={footerTextStyle}>Email gerado em {gerado_em} (BRT)</Text>
            <Text style={footerTextStyle}>Equipe Tailor Partners</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const bodyStyle = { backgroundColor: '#F5F1E8', fontFamily: 'Georgia, serif', margin: 0, padding: 0 } as const
const containerStyle = { maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff' } as const
const headerStyle = { background: 'linear-gradient(135deg, #082537 0%, #0b3d57 100%)', padding: '32px 24px', textAlign: 'center' as const }
const headerTitleStyle = { color: '#ffffff', fontSize: '22px', fontWeight: 'bold' as const, margin: 0, fontFamily: 'Georgia, serif' }
const headerSubtitleStyle = { color: '#A4C4D5', fontSize: '13px', margin: '6px 0 0 0' }
const validacaoBadgeStyle = { backgroundColor: '#FEF3C7', padding: '12px 24px', borderLeft: '4px solid #D97706' }
const validacaoTextStyle = { color: '#92400E', fontSize: '13px', margin: 0 }
const kpiSectionStyle = { padding: '32px 24px', textAlign: 'center' as const, borderBottom: '1px solid #E5E7EB' }
const kpiLabelStyle = { color: '#73A7B7', fontSize: '11px', letterSpacing: '1.5px', textTransform: 'uppercase' as const, margin: 0, fontFamily: 'Arial, sans-serif' }
const kpiMesLabelStyle = { color: '#4B6D88', fontSize: '14px', margin: '4px 0 0 0' }
const kpiValueStyle = { color: '#0A2337', fontSize: '40px', fontWeight: 'bold' as const, margin: '12px 0 0 0', fontFamily: 'Georgia, serif' }
const variacaoColStyle = { width: '50%', textAlign: 'center' as const, padding: '0 8px', verticalAlign: 'top' as const }
const variacaoLabelStyle = { color: '#4B6D88', fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.5px', margin: 0, fontFamily: 'Arial, sans-serif' }
const variacaoValueBaseStyle = { fontSize: '18px', fontWeight: 'bold' as const, margin: '4px 0 0 0', fontFamily: 'Arial, sans-serif' }
const sectionStyle = { padding: '24px', borderBottom: '1px solid #E5E7EB' }
const sectionTitleStyle = { color: '#0A2337', fontSize: '18px', margin: '0 0 16px 0', fontFamily: 'Georgia, serif' }
const tableStyle = { width: '100%', borderCollapse: 'collapse' as const, fontSize: '14px', fontFamily: 'Arial, sans-serif' }
const thStyle = { textAlign: 'left' as const, padding: '10px 8px', color: '#4B6D88', fontSize: '11px', textTransform: 'uppercase' as const, borderBottom: '2px solid #0A2337', letterSpacing: '0.5px' }
const thRightStyle = { ...thStyle, textAlign: 'right' as const }
const tdStyle = { padding: '10px 8px', color: '#0A2337' }
const tdRightStyle = { ...tdStyle, textAlign: 'right' as const }
const trEvenStyle = { backgroundColor: '#ffffff' }
const trOddStyle = { backgroundColor: '#F5F1E8' }
const acumuladoLabelStyle = { color: '#4B6D88', fontSize: '13px', margin: '0 0 12px 0' }
const ctaSectionStyle = { padding: '32px 24px', textAlign: 'center' as const, backgroundColor: '#F5F1E8' }
const ctaButtonStyle = { backgroundColor: '#0A2337', color: '#ffffff', padding: '14px 32px', borderRadius: '8px', fontSize: '15px', fontWeight: 'bold' as const, textDecoration: 'none', display: 'inline-block' as const, fontFamily: 'Arial, sans-serif', boxShadow: '0 4px 12px rgba(10, 35, 55, 0.25)' }
const hrStyle = { borderColor: '#E5E7EB', margin: 0 }
const footerStyle = { padding: '24px', textAlign: 'center' as const, backgroundColor: '#ffffff' }
const footerTextStyle = { color: '#73A7B7', fontSize: '12px', margin: '4px 0', fontFamily: 'Arial, sans-serif' }

export const template = {
  component: ReceitaCaixaNewsletter,
  subject: (data: any) => {
    const mesNome = data?.payload?.mes_referencia?.mes_nome || 'Mês'
    const ano = data?.payload?.mes_referencia?.ano_int || ''
    return `Receita Caixa - Grupo Tailor Partners - ${mesNome}/${ano}`
  },
  displayName: 'Newsletter Receita Caixa',
  previewData: {
    payload: {
      mes_referencia: { anomes: '2026-05', mes_int: 5, ano_int: 2026, mes_nome: 'Maio', em_validacao: false },
      receita_mes: { valor: 309243.34, mom_pct: 12.3, yoy_pct: 35.1 },
      categorias: [
        { categoria: 'Câmbio', valor: 120000, percentual: 38.8 },
        { categoria: 'Consórcio', valor: 80000, percentual: 25.9 },
        { categoria: 'Seguro de Vida', valor: 50000, percentual: 16.2 },
      ],
      serie_12_meses: [
        { anomes: '2025-06', mes_label: 'Jun/25', receita: 280000 },
        { anomes: '2026-05', mes_label: 'Mai/26', receita: 309243 },
      ],
      receita_acumulada_12_meses: 3600000,
      gerado_em: '20/05/2026 14:30',
    },
    recipientName: 'Conselho',
  },
} satisfies TemplateEntry

export default ReceitaCaixaNewsletter
