import { ReactNode } from "react";

interface TailorFrameProps {
  children: ReactNode;
  className?: string;
}

/**
 * Frame Tailor: moldura azul ao redor de conteúdo com fundo navy escuro
 * e chanfro triangular no lado direito (assinatura do brand mark).
 *
 * Use em páginas de dashboard/conteúdo, EXCETO /inicio
 * (que tem o background chevrons próprio).
 */
export function TailorFrame({ children, className = "" }: TailorFrameProps) {
  return (
    <div
      className={`relative -m-6 min-h-[calc(100vh-32px)] ${className}`}
      style={{ background: "#3088B8", padding: 16 }}
    >
      <div className="relative min-h-[calc(100vh-64px)]">
        {/* Interior navy com chanfro triangular à direita */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 1000 700"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,0 L1000,0 L1000,88 L960,123 L1000,158 L1000,700 L0,700 Z"
            fill="#082537"
          />
        </svg>
        {/* Conteúdo por cima */}
        <div className="relative z-10 p-6">{children}</div>
      </div>
    </div>
  );
}
