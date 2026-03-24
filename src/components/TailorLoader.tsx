import { LOGO_DARK_BG } from "@/lib/constants";

interface TailorLoaderProps {
  overlay?: boolean;
}

export default function TailorLoader({ overlay = true }: TailorLoaderProps) {
  const content = (
    <div className="flex flex-col items-center gap-4">
      <img src="https://jtlelokzpqkgvlwomfus.supabase.co/storage/v1/object/public/assets/Logo%20Tailor.png" alt="Tailor Partners" className="w-[140px]" />
      <p className="text-sm text-muted-foreground">Carregando...</p>
      <div className="h-8 w-8 rounded-full border-[3px] border-muted border-t-primary animate-spin" />
    </div>
  );

  if (!overlay) {
    return (
      <div className="flex items-center justify-center py-24">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="rounded-xl border bg-card p-10 shadow-lg">
        {content}
      </div>
    </div>
  );
}
