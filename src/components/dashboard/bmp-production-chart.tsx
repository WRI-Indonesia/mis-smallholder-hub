"use client";

import {
  Bar,
  Line,
  ComposedChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

interface BMPProductionChartProps {
  data: Array<{
    month: string;
    productionTon: number;
    productivityTonPerHa: number;
  }>;
}

export function BMPProductionChart({ data }: BMPProductionChartProps) {
  if (data.length === 0 || data.every((d) => d.productionTon === 0)) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-muted-foreground text-sm">
        Belum ada data produksi.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="fill-muted-foreground"
        />
        {/* Left Y-axis — Produksi (Ton) */}
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          className="fill-muted-foreground"
          tickFormatter={(v: number) => `${v}`}
          label={{ value: "Ton", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 11, fill: "var(--color-muted-foreground)" } }}
        />
        {/* Right Y-axis — Produktivitas (Ton/Ha) */}
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          className="fill-muted-foreground"
          tickFormatter={(v: number) => `${v}`}
          label={{ value: "Ton/Ha", angle: 90, position: "insideRight", offset: 10, style: { fontSize: 11, fill: "var(--color-muted-foreground)" } }}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
                <p className="font-medium mb-1">{label}</p>
                {payload.map((p) => (
                  <p key={p.dataKey as string} className="text-muted-foreground" style={{ color: p.color }}>
                    {p.name}: {typeof p.value === "number" ? p.value.toLocaleString("id-ID", { maximumFractionDigits: 3 }) : p.value}
                    {p.dataKey === "productionTon" ? " Ton" : " Ton/Ha"}
                  </p>
                ))}
              </div>
            );
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        <Bar
          yAxisId="left"
          dataKey="productionTon"
          name="Produksi"
          radius={[4, 4, 0, 0]}
          className="fill-primary"
        />
        <Line
          yAxisId="right"
          dataKey="productivityTonPerHa"
          name="Produktivitas"
          type="monotone"
          stroke="#f97316"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#f97316", stroke: "#fff", strokeWidth: 1 }}
          activeDot={{ r: 5 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
