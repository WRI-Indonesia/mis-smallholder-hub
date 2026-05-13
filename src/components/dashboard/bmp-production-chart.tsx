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
    productionTonMuda: number;
    productionTonDewasa: number;
    productionTonTua: number;
    productivityTonPerHa: number;
  }>;
}

export function BMPProductionChart({ data }: BMPProductionChartProps) {
  if (data.length === 0 || data.every((d) => (d.productionTonMuda || 0) + (d.productionTonDewasa || 0) + (d.productionTonTua || 0) === 0)) {
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
          tick={{ fontSize: 12, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        {/* Left Y-axis — Produksi (Ton) */}
        <YAxis
          yAxisId="left"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}`}
          label={{ value: "Ton", angle: -90, position: "insideLeft", offset: 10, style: { fontSize: 11, fill: "#9ca3af" } }}
        />
        {/* Right Y-axis — Produktivitas (Ton/Ha) */}
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={[0, (dataMax: number) => dataMax * 2]}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `${v}`}
          label={{ value: "Ton/Ha", angle: 90, position: "insideRight", offset: 10, style: { fontSize: 11, fill: "#9ca3af" } }}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div className="rounded-lg border bg-background px-3 py-2 shadow-md text-sm">
                <p className="font-medium mb-1">{label}</p>
                {payload.map((p) => {
                  const isProd = p.dataKey?.toString().startsWith("productionTon");
                  return (
                    <p key={p.dataKey as string} className="text-muted-foreground" style={{ color: p.color }}>
                      {p.name}: {typeof p.value === "number" ? p.value.toLocaleString("id-ID", { maximumFractionDigits: 3 }) : p.value}
                      {isProd ? " Ton" : " Ton/Ha"}
                    </p>
                  );
                })}
              </div>
            );
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          {...({
            payload: [
              { id: 'productionTonMuda', type: 'rect', value: 'Muda (4-8 thn)', color: '#a3e635' },
              { id: 'productionTonDewasa', type: 'rect', value: 'Dewasa (9-18 thn)', color: '#22c55e' },
              { id: 'productionTonTua', type: 'rect', value: 'Tua (19-25 thn)', color: '#047857' },
              { id: 'productivityTonPerHa', type: 'line', value: 'Produktivitas (Dewasa)', color: '#f97316' }
            ]
          } as any)}
        />
        <Bar
          yAxisId="left"
          dataKey="productionTonMuda"
          name="Muda (4-8 thn)"
          fill="#a3e635"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          yAxisId="left"
          dataKey="productionTonDewasa"
          name="Dewasa (9-18 thn)"
          fill="#22c55e"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          yAxisId="left"
          dataKey="productionTonTua"
          name="Tua (19-25 thn)"
          fill="#047857"
          radius={[4, 4, 0, 0]}
        />
        <Line
          yAxisId="right"
          dataKey="productivityTonPerHa"
          name="Produktivitas (Dewasa)"
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
