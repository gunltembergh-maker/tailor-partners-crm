// LGPD — Máscara padronizada para CPF/CNPJ.
//
// Regra:
//  - Apenas perfil ADMIN vê documento completo
//  - Demais perfis (LIDER, BANKER, FINDER, ASSESSOR, OPERACOES, etc.) sempre veem mascarado
//
// Formato:
//   CPF  (11 dígitos): 123.x.x-xx   ->  123.***.***-**
//   CNPJ (14 dígitos): 12.x.x/xxxx-xx -> 12.***.***\/****-**
//
// IMPORTANTE: máscara é puramente cosmética / frontend.
// NÃO mexer em RPCs/views/tabelas.
import { useViewAs } from "@/contexts/ViewAsContext";

export function maskDocumento(
  doc: string | null | undefined,
  userRole?: string | null,
): string {
  if (!doc) return "";

  // Admin sempre vê completo (formatado)
  if (userRole === "ADMIN") {
    return formatDocumentoCompleto(doc);
  }

  const clean = String(doc).replace(/\D/g, "");

  if (clean.length === 11) {
    // CPF: 123.***.***-**
    return `${clean.slice(0, 3)}.***.***-**`;
  }

  if (clean.length === 14) {
    // CNPJ: 12.***.***/****-**
    return `${clean.slice(0, 2)}.***.***/****-**`;
  }

  // Fallback: documento com formato inesperado → vazio por segurança
  return "";
}

function formatDocumentoCompleto(doc: string): string {
  const clean = String(doc).replace(/\D/g, "");

  if (clean.length === 11) {
    return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`;
  }

  if (clean.length === 14) {
    return `${clean.slice(0, 2)}.${clean.slice(2, 5)}.${clean.slice(5, 8)}/${clean.slice(8, 12)}-${clean.slice(12)}`;
  }

  return doc;
}

/**
 * Hook utilitário: lê role efetivo via useViewAs() automaticamente
 * (respeita Minha Visão — Admin simulando BANKER vê mascarado).
 *
 * Para EXPORTS (Excel/CSV), use diretamente maskDocumento(doc, useAuth().role)
 * para que o role REAL do Admin prevaleça.
 */
export function useDocumentoMask() {
  const { effectiveRole } = useViewAs();
  return (doc: string | null | undefined) => maskDocumento(doc, effectiveRole);
}
