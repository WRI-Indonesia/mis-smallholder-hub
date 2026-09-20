import { bmpAssessmentCategory, type BmpAssessmentCategory } from "@/lib/bmp-assessment";
import { cn } from "@/lib/utils";

/**
 * Badge kategori Monev BMP (#344) — warna dari konstanta `BMP_ASSESSMENT_CATEGORIES`
 * supaya daftar, tab Petani, dashboard, dan legenda memakai satu sistem. Teks
 * putih di atas hijau/abu memenuhi kontras; label selalu ikut (bukan warna saja).
 */
export function BmpCategoryBadge({
  score,
  category,
  className,
}: {
  score?: number;
  category?: BmpAssessmentCategory;
  className?: string;
}) {
  const c = category ?? (score != null ? bmpAssessmentCategory(score) : null);
  if (!c) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium text-white whitespace-nowrap",
        className,
      )}
      style={{ backgroundColor: c.color }}
    >
      {c.label}
    </span>
  );
}
