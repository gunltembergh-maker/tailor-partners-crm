import { useEmValidacao } from "@/hooks/useEmValidacao";
import { AlertCircle } from "lucide-react";

interface Props {
  variant?: 'inline' | 'badge' | 'card-header';
  className?: string;
}

export function DadosEmValidacaoBadge({ variant = 'inline', className = '' }: Props) {
  const { data, isLoading } = useEmValidacao();

  if (isLoading || !data?.em_validacao) {
    return null;
  }

  const texto = 'Dados em validação';

  if (variant === 'badge') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${className}`}
        style={{ backgroundColor: '#FEF3C7', color: '#B58105' }}
      >
        <AlertCircle size={14} />
        {texto}
      </span>
    );
  }

  if (variant === 'card-header') {
    return (
      <div
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ${className}`}
        style={{ backgroundColor: '#FEF3C7', color: '#B58105' }}
      >
        <AlertCircle size={16} />
        {texto}
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium ${className}`}
      style={{ color: '#B58105' }}
    >
      <AlertCircle size={14} />
      {texto}
    </span>
  );
}
