import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge, Building2, Users, Map, GraduationCap, TrendingUp } from "lucide-react";
import { scoreBand } from "@/lib/data-availability-aggregation";
import { BAND_TEXT } from "./score-band-styles";
import type { AvailabilityTotals } from "@/types/dashboard";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const formatScore = (n: number) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n);

/** Sub-teks skor domain dengan warna band-nya. */
function ScoreSub({ score, prefix }: { score: number; prefix: string }) {
  return (
    <p className="text-xs text-muted-foreground mt-1">
      {prefix}{" "}
      <span className={`font-semibold ${BAND_TEXT[scoreBand(score)]}`}>{formatScore(score)}%</span>
    </p>
  );
}

export function AvailabilityScoreCards({ totals }: { totals: AvailabilityTotals }) {
  const overallBand = scoreBand(totals.overallScore);

  const domainCards = [
    {
      title: "Profil Lembaga",
      value: `${formatNumber(totals.totalGroups)} Lembaga`,
      score: totals.domainScores.profil,
      prefix: "kelengkapan profil",
      icon: Building2,
      iconClass: "text-sky-600",
    },
    {
      title: "Petani",
      value: formatNumber(totals.totalFarmers),
      score: totals.domainScores.petani,
      prefix: "data lengkap",
      icon: Users,
      iconClass: "text-blue-600",
    },
    {
      title: "Lahan",
      value: `${formatNumber(totals.totalParcels)} persil`,
      score: totals.domainScores.lahan,
      prefix: "data lengkap",
      icon: Map,
      iconClass: "text-emerald-600",
    },
    {
      title: "Pelatihan",
      value: `${formatNumber(totals.totalActivities)} kegiatan`,
      score: totals.domainScores.pelatihan,
      prefix: "cakupan paket",
      icon: GraduationCap,
      iconClass: "text-orange-600",
    },
    {
      title: "Produksi",
      value: `${formatNumber(totals.farmersWithProduction)} / ${formatNumber(totals.totalFarmers)}`,
      score: totals.domainScores.produksi,
      prefix: "petani ber-produksi",
      icon: TrendingUp,
      iconClass: "text-violet-600",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Card className="shadow-sm border border-border/60">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Skor Keseluruhan
          </CardTitle>
          <Gauge className={`h-4 w-4 ${BAND_TEXT[overallBand]}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold tabular-nums ${BAND_TEXT[overallBand]}`}>
            {formatNumber(totals.overallScore)} / 100
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            rata-rata tertimbang {formatNumber(totals.totalGroups)} Lembaga ·{" "}
            {formatNumber(totals.totalAnomalies)} anomali
          </p>
        </CardContent>
      </Card>

      {domainCards.map((card) => {
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
              <ScoreSub score={card.score} prefix={card.prefix} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
