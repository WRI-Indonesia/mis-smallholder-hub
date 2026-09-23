"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Loader2, MapPinned, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { FilterCombobox } from "@/components/shared/filter-combobox";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { formatArea, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { exportFileBase } from "@/lib/parcel-export-data";
import {
  OVERLAP_DUPLICATE_PCT,
  OVERLAP_KINDS,
  OVERLAP_KIND_LABEL,
  OVERLAP_LEVELS,
  OVERLAP_LEVEL_HINT,
  OVERLAP_LEVEL_LABEL,
  OVERLAP_MIN_AREA_M2,
  OVERLAP_MIN_PCT,
  OVERLAP_PCT_DEFAULT,
  OVERLAP_PCT_OPTIONS,
  filterOverlapRows,
  overlapFilterOptions,
  pairCountByParcel,
  parseKind,
  parseLevel,
  parsePctOption,
  type OverlapKind,
  type OverlapLevel,
  type OverlapSide,
  type ParcelOverlapRow,
} from "@/lib/parcel-overlap";
import { getParcelOverlapGeometries, type OverlapPairGeometry } from "@/server/actions/parcel-overlap";
import { OVERLAP_COLORS } from "./overlap-preview-map";

// MapLibre menyentuh `window` — muat hanya di client.
const OverlapPreviewMap = dynamic(() => import("./overlap-preview-map").then((m) => m.OverlapPreviewMap), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse rounded-md border bg-muted/20" />,
});

interface Props {
  rows: ParcelOverlapRow[];
  canExport: boolean;
}

const PCT_LABEL: Record<(typeof OVERLAP_PCT_OPTIONS)[number], string> = {
  all: "Semua",
  "10": "> 10%",
  "25": "> 25%",
  "50": "> 50%",
  "75": "> 75%",
  "90": "> 90%",
};

// Sebagian sengaja abu-abu netral (bukan warna tema yang kehijauan) — hijau terbaca "aman".
const LEVEL_BADGE: Record<OverlapLevel, string> = {
  DUPLICATE: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-900",
  CONTAINED: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900",
  PARTIAL: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
};

/** Label jenis ringkas untuk kolom tabel yang sempit (label lengkap di filter & panel preview). */
const KIND_SHORT: Record<OverlapKind, string> = {
  SAME_FARMER: "Petani sama",
  SAME_GROUP: "Satu Lembaga",
  CROSS_GROUP: "Lintas Lembaga",
};

const pctText = (n: number) => `${n.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;

/** Ketik di kotak isian / combobox → panah tetap milik kontrol itu, bukan navigasi pasangan. */
function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  return t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || !!t.closest("[role=listbox],[role=menu],[role=combobox],[role=dialog]");
}

function LevelBadge({ level, className }: { level: OverlapLevel; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        <Badge variant="outline" className={cn("font-semibold", LEVEL_BADGE[level], className)}>
          {OVERLAP_LEVEL_LABEL[level]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-64">{OVERLAP_LEVEL_HINT[level]}</TooltipContent>
    </Tooltip>
  );
}

function SideCell({ s, showGroup, otherPairs }: { s: OverlapSide; showGroup: boolean; otherPairs: number }) {
  return (
    // Lembaga & Distrik selalu ada di tooltip; di sel hanya bila pasangannya lintas Lembaga (baris lebih pendek).
    <div className="min-w-0" title={`${s.groupName} · ${s.districtName}`}>
      <div className="flex flex-wrap items-center gap-1">
        <span className="break-all font-mono text-[11px] font-semibold">{s.parcelId}</span>
        {otherPairs > 0 && (
          <span
            className="rounded bg-violet-100 px-1 text-[10px] font-semibold text-violet-800 dark:bg-violet-950 dark:text-violet-200"
            title={`Lahan ini juga tumpang tindih dengan ${otherPairs} lahan lain`}
          >
            +{otherPairs}
          </span>
        )}
      </div>
      <div className="truncate text-xs">{s.farmerName}</div>
      {showGroup && <div className="truncate text-[11px] text-muted-foreground">{s.groupName}</div>}
    </div>
  );
}

function SideSummary({ label, color, s, otherPairs }: { label: string; color: string; s: OverlapSide; otherPairs: number }) {
  return (
    <div className="space-y-1.5 rounded-md border p-3">
      <div className="flex items-center gap-2">
        <span className="rounded px-1.5 py-0.5 font-mono text-[11px] font-bold text-white" style={{ backgroundColor: color }}>
          {label}
        </span>
        <span className="break-all font-mono text-sm font-semibold">{s.parcelId}</span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
        <dt className="text-muted-foreground">Petani</dt>
        <dd className="min-w-0 break-words">
          {s.farmerName} <span className="break-all font-mono text-muted-foreground">({s.farmerCode})</span>
        </dd>
        <dt className="text-muted-foreground">Kelompok Tani</dt>
        <dd>{s.kelompokTani ?? "—"}</dd>
        <dt className="text-muted-foreground">Lembaga</dt>
        <dd>{s.groupName}</dd>
        <dt className="text-muted-foreground">Distrik</dt>
        <dd>{s.districtName}</dd>
        <dt className="text-muted-foreground">Luas poligon</dt>
        <dd>{formatArea(s.areaHa)} ha</dd>
        <dt className="text-muted-foreground">Tertumpang</dt>
        <dd className="font-semibold">{pctText(s.pct)} dari lahan ini</dd>
      </dl>
      {otherPairs > 0 && (
        <p className="text-[11px] text-violet-700 dark:text-violet-300">
          Juga tumpang tindih dengan {otherPairs} lahan lain — cari ID lahan ini di tabel.
        </p>
      )}
      {s.inScope ? (
        // Tab baru: filter, halaman tabel, dan pasangan terpilih di sini tidak hilang.
        <Link
          href={`/admin/master-data/parcels/${s.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Buka Detail Lahan <ExternalLink className="h-3 w-3" />
        </Link>
      ) : (
        <p className="text-[11px] text-muted-foreground">Di luar akses Anda — Detail Lahan tidak bisa dibuka.</p>
      )}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export function ParcelOverlapClient({ rows, canExport }: Props) {
  // Filter di query string (TD-021) — tautan bisa dibagikan ke rekan.
  const { get, setMany } = useUrlFilters();
  const pct = parsePctOption(get("persen"));
  const kind = parseKind(get("jenis"));
  const level = parseLevel(get("label"));
  const options = useMemo(() => overlapFilterOptions(rows), [rows]);
  const groupParam = get("lembaga");
  const groupId = options.groups.some((g) => g.id === groupParam) ? groupParam : null;
  const districtParam = get("distrik");
  const districtId = options.districts.some((d) => d.id === districtParam) ? districtParam : null;
  const pairCounts = useMemo(() => pairCountByParcel(rows), [rows]);

  // Chip label menghitung dari filter LAIN (tanpa label) — angkanya tetap terbaca
  // saat satu chip aktif, sehingga chip lain bisa langsung diklik.
  const beforeLevel = useMemo(
    () => filterOverlapRows(rows, { pct, kind, level: null, groupId, districtId }),
    [rows, pct, kind, groupId, districtId]
  );
  const filtered = useMemo(() => (level ? beforeLevel.filter((r) => r.level === level) : beforeLevel), [beforeLevel, level]);
  const counts = useMemo(() => {
    const c = { DUPLICATE: 0, CONTAINED: 0, PARTIAL: 0 };
    for (const r of beforeLevel) c[r.level] += 1;
    return c;
  }, [beforeLevel]);
  const totalHa = useMemo(() => filtered.reduce((sum, r) => sum + r.intersectionHa, 0), [filtered]);

  // Urutan tampilan tabel (setelah cari & sortir) — dasar Sebelumnya/Berikutnya & ekspor.
  const [visibleRows, setVisibleRows] = useState<ParcelOverlapRow[]>(filtered);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [geoms, setGeoms] = useState<Record<string, OverlapPairGeometry>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const requested = useRef(new Set<string>());

  // Pilihan yang keluar dari hasil (filter/cari berubah) → pilih baris pertama;
  // baris pertama juga langsung terpilih saat halaman dibuka (panel kanan tidak kosong).
  const selectedIndex = visibleRows.findIndex((r) => r.key === selectedKey);
  const effectiveKey = selectedIndex >= 0 ? selectedKey : (visibleRows[0]?.key ?? null);
  const selected = visibleRows.find((r) => r.key === effectiveKey) ?? null;
  const position = selected ? visibleRows.indexOf(selected) : -1;

  // Ambil geometri pasangan terpilih sekali saja (cache per kunci).
  useEffect(() => {
    if (!effectiveKey || geoms[effectiveKey] || requested.current.has(effectiveKey)) return;
    const key = effectiveKey;
    requested.current.add(key);
    setLoadingKey(key);
    getParcelOverlapGeometries([key], "preview").then((res) => {
      setLoadingKey((k) => (k === key ? null : k));
      if (!res.success) {
        requested.current.delete(key);
        toast.error(res.error);
        return;
      }
      const g = res.data?.[0];
      if (!g) {
        toast.error("Geometri lahan tidak ditemukan — lahan mungkin sudah diubah. Muat ulang halaman.");
        return;
      }
      setGeoms((prev) => ({ ...prev, [key]: g }));
    });
  }, [effectiveKey, geoms]);

  const selectRow = useCallback((r: ParcelOverlapRow) => {
    setSelectedKey(r.key);
    // Layar sempit: preview ada di bawah tabel — gulir ke sana (hanya saat baris diklik).
    if (window.matchMedia("(max-width: 1023px)").matches) {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const step = useCallback(
    (delta: 1 | -1) => {
      const next = visibleRows[position + delta];
      if (next) setSelectedKey(next.key);
    },
    [visibleRows, position]
  );

  // ↑/↓ = pasangan sebelumnya/berikutnya, kecuali saat mengetik atau memakai kontrol lain.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== "ArrowDown" && e.key !== "ArrowUp") || e.altKey || e.ctrlKey || e.metaKey) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      step(e.key === "ArrowDown" ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  const fileBase = () => exportFileBase("tumpang-tindih-lahan", pct === "all" ? null : `lebih-${pct}persen`, new Date());

  const exportExcel = async () => {
    const { exportToExcel } = await import("@/lib/xlsx");
    await exportToExcel({
      filename: fileBase(),
      sheetName: "Tumpang Tindih",
      columns: [
        { header: "Label", key: "level", width: 11 },
        { header: "Jenis", key: "kind", width: 24 },
        { header: "% thd Lahan Terkecil", key: "pctMin", width: 12 },
        { header: "Luas Irisan (ha)", key: "intersectionHa", width: 12 },
        ...(["a", "b"] as const).flatMap((k) => {
          const L = k.toUpperCase();
          return [
            { header: `ID Lahan ${L}`, key: `${k}ParcelId`, width: 16 },
            { header: `ID Petani ${L}`, key: `${k}FarmerCode`, width: 16 },
            { header: `Nama Petani ${L}`, key: `${k}FarmerName`, width: 24 },
            { header: `Kelompok Tani ${L}`, key: `${k}Kt`, width: 18 },
            { header: `Lembaga ${L}`, key: `${k}Group`, width: 28 },
            { header: `Distrik ${L}`, key: `${k}District`, width: 16 },
            { header: `Luas Poligon ${L} (ha)`, key: `${k}Area`, width: 12 },
            { header: `% thd Lahan ${L}`, key: `${k}Pct`, width: 10 },
          ];
        }),
      ],
      data: visibleRows.map((r) => ({
        level: OVERLAP_LEVEL_LABEL[r.level],
        kind: OVERLAP_KIND_LABEL[r.kind],
        pctMin: r.pctMin,
        intersectionHa: r.intersectionHa,
        ...Object.fromEntries(
          (["a", "b"] as const).flatMap((k) => {
            const s = r[k];
            return [
              [`${k}ParcelId`, s.parcelId],
              [`${k}FarmerCode`, s.farmerCode],
              [`${k}FarmerName`, s.farmerName],
              [`${k}Kt`, s.kelompokTani ?? ""],
              [`${k}Group`, s.groupName],
              [`${k}District`, s.districtName],
              [`${k}Area`, s.areaHa],
              [`${k}Pct`, s.pct],
            ];
          })
        ),
      })),
    });
  };

  // Poligon IRISAN (satu layer) beratribut pasangan — langsung dibuka di QGIS.
  const exportSpatial = async (format: "shp" | "geojson") => {
    if (visibleRows.length === 0) return;
    setExporting(true);
    try {
      const res = await getParcelOverlapGeometries(visibleRows.map((r) => r.key), "export");
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      const byKey = new Map((res.data ?? []).map((g) => [g.key, g]));
      const features = visibleRows.flatMap((r) => {
        const g = byKey.get(r.key);
        if (!g?.intersection) return [];
        return [
          {
            type: "Feature" as const,
            geometry: g.intersection,
            properties: {
              label: OVERLAP_LEVEL_LABEL[r.level],
              jenis: OVERLAP_KIND_LABEL[r.kind],
              pct_min: r.pctMin,
              irisan_ha: r.intersectionHa,
              lahan_a: r.a.parcelId,
              petani_a: r.a.farmerName,
              lembaga_a: r.a.groupName,
              pct_a: r.a.pct,
              lahan_b: r.b.parcelId,
              petani_b: r.b.farmerName,
              lembaga_b: r.b.groupName,
              pct_b: r.b.pct,
            },
          },
        ];
      });
      if (features.length === 0) {
        toast.error("Tidak ada poligon irisan untuk diunduh.");
        return;
      }
      const { downloadFeatureExport } = await import("@/lib/parcel-spatial-download");
      await downloadFeatureExport(format, { type: "FeatureCollection", features }, fileBase(), { shpLayer: "irisan" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunduh data spasial");
    } finally {
      setExporting(false);
    }
  };

  const others = (r: ParcelOverlapRow, side: "a" | "b") => (pairCounts.get(r[side].id) ?? 1) - 1;

  const columns: DataTableColumn<ParcelOverlapRow>[] = [
    {
      key: "a",
      label: "Lahan A",
      render: (r) => <SideCell s={r.a} showGroup={r.kind === "CROSS_GROUP"} otherPairs={others(r, "a")} />,
      sortValue: (r) => r.a.parcelId,
      toggleable: false,
    },
    {
      key: "b",
      label: "Lahan B",
      render: (r) => <SideCell s={r.b} showGroup={r.kind === "CROSS_GROUP"} otherPairs={others(r, "b")} />,
      sortValue: (r) => r.b.parcelId,
      toggleable: false,
    },
    {
      key: "pctMin",
      label: "% · Irisan",
      render: (r) => (
        <div className="whitespace-nowrap text-right tabular-nums">
          <div>
            <span className="font-semibold">{pctText(r.pctMin)}</span>
            <span className="text-[11px] text-muted-foreground"> · {formatArea(r.intersectionHa)} ha</span>
          </div>
          <div className="text-[11px] text-muted-foreground" title="% terhadap lahan A / lahan B">
            A {pctText(r.a.pct)} · B {pctText(r.b.pct)}
          </div>
        </div>
      ),
      headerClassName: "text-right",
      toggleable: false,
    },
    {
      key: "level",
      label: "Label",
      render: (r) => (
        <div className="space-y-0.5">
          <LevelBadge level={r.level} />
          <div className="whitespace-nowrap text-[11px] text-muted-foreground" title={OVERLAP_KIND_LABEL[r.kind]}>
            {KIND_SHORT[r.kind]}
          </div>
        </div>
      ),
      sortValue: (r) => r.kind,
    },
  ];

  const selectedGeom = selected ? geoms[selected.key] : undefined;

  return (
    <div className="space-y-3">
      {/* Filter: satu baris toolbar (terbungkus di layar sempit) — tabel & peta tidak terdorong jauh ke bawah. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <FilterField label="Tumpang tindih">
          <Select value={pct} onValueChange={(v) => setMany({ persen: v === OVERLAP_PCT_DEFAULT ? null : String(v) })}>
            <SelectTrigger className="h-9 w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OVERLAP_PCT_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {PCT_LABEL[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Jenis">
          <Select value={kind ?? "all"} onValueChange={(v) => setMany({ jenis: v === "all" ? null : String(v) })}>
            <SelectTrigger className="h-9 w-[210px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua jenis</SelectItem>
              {OVERLAP_KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {OVERLAP_KIND_LABEL[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Distrik">
          <FilterCombobox
            options={options.districts}
            value={districtId}
            onSelect={(id) => setMany({ distrik: id })}
            allLabel="Semua Distrik"
            searchPlaceholder="Cari distrik..."
            emptyLabel="Distrik tidak ditemukan."
            widthClass="w-[180px]"
          />
        </FilterField>
        <FilterField label="Lembaga">
          <FilterCombobox
            options={options.groups}
            value={groupId}
            onSelect={(id) => setMany({ lembaga: id })}
            allLabel="Semua Lembaga"
            searchPlaceholder="Cari lembaga petani..."
            emptyLabel="Lembaga Petani tidak ditemukan."
            widthClass="w-[220px]"
          />
        </FilterField>
      </div>

      {/* Chip label = filter: klik untuk menyaring, klik lagi untuk melepas. */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-semibold tabular-nums">{formatNumber(filtered.length)} pasangan</span>
        <span className="text-muted-foreground">·</span>
        <button
          type="button"
          aria-pressed={!level}
          onClick={() => setMany({ label: null })}
          className={cn(
            "rounded-full border bg-background px-2.5 py-0.5 text-xs font-semibold transition-shadow",
            !level ? "ring-2 ring-ring ring-offset-1 ring-offset-background" : "opacity-50 hover:opacity-100"
          )}
        >
          Semua {formatNumber(beforeLevel.length)}
        </button>
        {OVERLAP_LEVELS.map((l) => {
          const active = level === l;
          return (
            <button
              key={l}
              type="button"
              aria-pressed={active}
              title={OVERLAP_LEVEL_HINT[l]}
              onClick={() => setMany({ label: active ? null : l })}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-shadow",
                LEVEL_BADGE[l],
                // Pudar hanya bila label LAIN aktif; saat "Semua", chip label tetap terbaca penuh.
                active ? "ring-2 ring-ring ring-offset-1 ring-offset-background" : level ? "opacity-50 hover:opacity-100" : "hover:shadow"
              )}
            >
              {OVERLAP_LEVEL_LABEL[l]} {formatNumber(counts[l])}
            </button>
          );
        })}
        <span className="text-muted-foreground">· total irisan {formatArea(totalHa)} ha</span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <DataTable
            columns={columns}
            data={filtered}
            rowKey={(r) => r.key}
            searchFn={(r, q) => {
              const s = q.toLowerCase();
              return [r.a, r.b].some(
                (x) =>
                  x.parcelId.toLowerCase().includes(s) ||
                  x.farmerName.toLowerCase().includes(s) ||
                  x.farmerCode.toLowerCase().includes(s)
              );
            }}
            searchPlaceholder="Cari ID lahan / petani..."
            emptyMessage="Tidak ada lahan tumpang tindih pada filter ini."
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
                      <DropdownMenuItem onClick={() => exportSpatial("shp")}>Shapefile (ZIP) — poligon irisan</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportSpatial("geojson")}>GeoJSON — poligon irisan</DropdownMenuItem>
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
                  <span className="flex-1 text-center text-xs tabular-nums text-muted-foreground" title="Tombol panah ↑/↓ juga berpindah pasangan">
                    {formatNumber(position + 1)} / {formatNumber(visibleRows.length)} · ↑/↓
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1"
                    onClick={() => step(1)}
                    disabled={position >= visibleRows.length - 1}
                  >
                    Berikutnya
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {!selected ? (
                <div className="flex h-[420px] flex-col items-center justify-center gap-2 rounded-md border border-dashed text-center text-sm text-muted-foreground">
                  <MousePointerClick className="h-6 w-6" />
                  Tidak ada pasangan untuk ditampilkan.
                </div>
              ) : selectedGeom ? (
                <OverlapPreviewMap a={selectedGeom.a} b={selectedGeom.b} intersection={selectedGeom.intersection} />
              ) : (
                <div className="flex h-[420px] items-center justify-center rounded-md border bg-muted/20 text-sm text-muted-foreground">
                  {loadingKey === selected.key ? <Loader2 className="h-5 w-5 animate-spin" /> : "Geometri belum tersedia."}
                </div>
              )}
              {selected && (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <LevelBadge level={selected.level} />
                    <span className="text-muted-foreground">{OVERLAP_KIND_LABEL[selected.kind]}</span>
                    <span className="ml-auto font-semibold tabular-nums">
                      Irisan {formatArea(selected.intersectionHa)} ha · {pctText(selected.pctMin)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <SideSummary label="A" color={OVERLAP_COLORS.a} s={selected.a} otherPairs={others(selected, "a")} />
                    <SideSummary label="B" color={OVERLAP_COLORS.b} s={selected.b} otherPairs={others(selected, "b")} />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        % dihitung terhadap lahan yang lebih kecil. <b>Duplikat</b> = &gt; {OVERLAP_DUPLICATE_PCT}% dari kedua lahan;{" "}
        <b>Tercakup</b> = lahan kecil &gt; {OVERLAP_DUPLICATE_PCT}% berada di dalam lahan yang lebih besar. Irisan &lt;{" "}
        {OVERLAP_MIN_AREA_M2} m² dan &lt; {OVERLAP_MIN_PCT}% (tepi lahan yang bersinggungan) tidak ditampilkan. Luas
        dihitung dari poligon, bukan dari kolom luas yang tercatat. <b>+N</b> di samping ID lahan = lahan itu juga
        tumpang tindih dengan N lahan lain.
      </p>
    </div>
  );
}
