import { BMP_MONEV_STACK_ORDER } from "@/lib/bmp-monev-dashboard-aggregation";

/** Legenda 4 kategori (terendah → tertinggi), satu sumber warna dengan badge & batang. */
export function BmpMonevCategoryLegend({ className }: { className?: string }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 text-xs text-muted-foreground ${className ?? ""}`}>
      {BMP_MONEV_STACK_ORDER.map((c) => (
        <span key={c.key} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: c.color }} />
          {c.label} <span className="tabular-nums">({c.range})</span>
        </span>
      ))}
    </div>
  );
}
