import { Skeleton } from "@/components/ui/skeleton";
import { type LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  loading?: boolean;
  className?: string;
}

export function MetricCard({ title, value, subtitle, icon: Icon, loading, className }: MetricCardProps) {
  return (
    <div className={`border border-border rounded bg-card px-3 py-2.5 ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-20 mt-1" />
      ) : (
        <p className="text-xl font-bold mt-0.5" style={{ color: "hsl(var(--primary))" }}>{value}</p>
      )}
      {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}
