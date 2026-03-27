import { LOGO_LIGHT_BG } from "@/lib/constants";

interface LoadingOverlayProps {
  show: boolean;
}

export function LoadingOverlay({ show }: LoadingOverlayProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm animate-fade-in">
      <img
        src={LOGO_LIGHT_BG}
        alt="Tailor Partners"
        className="w-44 animate-pulse"
      />
      <div className="mt-6 w-48 h-1 rounded-full overflow-hidden bg-muted">
        <div className="h-full rounded-full bg-primary animate-[progress_1.8s_ease-in-out_infinite]" />
      </div>
      <p className="mt-4 text-xs font-medium text-muted-foreground">
        Carregando...
      </p>
    </div>
  );
}
