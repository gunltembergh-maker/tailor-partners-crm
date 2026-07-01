/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as templateExample } from './_template-example.tsx'
import { template as receitaCaixaNewsletter } from './receita-caixa-newsletter.tsx'
import { template as receitaLavoroNewsletter } from './receita-lavoro-newsletter.tsx'
import { template as conviteExterno } from './convite-externo.tsx'
import { template as alertaAdminPendencia } from './alerta-admin-pendencia.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  '_template-example': templateExample,
  'receita-caixa-newsletter': receitaCaixaNewsletter,
  'receita-lavoro-newsletter': receitaLavoroNewsletter,
  'convite-externo': conviteExterno,
  'alerta-admin-pendencia': alertaAdminPendencia,
}
