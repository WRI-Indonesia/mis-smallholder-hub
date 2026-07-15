import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Activity, Map, Users } from "lucide-react";
import type { BmpGroupTotals } from "@/types/dashboard";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const formatTon = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const pct = (part: number, total: number) =>
  total > 0 ? `${Math.round((part / total) * 1000) / 10}%` : "—";

interface CardConfig {
  title: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}

export function BmpScoreCards({
  totals,
  produktivitas,
  yearLabel,
}: {
  totals: BmpGroupTotals;
  produktivitas: number;
  /** Konteks mode tahun utk sub-teks, mis. "rata-rata per tahun" / "tahun 2025" / "kumulatif semua tahun". */
  yearLabel: string;
}) {
  const cards: CardConfig[] = [
    {
      title: "Total Produksi",
      value: `${formatTon(totals.produksiTon)} Ton`,
      sub: `${yearLabel} — dari ${formatNumber(totals.lahanBerData)} lahan ber-data`,
      icon: TrendingUp,
      iconClass: "text-emerald-600",
    },
    {
      title: "Produktivitas",
      value: `${formatTon(produktivitas)} Ton/Ha`,
      sub: "per tahun — produksi ÷ luas lahan melapor",
      icon: Activity,
      iconClass: "text-orange-600",
    },
    {
      title: "Lahan dengan Data Produksi",
      value: `${formatNumber(totals.lahanBerData)} / ${formatNumber(totals.totalLahan)}`,
      sub: `${pct(totals.lahanBerData, totals.totalLahan)} dari total lahan aktif (${yearLabel})`,
      icon: Map,
      iconClass: "text-green-600",
    },
    {
      title: "Petani Melapor",
      value: `${formatNumber(totals.petaniMelapor)} / ${formatNumber(totals.totalPetani)}`,
      sub: `${pct(totals.petaniMelapor, totals.totalPetani)} petani punya data produksi (${yearLabel})`,
      icon: Users,
      iconClass: "text-blue-600",
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
