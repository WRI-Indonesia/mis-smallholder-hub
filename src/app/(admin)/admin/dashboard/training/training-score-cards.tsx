import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, UserCheck, Venus, TrendingUp } from "lucide-react";
import { StatEmph } from "@/components/shared/stat-emph";
import type { TrainingTotals } from "@/types/dashboard";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const formatDecimal = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

const pct = (part: number, total: number) =>
  total > 0 ? `${formatDecimal(Math.round((part / total) * 1000) / 10)}%` : "—";

interface CardConfig {
  title: string;
  value: string;
  sub: React.ReactNode;
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
  // Satu angka besar per card, pembanding di sub-teks pola KPI BMP (#198):
  // urutan %, total, konteks tahun; token data beraksen StatEmph.
  const cards: CardConfig[] = [
    {
      title: "Petani Terlatih",
      value: formatNumber(totals.trainedFarmers),
      // Pembagi = seluruh petani aktif di Lembaga terpilih, termasuk Lembaga
      // yang belum tersentuh pelatihan sama sekali (keputusan owner).
      sub: (
        <>
          <StatEmph kind="percent">{pct(totals.trainedFarmers, totals.totalFarmers)}</StatEmph>{" "}
          dari total <StatEmph kind="total">{formatNumber(totals.totalFarmers)}</StatEmph> petani
          aktif pernah ikut ≥1 pelatihan ({yearLabel})
        </>
      ),
      icon: UserCheck,
      iconClass: "text-emerald-600",
    },
    {
      title: "Total Sesi",
      value: formatNumber(totals.totalActivities),
      sub: `sesi pelatihan (${yearLabel})`,
      icon: GraduationCap,
      iconClass: "text-orange-600",
    },
    // Card "Kehadiran vs Petani Unik" dihapus (#198, keputusan owner):
    // petani unik sudah diwakili card Cakupan.
    {
      title: "Partisipasi Perempuan",
      value: pct(totals.femaleAttendance, totals.totalAttendance),
      sub: (
        <>
          <StatEmph kind="total">{formatNumber(totals.femaleAttendance)}</StatEmph> dari total{" "}
          <StatEmph kind="total">{formatNumber(totals.totalAttendance)}</StatEmph> kehadiran (
          {yearLabel})
        </>
      ),
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
