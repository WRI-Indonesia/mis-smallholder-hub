import { Users, MapPinned, LandPlot, TrendingUp, Activity } from "lucide-react";

interface BMPScoreCardsProps {
  data: {
    totalFarmers: number;
    totalParcels: number;
    totalProductionKg: number;
    totalAreaHa: number;
    productivity: number;
  };
}

const cards = [
  { key: "totalFarmers" as const, label: "Total Petani", icon: Users, format: (v: number) => v.toLocaleString("id-ID") },
  { key: "totalParcels" as const, label: "Total Persil", icon: MapPinned, format: (v: number) => v.toLocaleString("id-ID") },
  {
    key: "totalAreaHa" as const,
    label: "Total Luas Lahan",
    icon: LandPlot,
    format: (v: number) => `${v.toLocaleString("id-ID", { maximumFractionDigits: 1 })} Ha`,
  },
  {
    key: "totalProductionKg" as const,
    label: "Total Produksi",
    icon: TrendingUp,
    format: (v: number) => `${(v / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} Ton`,
  },
  {
    key: "productivity" as const,
    label: "Produktivitas",
    icon: Activity,
    format: (v: number) => `${v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Ton/Ha`,
  },
] as const;

export function BMPScoreCards({ data }: BMPScoreCardsProps) {
  return (
    <div className="grid grid-cols-5 gap-3 shrink-0">
      {cards.map(({ key, label, icon: Icon, format }) => (
        <div key={key} className="bg-background border rounded-lg px-4 py-3 flex flex-col justify-between min-h-[88px]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[14px] font-bold text-muted-foreground uppercase tracking-widest leading-tight max-w-[80%]">
              {label}
            </p>
            <div className="p-1.5 rounded-md bg-muted text-muted-foreground shrink-0">
              <Icon className="h-5 w-5" />
            </div>
          </div>
          <p className="text-4xl font-black tracking-tight text-foreground">{format(data[key])}</p>
        </div>
      ))}
    </div>
  );
}
