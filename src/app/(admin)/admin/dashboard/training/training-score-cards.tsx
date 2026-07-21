import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, GraduationCap, UserCheck, Venus, TrendingUp } from "lucide-react";
import type { TrainingTotals } from "@/types/dashboard";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const formatDecimal = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

const pct = (part: number, total: number) =>
  total > 0 ? `${formatDecimal(Math.round((part / total) * 1000) / 10)}%` : "—";

interface CardConfig {
  title: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}

export function TrainingScoreCards({
  totals,
  yearLabel,
}: {
  totals: TrainingTotals;
  /** Konteks tahun untuk sub-teks, mis. "2025" / "semua tahun". */
  yearLabel: string;
}) {
  const cards: CardConfig[] = [
    {
      title: "Cakupan Petani Terlatih",
      value: `${formatNumber(totals.trainedFarmers)} / ${formatNumber(totals.totalFarmers)}`,
      // Pembagi = seluruh petani aktif di Lembaga terpilih, termasuk Lembaga
      // yang belum tersentuh pelatihan sama sekali (keputusan owner).
      sub: `${pct(totals.trainedFarmers, totals.totalFarmers)} petani aktif pernah ikut ≥1 pelatihan (${yearLabel})`,
      icon: UserCheck,
      iconClass: "text-emerald-600",
    },
    {
      title: "Total Kegiatan",
      value: `${formatNumber(totals.totalActivities)} kegiatan`,
      sub: `${yearLabel}`,
      icon: GraduationCap,
      iconClass: "text-orange-600",
    },
    {
      title: "Kehadiran vs Petani Unik",
      value: `${formatNumber(totals.totalAttendance)} / ${formatNumber(totals.trainedFarmers)}`,
      sub:
        totals.trainedFarmers > 0
          ? `rata-rata ${formatDecimal(totals.totalAttendance / totals.trainedFarmers)} pelatihan per petani`
          : "belum ada kehadiran",
      icon: Users,
      iconClass: "text-blue-600",
    },
    {
      title: "Partisipasi Perempuan",
      value: pct(totals.femaleAttendance, totals.totalAttendance),
      sub: `${formatNumber(totals.femaleAttendance)} dari ${formatNumber(totals.totalAttendance)} kehadiran`,
      icon: Venus,
      iconClass: "text-pink-600",
    },
    {
      title: "Rata-rata Kenaikan Skor",
      value:
        totals.scoredAttendance > 0
          ? `${totals.avgScoreGain >= 0 ? "+" : "−"}${formatDecimal(Math.abs(totals.avgScoreGain))} poin`
          : "—",
      sub:
        totals.scoredAttendance > 0
          ? `pre ${formatDecimal(totals.avgPreScore)} → post ${formatDecimal(totals.avgPostScore)} · ${formatNumber(totals.scoredAttendance)} peserta ber-skor`
          : "belum ada peserta dengan pre & post terisi",
      icon: TrendingUp,
      iconClass: "text-violet-600",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="shadow-sm border border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {card.title}
              </CardTitle>
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
