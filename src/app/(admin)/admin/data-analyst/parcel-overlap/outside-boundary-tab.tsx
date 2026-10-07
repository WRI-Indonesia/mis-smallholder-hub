"use client";

import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/shared/data-table";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { formatArea, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { exportFileBase } from "@/lib/parcel-export-data";
import {
  OUTSIDE_KINDS,
  OUTSIDE_KIND_HINT,
  OUTSIDE_KIND_LABEL,
  findingFilterOptions,
  findingsByGroup,
  parseOutsideKind,
  topGroupsShare,
  type OutsideBoundaryRow,
  type OutsideKind,
} from "@/lib/parcel-boundary-area";
import { FindingParcelCell, FindingParcelFacts, ParcelFindingSplitView } from "./parcel-finding-split-view";

const KIND_BADGE: Record<OutsideKind, string> = {
  FULL: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900",
  PARTIAL: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900",
};
/** Lembaga yang ditampilkan di ringkasan sebelum dilipat "+N lain". */
const SUMMARY_GROUPS = 8;
const pctText = (n: number) => `${n.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
const distanceText = (m: number) => (m >= 1000 ? `${(m / 1000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} km` : `${formatNumber(m)} m`);

/**
 * Tab Luar Boundary (#317 Fase 2; keputusan owner 2026-10-07): peringatan + ringkasan
 * per Lembaga di atas — temuan menumpuk di sedikit Lembaga menandakan boundary-nya yang
 * perlu diperbarui, bukan lahannya — lalu split view tabel + peta (lahan & garis
 * boundary ICS). Bawaan "Sepenuhnya di luar" = angka check Ketersediaan Data.
 */
export function OutsideBoundaryTab({ rows, canExport }: { rows: OutsideBoundaryRow[]; canExport: boolean }) {
  const { get, setMany } = useUrlFilters();
  const kind = parseOutsideKind(get("luar")) ?? "FULL";
  const options = useMemo(() => findingFilterOptions(rows), [rows]);
  const groupParam = get("lembaga");
  const groupId = options.groups.some((g) => g.id === groupParam) ? groupParam : null;
  const districtParam = get("distrik");
  const districtId = options.districts.some((d) => d.id === districtParam) ? districtParam : null;

  const counts = useMemo(() => {
    const c: Record<OutsideKind, number> = { FULL: 0, PARTIAL: 0 };
    for (const r of rows) if (!districtId || r.districtId === districtId) c[r.kind] += 1;
    return c;
  }, [rows, districtId]);
  // Ringkasan per Lembaga mengikuti jenis & distrik, BUKAN filter Lembaga — supaya
  // Lembaga lain tetap terlihat dan bisa langsung diklik.
  const ofKind = useMemo(
    () => rows.filter((r) => r.kind === kind && (!districtId || r.districtId === districtId)),
    [rows, kind, districtId]
  );
  const byGroup = useMemo(() => findingsByGroup(ofKind), [ofKind]);
  const share = topGroupsShare(byGroup);
  const maxCount = byGroup[0]?.count ?? 0;
  const filtered = useMemo(() => (groupId ? ofKind.filter((r) => r.groupId === groupId) : ofKind), [ofKind, groupId]);

  const columns = useMemo<DataTableColumn<OutsideBoundaryRow>[]>(() => [
    { key: "parcelId", label: "Lahan", render: (r) => <FindingParcelCell r={r} />, sortValue: (r) => r.parcelId, toggleable: false },
    {
      key: "outsideHa",
      label: "Di luar",
      render: (r) => (
        <div className="whitespace-nowrap text-right tabular-nums">
          <div className="font-semibold">{formatArea(r.outsideHa)} ha</div>
          <div className="text-[11px] text-muted-foreground">{pctText(r.outsidePct)} dari {formatArea(r.polygonHa)} ha</div>
        </div>
      ),
      headerClassName: "text-right",
      sortValue: (r) => r.outsidePct,
    },
    {
      key: "distanceM",
      label: "Jarak ke boundary",
      render: (r) => <div className="whitespace-nowrap text-right tabular-nums">{r.distanceM == null ? "—" : distanceText(r.distanceM)}</div>,
      headerClassName: "text-right",
      sortValue: (r) => r.distanceM ?? -1,
    },
  ], []);

  const fileBase = () => {
    const where = options.groups.find((g) => g.id === groupId)?.name ?? options.districts.find((d) => d.id === districtId)?.name;
    return exportFileBase("lahan-luar-boundary", [where, kind === "PARTIAL" ? "sebagian" : "sepenuhnya"].filter(Boolean).join("-"), new Date());
  };

  return (
    <div className="space-y-3">
      {byGroup.length > 0 && (
        <div className="space-y-2 rounded-md border bg-amber-50/60 p-3 dark:bg-amber-950/20">
          {share >= 50 && byGroup.length > 3 ? (
            <p className="flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>
                <b>{share}%</b> temuan ada di 3 Lembaga. Konsentrasi seperti ini biasanya berarti <b>boundary ICS Lembaga
                itu yang perlu diperbarui</b>, bukan lahannya — cek boundary-nya dulu. Boundary ICS sudah termasuk buffer
                1,5 km.
              </span>
            </p>
          ) : (
            <p className="flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>Cek dulu apakah boundary ICS Lembaga sudah mutakhir sebelum memperbaiki lahan. Boundary ICS sudah termasuk buffer 1,5 km.</span>
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {byGroup.slice(0, SUMMARY_GROUPS).map((g) => {
              const active = groupId === g.groupId;
              return (
                <button
                  key={g.groupId}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMany({ lembaga: active ? null : g.groupId })}
                  title={active ? "Klik lagi untuk melepas filter" : `Saring ke ${g.groupName}`}
                  className={cn(
                    "flex min-w-[180px] items-center gap-2 rounded px-1.5 py-0.5 text-left text-xs transition-colors hover:bg-background",
                    active && "bg-background ring-2 ring-ring",
                    groupId && !active && "opacity-50 hover:opacity-100"
                  )}
                >
                  <span className="w-28 truncate font-medium">{g.groupName}</span>
                  <span className="h-2 rounded-full bg-amber-500" style={{ width: `${Math.max(4, (g.count / maxCount) * 80)}px` }} />
                  <span className="tabular-nums font-semibold">{formatNumber(g.count)}</span>
                </button>
              );
            })}
            {byGroup.length > SUMMARY_GROUPS && (
              <span className="self-center text-xs text-muted-foreground">+{byGroup.length - SUMMARY_GROUPS} Lembaga lain (pakai filter Lembaga)</span>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {OUTSIDE_KINDS.map((k) => {
            const active = kind === k;
            return (
              <button
                key={k}
                type="button"
                aria-pressed={active}
                title={OUTSIDE_KIND_HINT[k]}
                onClick={() => setMany({ luar: k === "FULL" ? null : k, lembaga: null })}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-shadow",
                  KIND_BADGE[k],
                  active ? "ring-2 ring-ring ring-offset-1 ring-offset-background" : "opacity-50 hover:opacity-100"
                )}
              >
                {OUTSIDE_KIND_LABEL[k]} {formatNumber(counts[k])}
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
        <span className="text-sm font-semibold tabular-nums">{formatNumber(filtered.length)} lahan</span>
      </div>

      <ParcelFindingSplitView
        rows={filtered}
        columns={columns}
        emptyMessage="Tidak ada lahan di luar boundary pada filter ini."
        withBoundary
        canExport={canExport}
        fileBase={fileBase}
        shpLayer="luar_boundary"
        renderSummary={(r) => (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline" className={cn("font-semibold", KIND_BADGE[r.kind])}>
                {OUTSIDE_KIND_LABEL[r.kind]}
              </Badge>
              <span className="ml-auto font-semibold tabular-nums">
                {formatArea(r.outsideHa)} ha di luar · {pctText(r.outsidePct)}
              </span>
            </div>
            <FindingParcelFacts r={r}>
              <dt className="text-muted-foreground">Luas poligon</dt>
              <dd>{formatArea(r.polygonHa)} ha</dd>
              {r.distanceM != null && (
                <>
                  <dt className="text-muted-foreground">Jarak ke boundary</dt>
                  <dd className="font-semibold">{distanceText(r.distanceM)}</dd>
                </>
              )}
            </FindingParcelFacts>
          </div>
        )}
        excel={{
          sheetName: "Luar Boundary",
          columns: [
            { header: "Jenis", key: "kind", width: 20 },
            { header: "ID Lahan", key: "parcelId", width: 18 },
            { header: "ID Petani", key: "farmerCode", width: 18 },
            { header: "Nama Petani", key: "farmerName", width: 24 },
            { header: "Kelompok Tani", key: "kt", width: 18 },
            { header: "Lembaga", key: "group", width: 28 },
            { header: "Distrik", key: "district", width: 16 },
            { header: "Luas Poligon (ha)", key: "polygonHa", width: 12 },
            { header: "Luas di Luar (ha)", key: "outsideHa", width: 12 },
            { header: "% di Luar", key: "outsidePct", width: 10 },
            { header: "Jarak ke Boundary (m)", key: "distanceM", width: 12 },
          ],
          row: (r) => ({
            kind: OUTSIDE_KIND_LABEL[r.kind],
            parcelId: r.parcelId,
            farmerCode: r.farmerCode,
            farmerName: r.farmerName,
            kt: r.kelompokTani ?? "",
            group: r.groupName,
            district: r.districtName,
            polygonHa: r.polygonHa,
            outsideHa: r.outsideHa,
            outsidePct: r.outsidePct,
            distanceM: r.distanceM ?? "",
          }),
        }}
        spatialProperties={(r) => ({
          jenis: OUTSIDE_KIND_LABEL[r.kind],
          lahan: r.parcelId,
          petani: r.farmerName,
          lembaga: r.groupName,
          luas_ha: r.polygonHa,
          luar_ha: r.outsideHa,
          luar_pct: r.outsidePct,
          jarak_m: r.distanceM,
        })}
      />

      <p className="text-xs text-muted-foreground">
        Dibandingkan dengan boundary ICS Lembaga pemilik lahan (sudah termasuk buffer 1,5 km). Lembaga tanpa boundary
        tidak dicek. <b>Sepenuhnya di luar</b> sama dengan check “Persil di luar boundary ICS” di Ketersediaan Data;{" "}
        <b>Sebagian</b> = lahan yang beririsan tetapi sebagiannya keluar. Luas dari poligon, bukan dari kolom luas tercatat.
      </p>
    </div>
  );
}
