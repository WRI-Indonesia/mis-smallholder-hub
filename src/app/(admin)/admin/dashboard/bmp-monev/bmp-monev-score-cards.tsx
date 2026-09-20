import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, ClipboardCheck, Gauge, Sprout } from "lucide-react";
import { StatEmph } from "@/components/shared/stat-emph";
import { formatNumber, formatPct } from "@/lib/format";
import { formatScore } from "@/lib/bmp-assessment";
import type { BmpMonevTotals } from "@/lib/bmp-monev-dashboard-aggregation";

const pct = (part: number, total: number) => (total > 0 ? `${formatPct(Math.round((part / total) * 1000) / 10)}%` : "—");

interface CardConfig {
  title: string;
  value: string;
  sub: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}

/** Satu angka besar per card, pembanding di sub-teks — pola KPI Pelatihan/BMP (#198). */
export function BmpMonevScoreCards({ totals, yearLabel }: { totals: BmpMonevTotals; yearLabel: string }) {
  const cards: CardConfig[] = [
    {
      title: "Petani Dinilai",
      value: formatNumber(totals.assessedFarmers),
      // Pembagi = seluruh petani aktif di Lembaga terpilih, termasuk Lembaga
      // yang belum dinilai sama sekali — sama dengan cakupan Pelatihan.
      sub: (
        <>
          <StatEmph kind="percent">{pct(totals.assessedFarmers, totals.totalFarmers)}</StatEmph> dari total{" "}
          <StatEmph kind="total">{formatNumber(totals.totalFarmers)}</StatEmph> petani aktif dinilai ({yearLabel})
        </>
      ),
      icon: ClipboardCheck,
      iconClass: "text-emerald-600",
    },
    {
      title: "Rerata Skor",
      value: totals.avgScore == null ? "—" : formatScore(totals.avgScore),
      sub: totals.avgScore == null ? "belum ada penilaian" : <>skala 0–3, atas {formatNumber(totals.assessedFarmers)} petani dinilai ({yearLabel})</>,
      icon: Gauge,
      iconClass: "text-sky-600",
    },
    {
      title: "Menerapkan BMP",
      value: totals.assessedFarmers > 0 ? formatNumber(totals.adopters) : "—",
      // Teladan + Praktisi = sudah menerapkan praktik (skor ≥ 1,50); pembagi
      // petani dinilai — bukan seluruh petani — karena yang belum dinilai
      // tidak diketahui statusnya.
      sub:
        totals.assessedFarmers > 0 ? (
          <>
            <StatEmph kind="percent">{pct(totals.adopters, totals.assessedFarmers)}</StatEmph> dari{" "}
            <StatEmph kind="total">{formatNumber(totals.assessedFarmers)}</StatEmph> petani dinilai berkategori Teladan atau Praktisi
          </>
        ) : (
          "belum ada penilaian"
        ),
      icon: Sprout,
      iconClass: "text-lime-600",
    },
    {
      title: "Lembaga Tercakup",
      value: formatNumber(totals.groupsCovered),
      sub: (
        <>
          <StatEmph kind="percent">{pct(totals.groupsCovered, totals.groupsTotal)}</StatEmph> dari{" "}
          <StatEmph kind="total">{formatNumber(totals.groupsTotal)}</StatEmph> Lembaga punya minimal satu penilaian ({yearLabel})
        </>
      ),
      icon: Building,
      iconClass: "text-orange-600",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="shadow-sm border border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.title}</CardTitle>
              <Icon className={`h-4 w-4 ${card.iconClass}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
