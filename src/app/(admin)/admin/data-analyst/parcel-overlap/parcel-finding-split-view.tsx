"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Loader2, MapPinned, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { formatNumber } from "@/lib/format";
import { OVERLAP_GEOMETRY_CHUNK } from "@/lib/parcel-overlap";
import type { ParcelFindingBase } from "@/lib/parcel-boundary-area";
import { getParcelFindingGeometries, type ParcelFindingGeometry } from "@/server/actions/parcel-boundary-area";

// MapLibre menyentuh `window` — muat hanya di client.
const ParcelFindingMap = dynamic(() => import("./parcel-finding-map").then((m) => m.ParcelFindingMap), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse rounded-md border bg-muted/20" />,
});

/** Ketik di kotak isian / combobox → panah tetap milik kontrol itu, bukan navigasi baris. */
function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || !!t.closest("[role=listbox],[role=menu],[role=combobox],[role=dialog]");
}

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

interface Props<T extends ParcelFindingBase> {
  rows: T[];
  columns: DataTableColumn<T>[];
  emptyMessage: string;
  /** Tampilkan garis boundary ICS Lembaga di peta preview (tab Luar Boundary). */
  withBoundary: boolean;
  /** Ringkasan di bawah peta untuk baris terpilih. */
  renderSummary: (row: T) => React.ReactNode;
  canExport: boolean;
  fileBase: () => string;
  excel: { sheetName: string; columns: ExcelColumn[]; row: (r: T) => Record<string, unknown> };
  /** Atribut fitur SHP/GeoJSON per lahan (poligon lahan utuh). */
  spatialProperties: (r: T) => Record<string, string | number | null>;
  shpLayer: string;
}

/**
 * Split view temuan SATU lahan (#317 tab Luar Boundary & Selisih Luas): tabel kiri,
 * preview peta + ringkasan kanan — pola sama dengan tab Tumpang Tindih
 * (`parcel-overlap-client.tsx`): baris pertama langsung terpilih, ↑/↓ berpindah baris
 * saat fokus di area kerja, geometri diambil per lahan & di-cache, peta lama tetap
 * tampil (berlapis spinner) selama geometri berikutnya dimuat.
 */
export function ParcelFindingSplitView<T extends ParcelFindingBase>({
  rows,
  columns,
  emptyMessage,
  withBoundary,
  renderSummary,
  canExport,
  fileBase,
  excel,
  spatialProperties,
  shpLayer,
}: Props<T>) {
  const [visibleRows, setVisibleRows] = useState<T[]>(rows);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [geoms, setGeoms] = useState<Record<string, ParcelFindingGeometry>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const requested = useRef(new Set<string>());

  const selectedIndex = visibleRows.findIndex((r) => r.id === selectedKey);
  const effectiveKey = selectedIndex >= 0 ? selectedKey : (visibleRows[0]?.id ?? null);
  const selected = visibleRows.find((r) => r.id === effectiveKey) ?? null;
  const position = selected ? visibleRows.indexOf(selected) : -1;

  useEffect(() => {
    if (!effectiveKey || geoms[effectiveKey] || requested.current.has(effectiveKey)) return;
    const key = effectiveKey;
    requested.current.add(key);
    setLoadingKey(key);
    getParcelFindingGeometries([key], "preview", withBoundary)
      .then((res) => {
        if (!res.success) {
          requested.current.delete(key);
          toast.error(res.error);
          return;
        }
        const g = res.data?.[0];
        if (!g?.parcel) {
          toast.error("Geometri lahan tidak ditemukan — lahan mungkin sudah diubah. Muat ulang halaman.");
          return;
        }
        setGeoms((prev) => ({ ...prev, [key]: g }));
      })
      .catch(() => {
        requested.current.delete(key);
        toast.error("Gagal memuat peta lahan ini. Coba pilih lagi.");
      })
      .finally(() => setLoadingKey((k) => (k === key ? null : k)));
  }, [effectiveKey, geoms, withBoundary]);

  // Pilihan yang hilang dari hasil dilepas (pola review #317 tab Tumpang Tindih).
  useEffect(() => {
    if (selectedKey && selectedIndex < 0 && visibleRows.length > 0) setSelectedKey(null);
  }, [selectedKey, selectedIndex, visibleRows.length]);

  const selectRow = useCallback((r: T) => {
    setSelectedKey(r.id);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const step = useCallback(
    (delta: 1 | -1) => {
      const next = visibleRows[position + delta];
      if (next) setSelectedKey(next.id);
    },
    [visibleRows, position]
  );

  const onWorkAreaKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key !== "ArrowDown" && e.key !== "ArrowUp") || e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
    if (isTypingTarget(e.target) || (e.target instanceof HTMLElement && e.target.closest(".maplibregl-map"))) return;
    e.preventDefault();
    step(e.key === "ArrowDown" ? 1 : -1);
  };

  const exportExcel = async () => {
    const { exportToExcel } = await import("@/lib/xlsx");
    await exportToExcel({ filename: fileBase(), sheetName: excel.sheetName, columns: excel.columns, data: visibleRows.map(excel.row) });
  };

  // Poligon lahan utuh (satu layer) beratribut temuan — langsung dibuka di QGIS.
  const exportSpatial = async (format: "shp" | "geojson") => {
    if (visibleRows.length === 0) return;
    setExporting(true);
    try {
      const byId = new Map<string, ParcelFindingGeometry>();
      const ids = visibleRows.map((r) => r.id);
      for (let i = 0; i < ids.length; i += OVERLAP_GEOMETRY_CHUNK) {
        const res = await getParcelFindingGeometries(ids.slice(i, i + OVERLAP_GEOMETRY_CHUNK), "export");
        if (!res.success) {
          toast.error(res.error);
          return;
        }
        for (const g of res.data ?? []) byId.set(g.id, g);
      }
      const features = visibleRows.flatMap((r) => {
        const g = byId.get(r.id)?.parcel;
        return g ? [{ type: "Feature" as const, geometry: g, properties: spatialProperties(r) }] : [];
      });
      if (features.length === 0) {
        toast.error("Tidak ada poligon lahan untuk diunduh.");
        return;
      }
      const { downloadFeatureExport } = await import("@/lib/parcel-spatial-download");
      await downloadFeatureExport(format, { type: "FeatureCollection", features }, fileBase(), { shpLayer });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunduh data spasial");
    } finally {
      setExporting(false);
    }
  };

  const selectedGeom = selected ? geoms[selected.id] : undefined;
  const lastGeom = useRef<ParcelFindingGeometry | undefined>(undefined);
  if (selectedGeom) lastGeom.current = selectedGeom;
  const shownGeom = selected ? (selectedGeom ?? lastGeom.current) : undefined;

  return (
    <div onKeyDown={onWorkAreaKeyDown} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="min-w-0">
        <DataTable
          columns={columns}
          data={rows}
          rowKey={(r) => r.id}
          searchFn={(r, q) => {
            const s = q.toLowerCase();
            return r.parcelId.toLowerCase().includes(s) || r.farmerName.toLowerCase().includes(s) || r.farmerCode.toLowerCase().includes(s);
          }}
          searchPlaceholder="Cari ID lahan / petani..."
          emptyMessage={emptyMessage}
          defaultPageSize={25}
          onRowClick={selectRow}
          selectedRowKey={effectiveKey}
          onVisibleRowsChange={setVisibleRows}
          toolbarRight={
            canExport && (
              <>
                <Button variant="outline" size="sm" className="h-9 gap-2" onClick={exportExcel} disabled={visibleRows.length === 0}>
                  <Download className="h-4 w-4" />
                  Excel
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    disabled={visibleRows.length === 0 || exporting}
                    className="flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium outline-none transition-colors hover:bg-accent disabled:opacity-50"
                  >
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPinned className="h-4 w-4" />}
                    Spasial
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => exportSpatial("shp")}>Shapefile (ZIP) — poligon lahan</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportSpatial("geojson")}>GeoJSON — poligon lahan</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )
          }
        />
      </div>

      <div ref={previewRef} className="min-w-0 scroll-mt-4 lg:sticky lg:top-4 lg:self-start">
        <Card>
          <CardContent className="space-y-3 p-4">
            {selected && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => step(-1)} disabled={position <= 0}>
                  <ChevronLeft className="h-4 w-4" />
                  Sebelumnya
                </Button>
                <span className="flex-1 text-center text-xs tabular-nums text-muted-foreground" title="Tombol panah ↑/↓ juga berpindah lahan">
                  {formatNumber(position + 1)} / {formatNumber(visibleRows.length)} · ↑/↓
                </span>
                <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => step(1)} disabled={position >= visibleRows.length - 1}>
                  Berikutnya
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            {!selected ? (
              <div className="flex h-[420px] flex-col items-center justify-center gap-2 rounded-md border border-dashed text-center text-sm text-muted-foreground">
                <MousePointerClick className="h-6 w-6" />
                Tidak ada lahan untuk ditampilkan.
              </div>
            ) : shownGeom?.parcel ? (
              <div className="relative">
                <ParcelFindingMap parcel={shownGeom.parcel} boundary={withBoundary ? shownGeom.boundary : null} />
                {!selectedGeom && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center rounded-md bg-background/40">
                    {loadingKey === selected.id ? <Loader2 className="h-6 w-6 animate-spin" /> : null}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-[420px] items-center justify-center rounded-md border bg-muted/20 text-sm text-muted-foreground">
                {loadingKey === selected.id ? <Loader2 className="h-5 w-5 animate-spin" /> : "Geometri belum tersedia."}
              </div>
            )}
            {selected && (
              <>
                {renderSummary(selected)}
                <Link
                  href={`/admin/master-data/parcels/${selected.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Buka Detail Lahan <ExternalLink className="h-3 w-3" />
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Identitas lahan di sel tabel (pola `SideCell` tab Tumpang Tindih). */
export function FindingParcelCell({ r, showGroup = true }: { r: ParcelFindingBase; showGroup?: boolean }) {
  return (
    <div className="min-w-0" title={`${r.groupName} · ${r.districtName}`}>
      <div className="break-all font-mono text-[11px] font-semibold">{r.parcelId}</div>
      <div className="truncate text-xs">{r.farmerName}</div>
      {showGroup && <div className="truncate text-[11px] text-muted-foreground">{r.groupName}</div>}
    </div>
  );
}

/** Daftar identitas lahan di ringkasan preview. */
export function FindingParcelFacts({ r, children }: { r: ParcelFindingBase; children?: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-md border p-3 text-xs">
      <dt className="text-muted-foreground">ID Lahan</dt>
      <dd className="break-all font-mono font-semibold">{r.parcelId}</dd>
      <dt className="text-muted-foreground">Petani</dt>
      <dd className="min-w-0 break-words">
        {r.farmerName} <span className="break-all font-mono text-muted-foreground">({r.farmerCode})</span>
      </dd>
      <dt className="text-muted-foreground">Kelompok Tani</dt>
      <dd>{r.kelompokTani ?? "—"}</dd>
      <dt className="text-muted-foreground">Lembaga</dt>
      <dd>{r.groupName}</dd>
      <dt className="text-muted-foreground">Distrik</dt>
      <dd>{r.districtName}</dd>
      {children}
    </dl>
  );
}
