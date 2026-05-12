import { Badge } from "@/components/ui/badge";
import { Star, Award, Sprout, AlertCircle } from "lucide-react";

interface BMPMonevCardsProps {
  data: {
    teladan: number;
    praktisi: number;
    pemula: number;
    belumImplementasi: number;
  };
}

const categories = [
  {
    key: "teladan" as const,
    label: "Teladan",
    icon: Star,
    badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    barColor: "bg-emerald-500",
  },
  {
    key: "praktisi" as const,
    label: "Praktisi",
    icon: Award,
    badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
    barColor: "bg-blue-500",
  },
  {
    key: "pemula" as const,
    label: "Pemula",
    icon: Sprout,
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    barColor: "bg-amber-500",
  },
  {
    key: "belumImplementasi" as const,
    label: "Belum",
    icon: AlertCircle,
    badgeClass: "bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700",
    barColor: "bg-gray-400 dark:bg-gray-600",
  },
] as const;

export function BMPMonevCards({ data }: BMPMonevCardsProps) {
  const total = data.teladan + data.praktisi + data.pemula + data.belumImplementasi;

  return (
    <div className="flex flex-col gap-3 h-full">
      {categories.map(({ key, label, icon: Icon, badgeClass, barColor }) => {
        const count = data[key];
        const pct = total > 0 ? ((count / total) * 100).toFixed(1) : "0.0";

        return (
          <div key={key} className="rounded-lg border bg-background px-3 py-2.5 flex-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {label}
                </span>
              </div>
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${badgeClass}`}>
                {pct}%
              </Badge>
            </div>
            <span className="text-xl font-bold tracking-tight">{count.toLocaleString("id-ID")}</span>
            <div className="h-1 w-full rounded-full bg-muted mt-1.5">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
