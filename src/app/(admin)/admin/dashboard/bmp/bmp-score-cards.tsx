import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Activity, LandPlot, Map, Users } from "lucide-react";
import type { BmpGroupTotals } from "@/types/dashboard";

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const formatTon = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const pct = (part: number, total: number) =>
  total > 0 ? `${Math.round((part / total) * 1000) / 10}%` : "—";

interface CardConfig {
  title: string;
  value: string;
  sub: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
}

// Penekanan sub-teks (#191, dua putaran feedback owner): warna hanya untuk
// DATA (persen & total — emerald di light, putih di dark); konteks tahun tetap
// muted tanpa penekanan. Tiga warna sekaligus terasa terlalu ramai.
const EMPH_STYLES = {
  percent: "font-semibold text-emerald-700 dark:font-medium dark:text-foreground",
  total: "font-semibold text-emerald-700 dark:font-medium dark:text-foreground",
  year: "",
} as const;

function Emph({
  kind,
  children,
}: {
  kind: keyof typeof EMPH_STYLES;
  children: React.ReactNode;
}) {
  if (!EMPH_STYLES[kind]) return <>{children}</>;
  return <span className={EMPH_STYLES[kind]}>{children}</span>;
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
  // Urutan card: Produktivitas dulu baru Total Produksi (permintaan owner #191).
  const cards: CardConfig[] = [
    {
      title: "Produktivitas",
      value: `${formatTon(produktivitas)} Ton/Ha`,
      sub: "per tahun — produksi ÷ luas lahan terdata",
      icon: Activity,
      iconClass: "text-orange-600",
    },
    {
      title: "Total Produksi",
      value: `${formatTon(totals.produksiTon)} Ton`,
      // Info bawah pakai luasan, bukan jumlah lahan (permintaan owner #191);
      // % total hanya muncul bila snapshot sudah memuat total luas.
      // Urutan sub-teks konsisten antar card (permintaan owner): %, total, tahun.
      sub: (
        <>
          {totals.totalLuasHa > 0 ? (
            <>
              <Emph kind="percent">{pct(totals.luasMelaporHa, totals.totalLuasHa)}</Emph> dari
              total luas —{" "}
            </>
          ) : (
            "dari "
          )}
          <Emph kind="total">{formatTon(totals.luasMelaporHa)} Ha</Emph> terdata (
          <Emph kind="year">{yearLabel}</Emph>)
        </>
      ),
      icon: TrendingUp,
      iconClass: "text-emerald-600",
    },
    {
      title: "Luasan",
      // Angka besar cukup luas terdata — bentuk "X / Y Ha" dengan desimal
      // panjang wrap 2 baris & sulit dibaca (feedback owner #191); pembanding
      // total pindah ke sub-teks. Snapshot lama tanpa total luas → tanpa pembanding.
      value: `${formatTon(totals.luasMelaporHa)} Ha`,
      sub:
        totals.totalLuasHa > 0 ? (
          <>
            <Emph kind="percent">{pct(totals.luasMelaporHa, totals.totalLuasHa)}</Emph> dari total{" "}
            <Emph kind="total">{formatTon(totals.totalLuasHa)} Ha</Emph> luas (
            <Emph kind="year">{yearLabel}</Emph>)
          </>
        ) : (
          <>
            luas lahan terdata (<Emph kind="year">{yearLabel}</Emph>)
          </>
        ),
      icon: LandPlot,
      iconClass: "text-teal-600",
    },
    {
      title: "Lahan dengan Data Produksi",
      value: formatNumber(totals.lahanBerData),
      sub: (
        <>
          <Emph kind="percent">{pct(totals.lahanBerData, totals.totalLahan)}</Emph> dari total{" "}
          <Emph kind="total">{formatNumber(totals.totalLahan)}</Emph> lahan (
          <Emph kind="year">{yearLabel}</Emph>)
        </>
      ),
      icon: Map,
      iconClass: "text-green-600",
    },
    {
      title: "Petani Terdata",
      value: formatNumber(totals.petaniMelapor),
      sub: (
        <>
          <Emph kind="percent">{pct(totals.petaniMelapor, totals.totalPetani)}</Emph> dari total{" "}
          <Emph kind="total">{formatNumber(totals.totalPetani)}</Emph> petani (
          <Emph kind="year">{yearLabel}</Emph>)
        </>
      ),
      icon: Users,
      iconClass: "text-blue-600",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
