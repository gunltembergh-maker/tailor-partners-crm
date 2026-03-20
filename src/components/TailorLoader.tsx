interface TailorLoaderProps {
  overlay?: boolean;
}

export default function TailorLoader({ overlay = true }: TailorLoaderProps) {
  const content = (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <h1 className="text-2xl font-display font-bold text-primary">Tailor</h1>
        <p className="text-[10px] tracking-[0.3em] text-muted-foreground uppercase">Partners</p>
      </div>
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
