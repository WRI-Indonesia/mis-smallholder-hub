"use client";

import { useMemo } from "react";
import type { DataTableColumn } from "@/components/shared/data-table";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { formatArea, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { exportFileBase } from "@/lib/parcel-export-data";
import { PARCEL_AREA_MISMATCH_RATIO, findingFilterOptions, type AreaMismatchRow } from "@/lib/parcel-boundary-area";
import { FindingParcelCell, FindingParcelFacts, ParcelFindingSplitView } from "./parcel-finding-split-view";

const DIRECTIONS = ["lebih-besar", "lebih-kecil"] as const;
type Direction = (typeof DIRECTIONS)[number];
const DIRECTION_LABEL: Record<Direction, string> = {
  "lebih-besar": "Kolom > poligon",
  "lebih-kecil": "Kolom < poligon",
};
const DIRECTION_HINT: Record<Direction, string> = {
  "lebih-besar": "Luas tercatat lebih besar dari poligonnya — poligon mungkin terpotong, atau luas mencakup lahan lain.",
  "lebih-kecil": "Luas tercatat lebih kecil dari poligonnya — poligon mungkin melebar, atau satuan/angka luas salah ketik.",
};
const parseDirection = (v: string | null): Direction | null => ((DIRECTIONS as readonly string[]).includes(v ?? "") ? (v as Direction) : null);
const pctText = (n: number) => `${n.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
const THRESHOLD_PCT = PARCEL_AREA_MISMATCH_RATIO * 100;

/**
 * Tab Selisih Luas (#317 Fase 2): luas kolom (`LandParcel.area`, dari atribut
 * shapefile) beda > ambang DA-02 dari luas poligonnya — check yang sama dengan
 * "Luas kolom ≠ luas poligon" di Ketersediaan Data, di sini lengkap dengan peta.
 */
export function AreaMismatchTab({ rows, canExport }: { rows: AreaMismatchRow[]; canExport: boolean }) {
  const { get, setMany } = useUrlFilters();
  const direction = parseDirection(get("arah"));
  const options = useMemo(() => findingFilterOptions(rows), [rows]);
  const groupParam = get("lembaga");
  const groupId = options.groups.some((g) => g.id === groupParam) ? groupParam : null;
  const districtParam = get("distrik");
  const districtId = options.districts.some((d) => d.id === districtParam) ? districtParam : null;

  const scoped = useMemo(
    () => rows.filter((r) => (!groupId || r.groupId === groupId) && (!districtId || r.districtId === districtId)),
    [rows, groupId, districtId]
  );
  const counts = useMemo(() => {
    const c: Record<Direction, number> = { "lebih-besar": 0, "lebih-kecil": 0 };
    for (const r of scoped) c[r.recordedLarger ? "lebih-besar" : "lebih-kecil"] += 1;
    return c;
  }, [scoped]);
  const filtered = useMemo(
    () => (direction ? scoped.filter((r) => r.recordedLarger === (direction === "lebih-besar")) : scoped),
    [scoped, direction]
  );

  const columns = useMemo<DataTableColumn<AreaMismatchRow>[]>(() => [
    { key: "parcelId", label: "Lahan", render: (r) => <FindingParcelCell r={r} />, sortValue: (r) => r.parcelId, toggleable: false },
    {
      key: "recordedHa",
      label: "Kolom · Poligon",
      render: (r) => (
        <div className="whitespace-nowrap text-right tabular-nums">
          <div>
            <span className="font-semibold">{formatArea(r.recordedHa)}</span>
            <span className="text-muted-foreground"> · {formatArea(r.polygonHa)} ha</span>
          </div>
        </div>
      ),
      headerClassName: "text-right",
      sortValue: (r) => r.recordedHa,
    },
    {
      key: "diffPct",
      label: "Selisih",
      render: (r) => (
        <div className="whitespace-nowrap text-right tabular-nums">
          <div className="font-semibold">{pctText(r.diffPct)}</div>
          <div className="text-[11px] text-muted-foreground">{r.recordedLarger ? "kolom lebih besar" : "kolom lebih kecil"}</div>
        </div>
      ),
      headerClassName: "text-right",
      sortValue: (r) => r.diffPct,
    },
  ], []);

  const fileBase = () => {
    const where = options.groups.find((g) => g.id === groupId)?.name ?? options.districts.find((d) => d.id === districtId)?.name;
    return exportFileBase("lahan-selisih-luas", [where, direction].filter(Boolean).join("-") || "semua", new Date());
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={!direction}
            onClick={() => setMany({ arah: null })}
            className={cn(
              "rounded-full border bg-background px-2.5 py-0.5 text-xs font-semibold transition-shadow",
              !direction ? "ring-2 ring-ring ring-offset-1 ring-offset-background" : "opacity-50 hover:opacity-100"
            )}
          >
            Semua {formatNumber(scoped.length)}
          </button>
          {DIRECTIONS.map((d) => {
            const active = direction === d;
            return (
              <button
                key={d}
                type="button"
                aria-pressed={active}
                title={DIRECTION_HINT[d]}
                onClick={() => setMany({ arah: active ? null : d })}
                className={cn(
                  "rounded-full border bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 transition-shadow dark:bg-slate-800 dark:text-slate-200",
                  active ? "ring-2 ring-ring ring-offset-1 ring-offset-background" : direction ? "opacity-50 hover:opacity-100" : "hover:shadow"
                )}
              >
                {DIRECTION_LABEL[d]} {formatNumber(counts[d])}
              </button>
            );
          })}
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Distrik</span>
          <FilterCombobox
            options={options.districts}
            value={districtId}
            onSelect={(id) => setMany({ distrik: id, lembaga: null })}
            allLabel="Semua Distrik"
            searchPlaceholder="Cari distrik..."
            emptyLabel="Distrik tidak ditemukan."
            widthClass="w-[180px]"
          />
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground">Lembaga</span>
          <FilterCombobox
            options={options.groups}
            value={groupId}
            onSelect={(id) => setMany({ lembaga: id })}
            allLabel="Semua Lembaga"
            searchPlaceholder="Cari lembaga petani..."
            emptyLabel="Lembaga Petani tidak ditemukan."
            widthClass="w-[220px]"
          />
        </div>
      </div>

      <ParcelFindingSplitView
        rows={filtered}
        columns={columns}
        emptyMessage="Tidak ada lahan dengan selisih luas pada filter ini."
        withBoundary={false}
        canExport={canExport}
        fileBase={fileBase}
        shpLayer="selisih_luas"
        renderSummary={(r) => (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">{r.recordedLarger ? "Kolom lebih besar dari poligon" : "Kolom lebih kecil dari poligon"}</span>
              <span className="ml-auto font-semibold tabular-nums">Selisih {pctText(r.diffPct)}</span>
            </div>
            <FindingParcelFacts r={r}>
              <dt className="text-muted-foreground">Luas tercatat</dt>
              <dd className="font-semibold">{formatArea(r.recordedHa)} ha</dd>
              <dt className="text-muted-foreground">Luas poligon</dt>
              <dd className="font-semibold">{formatArea(r.polygonHa)} ha</dd>
            </FindingParcelFacts>
          </div>
        )}
        excel={{
          sheetName: "Selisih Luas",
          columns: [
            { header: "ID Lahan", key: "parcelId", width: 18 },
            { header: "ID Petani", key: "farmerCode", width: 18 },
            { header: "Nama Petani", key: "farmerName", width: 24 },
            { header: "Kelompok Tani", key: "kt", width: 18 },
            { header: "Lembaga", key: "group", width: 28 },
            { header: "Distrik", key: "district", width: 16 },
            { header: "Luas Tercatat (ha)", key: "recordedHa", width: 12 },
            { header: "Luas Poligon (ha)", key: "polygonHa", width: 12 },
            { header: "Selisih (%)", key: "diffPct", width: 10 },
            { header: "Arah", key: "direction", width: 18 },
          ],
          row: (r) => ({
            parcelId: r.parcelId,
            farmerCode: r.farmerCode,
            farmerName: r.farmerName,
            kt: r.kelompokTani ?? "",
            group: r.groupName,
            district: r.districtName,
            recordedHa: r.recordedHa,
            polygonHa: r.polygonHa,
            diffPct: r.diffPct,
            direction: r.recordedLarger ? "Kolom lebih besar" : "Kolom lebih kecil",
          }),
        }}
        spatialProperties={(r) => ({
          lahan: r.parcelId,
          petani: r.farmerName,
          lembaga: r.groupName,
          luas_kolom: r.recordedHa,
          luas_poli: r.polygonHa,
          selisih: r.diffPct,
        })}
      />

      <p className="text-xs text-muted-foreground">
        Selisih = |luas tercatat − luas poligon| ÷ yang lebih besar; ditampilkan bila &gt; {THRESHOLD_PCT}% — sama dengan
        check “Luas kolom ≠ luas poligon” di Ketersediaan Data. Luas tercatat berasal dari kolom luas di shapefile saat
        upload; luas poligon dihitung dari bentuk poligonnya.
      </p>
    </div>
  );
}
