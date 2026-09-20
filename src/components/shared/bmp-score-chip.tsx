import { cn } from "@/lib/utils";

/**
 * Chip skor indikator Monev BMP 0–3 (#346). Ramp satu hue yang sama dengan
 * kategori (abu → hijau makin gelap) supaya "3" dibaca sebagai tingkat
 * tertinggi di seluruh halaman; null = "—" (tidak dinilai); di luar 0–3
 * (skor 4 dari import) = amber + tanda peringatan, bukan disembunyikan.
 */
export const BMP_SCORE_COLORS: Record<0 | 1 | 2 | 3, string> = {
  0: "#9ca3af",
  1: "#84cc16",
  2: "#16a34a",
  3: "#166534",
};

export function bmpScoreColor(score: number | null): string | null {
  if (score == null) return null;
  if (score === 0 || score === 1 || score === 2 || score === 3) return BMP_SCORE_COLORS[score];
  return "#d97706";
}

export function BmpScoreChip({ score, title, className }: { score: number | null; title?: string; className?: string }) {
  if (score == null) {
    return (
      <span className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded-md border border-dashed px-1.5 text-xs text-muted-foreground", className)} title={title ?? "Tidak dinilai"}>
        —
      </span>
    );
  }
  const outOfRange = score < 0 || score > 3;
  return (
    <span
      className={cn("inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-semibold text-white tabular-nums", className)}
      style={{ backgroundColor: bmpScoreColor(score) ?? undefined }}
      title={title ?? (outOfRange ? `Skor ${score} di luar rubrik 0–3` : `Skor ${score}`)}
    >
      {score}
      {outOfRange ? "!" : null}
    </span>
  );
}
