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
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-3 ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: "#6B7280" }}>{title}</p>
        {Icon && <Icon className="h-3.5 w-3.5" style={{ color: "#9CA3AF" }} />}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-20 mt-1" />
      ) : (
        <p className="text-4xl font-bold mt-0.5" style={{ color: "#1B2A3D" }}>{value}</p>
      )}
      {subtitle && <p className="text-[10px] mt-0.5" style={{ color: "#9CA3AF" }}>{subtitle}</p>}
    </div>
  );
}
