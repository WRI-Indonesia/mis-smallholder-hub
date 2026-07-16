import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, User, Map, Ruler, BookOpen, Network, BadgeCheck } from "lucide-react";
import type { DashboardStats } from "@/types/dashboard";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const formatArea = (n: number) =>
  `${new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)} ha`;

interface CardConfig {
  title: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}

export function DashboardSummaryCards({ stats }: { stats: DashboardStats }) {
  // Card sertifikasi (#169): angka besar = Lembaga tersertifikasi, sub = jumlah plan.
  // Year-independent — tidak ikut filter Tahun. Snapshot pra-#169 → 0 sampai regenerate.
  const certCard = (title: string, counts?: { certified: number; planned: number }): CardConfig => ({
    title,
    value: `${formatNumber(counts?.certified ?? 0)} lembaga`,
    sub: `Tersertifikasi · ${formatNumber(counts?.planned ?? 0)} plan`,
    icon: BadgeCheck,
    iconClass: "text-emerald-600",
  });

  const cards: CardConfig[] = [
    { title: "Total Lembaga Petani", value: formatNumber(stats.totalKelompokTani), icon: Users, iconClass: "text-slate-600" },
    { title: "Total Kelompok Tani", value: formatNumber(stats.totalKelompokTaniLahan ?? 0), icon: Network, iconClass: "text-teal-600" },
    // Sertifikasi & assurance (#169) — posisi setelah Total Kelompok Tani (permintaan owner)
    certCard("Sertifikasi RSPO", stats.certStats?.rspo),
    certCard("Sertifikasi ISPO", stats.certStats?.ispo),
    certCard("Assurance SAP/MAP", stats.certStats?.sapMap),
    { title: "Total Petani", value: formatNumber(stats.totalPetani), icon: Users, iconClass: "text-blue-600" },
    { title: "Petani Laki-laki", value: formatNumber(stats.totalPetaniLaki ?? 0), icon: User, iconClass: "text-sky-600" },
    { title: "Petani Perempuan", value: formatNumber(stats.totalPetaniPerempuan ?? 0), icon: User, iconClass: "text-pink-600" },
    { title: "Total Persil Lahan", value: formatNumber(stats.totalPersilLahan), icon: Map, iconClass: "text-green-600" },
    { title: "Total Luas Lahan", value: formatArea(stats.totalLuasLahan), icon: Ruler, iconClass: "text-green-600" },
    { title: "Paket 1 - BMP/NKT/RSPO", value: `${formatNumber(stats.trainingCounts.PAKET_1_BMP_PC_RSPO_NKT)} petani`, icon: BookOpen, iconClass: "text-orange-600" },
    { title: "Paket 2 - MK", value: `${formatNumber(stats.trainingCounts.PAKET_2_MK)} petani`, icon: BookOpen, iconClass: "text-purple-600" },
    { title: "Paket 2 - HSE", value: `${formatNumber(stats.trainingCounts.PAKET_2_K3)} petani`, icon: BookOpen, iconClass: "text-red-600" },
    { title: "Paket 3 & 4 - GEDSI/BUSDEV", value: `${formatNumber(stats.trainingCounts.PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV)} petani`, icon: BookOpen, iconClass: "text-indigo-600" },
  ];

  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title} className="shadow-sm border border-border/60">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 shrink-0 ${card.iconClass}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{card.value}</div>
              {card.sub && (
                <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
