export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date: string | null | undefined): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export const leadStatusLabels: Record<string, string> = {
  NOVO: "Novo",
  CONTATO_INICIADO: "Contato Iniciado",
  QUALIFICADO: "Qualificado",
  REUNIAO: "Reunião",
  PROPOSTA: "Proposta",
  CONVERTIDO: "Convertido",
  PERDIDO: "Perdido",
};

export const leadStatusColors: Record<string, string> = {
  NOVO: "bg-tailor-blue/10 text-tailor-blue",
  CONTATO_INICIADO: "bg-tailor-copper/10 text-tailor-copper",
  QUALIFICADO: "bg-tailor-success/10 text-tailor-success",
  REUNIAO: "bg-accent/10 text-accent",
  PROPOSTA: "bg-tailor-warning/10 text-tailor-warning",
  CONVERTIDO: "bg-tailor-success/20 text-tailor-success",
  PERDIDO: "bg-destructive/10 text-destructive",
};

export const clientStatusLabels: Record<string, string> = {
  ATIVO_NET: "Ativo (Net)",
  INATIVO_PLD: "Inativo (PLD)",
  CRITICO: "Crítico",
};

export const clientStatusColors: Record<string, string> = {
  ATIVO_NET: "bg-tailor-success/10 text-tailor-success",
  INATIVO_PLD: "bg-tailor-warning/10 text-tailor-warning",
  CRITICO: "bg-destructive/10 text-destructive",
};

export const opportunityStageLabels: Record<string, string> = {
  INICIAL: "Inicial",
  EM_ANDAMENTO: "Em Andamento",
  NEGOCIACAO: "Negociação",
  GANHA: "Ganha",
  PERDIDA: "Perdida",
};

export const opportunityStageColors: Record<string, string> = {
  INICIAL: "bg-tailor-blue/10 text-tailor-blue",
  EM_ANDAMENTO: "bg-tailor-copper/10 text-tailor-copper",
  NEGOCIACAO: "bg-tailor-warning/10 text-tailor-warning",
  GANHA: "bg-tailor-success/20 text-tailor-success",
  PERDIDA: "bg-destructive/10 text-destructive",
};

export const taskTipoLabels: Record<string, string> = {
  LIGACAO: "Ligação",
  WHATSAPP: "WhatsApp",
  EMAIL: "E-mail",
  REUNIAO: "Reunião",
  POS_VENDA: "Pós-venda",
  OUTRO: "Outro",
};

export const taskStatusLabels: Record<string, string> = {
  ABERTA: "Aberta",
  CONCLUIDA: "Concluída",
  ATRASADA: "Atrasada",
};

export const taskStatusColors: Record<string, string> = {
  ABERTA: "bg-tailor-blue/10 text-tailor-blue",
  CONCLUIDA: "bg-tailor-success/10 text-tailor-success",
  ATRASADA: "bg-destructive/10 text-destructive",
};

export const canalOrigemLabels: Record<string, string> = {
  Site: "Site",
  WhatsApp: "WhatsApp",
  Indicacao: "Indicação",
  Evento: "Evento",
  Outro: "Outro",
};

export const tipoPessoaLabels: Record<string, string> = {
  PF: "Pessoa Física",
  PJ: "Pessoa Jurídica",
};

export const porteLabels: Record<string, string> = {
  PEQUENO: "Pequeno",
  MEDIO: "Médio",
  GRANDE: "Grande",
};

export const canalRelacionamentoLabels: Record<string, string> = {
  REUNIAO_PRESENCIAL: "Reunião Presencial",
  VIDEO_CHAMADA: "Vídeo Chamada",
  WHATSAPP: "WhatsApp",
  LIGACAO: "Ligação",
  EMAIL: "E-mail",
};

export const estadosBR: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AP: "Amapá", AM: "Amazonas", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MT: "Mato Grosso", MS: "Mato Grosso do Sul", MG: "Minas Gerais",
  PA: "Pará", PB: "Paraíba", PR: "Paraná", PE: "Pernambuco", PI: "Piauí",
  RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RS: "Rio Grande do Sul",
  RO: "Rondônia", RR: "Roraima", SC: "Santa Catarina", SP: "São Paulo",
  SE: "Sergipe", TO: "Tocantins",
};

export const roleLabels: Record<string, string> = {
  ASSESSOR: "Assessor",
  BANKER: "Banker",
  FINDER: "Finder",
  LIDER: "Líder",
  ADMIN: "Admin",
};

export function isToday(date: string | null | undefined): boolean {
  if (!date) return false;
  const d = new Date(date);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function isDaysAgo(date: string | null | undefined, days: number): boolean {
  if (!date) return false;
  const d = new Date(date);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);
  return d < threshold;
}
