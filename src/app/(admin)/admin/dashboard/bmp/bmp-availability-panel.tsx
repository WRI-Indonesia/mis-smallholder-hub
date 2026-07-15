import Link from "next/link";
import { ExternalLink, Sprout } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BmpAvailabilityCounts } from "@/types/dashboard";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);

// Kategori + warna mengikuti legend Peta BMP (MAP-02).
const CATEGORIES: { key: keyof BmpAvailabilityCounts; label: string; color: string }[] = [
  { key: "baik", label: "Baik (> 2 tahun)", color: "#22c55e" },
  { key: "cukup", label: "Cukup (min. 1 tahun)", color: "#eab308" },
  { key: "kurang", label: "Kurang (< 1 tahun)", color: "#f97316" },
  { key: "tidakAda", label: "Tidak ada data", color: "#9ca3af" },
];

export function BmpAvailabilityPanel({
  availability,
  totalLahan,
}: {
  availability: BmpAvailabilityCounts;
  totalLahan: number;
}) {
  return (
    <Card className="h-full border border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Sprout className="h-4 w-4 text-primary" /> Ketersediaan Data Produksi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {CATEGORIES.map((cat) => {
          const count = availability[cat.key];
          const pct = totalLahan > 0 ? Math.round((count / totalLahan) * 1000) / 10 : 0;
          return (
            <div key={cat.key} className="rounded-lg border border-border/60 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {cat.label}
                </span>
                <span
                  className="rounded-full border px-2 py-0.5 text-[10px] font-medium tabular-nums"
                  style={{ borderColor: cat.color, color: cat.color }}
                >
                  {pct}%
                </span>
              </div>
              <div className="text-xl font-bold tabular-nums">{formatNumber(count)}</div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: cat.color }}
                />
              </div>
            </div>
          );
        })}

        <p className="text-[11px] text-muted-foreground">
          Kategori per lahan dari run bulan berturut-turut data produksi; produksi tanpa lahan tidak
          memengaruhi kategori.
        </p>
        <Link
          href="/admin/map/bmp"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          Lihat sebaran di Peta BMP <ExternalLink className="h-3 w-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
