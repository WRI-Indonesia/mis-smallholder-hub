"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Download, Landmark, Loader2, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterCombobox, type FilterComboOption } from "@/components/shared/filter-combobox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFarmerGroupsForMarkerReport } from "@/server/actions/report";
import { getMarkerReportRows, type LandMarkerExportRow } from "@/server/actions/land-marker";
import { LAND_MARKER_CONDITIONS, LAND_MARKER_CONDITION_LABELS, LAND_MARKER_TYPE_LABELS, fmtCoord, labelOf, uniqueMarkerRows } from "@/lib/land-marker";
import { exportMarkerRow, type LegendFormat } from "@/app/(admin)/admin/map/parcel/map-legend-export";
import { formatNumber } from "@/lib/format";

/**
 * Report › Patok (#331). Data dimuat setelah Distrik dipilih (wajib, pola Peta
 * Lahan); tabel = satu baris per patok fisik (`uniqueMarkerRows`: lahan
 * pemakai satu per baris, urut KT → Blok); filter kondisi & NKT di klien.
 * Unduhan memakai `exportMarkerRow` (Excel/SHP/GeoJSON/KML/PDF) yang sama
 * dengan baris legenda Peta Lahan — action `getMarkerReportRows` digate
 * `report-marker` (VIEW untuk layar, EXPORT untuk unduhan).
 */
interface Props {
  districts: FilterComboOption[];
  canExport: boolean;
  canPrint: boolean;
}

const CONDITION_TONE: Record<string, string> = {
  PRESENT: "bg-emerald-600 hover:bg-emerald-600",
  MISSING: "bg-red-600 hover:bg-red-600",
  DAMAGED: "bg-amber-500 hover:bg-amber-500",
  NOT_INSTALLED: "",
};

export function MarkerReportClient({ districts, canExport, canPrint }: Props) {
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [farmerGroupId, setFarmerGroupId] = useState<string | null>(null);
  const [groups, setGroups] = useState<FilterComboOption[]>([]);
  const [rows, setRows] = useState<LandMarkerExportRow[] | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [condition, setCondition] = useState<string>("all");
  const [nkt, setNkt] = useState<string>("all");
  const [isPending, startTransition] = useTransition();
  const [exporting, setExporting] = useState<LegendFormat | null>(null);

  useEffect(() => {
    if (!districtId) { setGroups([]); return; }
    getFarmerGroupsForMarkerReport(districtId).then((g) => setGroups(g.map((x) => ({ id: x.id, name: x.name, code: x.code })))).catch(() => setGroups([]));
  }, [districtId]);

  const load = () => {
    if (!districtId) { toast.error("Pilih Distrik terlebih dahulu"); return; }
    startTransition(async () => {
      const res = await getMarkerReportRows({ districtId, farmerGroupId });
      if (!res.success || !res.data) { toast.error(res.success ? "Gagal memuat" : res.error); return; }
      setRows(res.data.rows);
      setLabel(res.data.label);
      if (res.data.rows.length === 0) toast.info("Tidak ada patok pada filter ini");
    });
  };

  const unique = useMemo(() => (rows ? uniqueMarkerRows(rows) : []), [rows]);
  const filtered = useMemo(
    () => unique.filter((r) => (condition === "all" || r.condition === condition) && (nkt === "all" || (nkt === "nkt" ? r.nkt : !r.nkt))),
    [unique, condition, nkt],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { PRESENT: 0, MISSING: 0, DAMAGED: 0, NOT_INSTALLED: 0 };
    for (const r of unique) c[r.condition] = (c[r.condition] ?? 0) + 1;
    return c;
  }, [unique]);
  const nktCount = unique.filter((r) => r.nkt).length;

  const handleExport = async (format: LegendFormat) => {
    if (!rows || !districtId || exporting) return;
    if (format === "pdf" && !canPrint) return;
    if (format !== "pdf" && !canExport) return;
    setExporting(format);
    try {
      // Server memeriksa ulang izin EXPORT (bukan sekadar VIEW) sebelum baris dikirim untuk berkas.
      const res = await getMarkerReportRows({ districtId, farmerGroupId }, format === "pdf" ? "view" : "export");
      if (!res.success || !res.data) { toast.error(res.success ? "Gagal menyiapkan data" : res.error); return; }
      // Saring baris sesuai filter layar (kondisi/NKT) supaya berkas = tabel.
      const keep = new Set(filtered.map((r) => r.markerId));
      const subset = res.data.rows.filter((r) => keep.has(r.markerId));
      const n = await exportMarkerRow(nkt === "nkt" ? "markersNkt" : "markers", format, subset, res.data.label, new Date());
      if (n === 0) toast.info("Tidak ada patok untuk diunduh");
      else toast.success(`${formatNumber(n)} patok diunduh`);
    } catch {
      toast.error("Gagal membuat berkas");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-sm print:hidden">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Distrik <span className="text-red-500">*</span></label>
            <FilterCombobox options={districts} value={districtId} onSelect={(id) => { setDistrictId(id); setFarmerGroupId(null); setRows(null); }} placeholder="Pilih Distrik" searchPlaceholder="Cari distrik…" emptyLabel="Distrik tidak ditemukan" widthClass="w-[220px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">Lembaga Petani</label>
            <FilterCombobox options={groups} value={farmerGroupId} onSelect={(id) => { setFarmerGroupId(id); setRows(null); }} allLabel="Semua Lembaga Petani" searchPlaceholder="Cari lembaga…" emptyLabel="Lembaga tidak ditemukan" widthClass="w-[260px]" disabled={!districtId} />
          </div>
          <Button onClick={load} disabled={!districtId || isPending} className="h-9">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Landmark className="mr-2 h-4 w-4" />} Muat Data
          </Button>
          {rows && (
            <>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Kondisi</label>
                <Select value={condition} onValueChange={(v) => setCondition(v ?? "all")}>
                  <SelectTrigger className="h-9 w-[180px]"><SelectValue>{(v: string) => (v === "all" ? "Semua kondisi" : labelOf(LAND_MARKER_CONDITION_LABELS, v))}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua kondisi</SelectItem>
                    {LAND_MARKER_CONDITIONS.map((c) => (<SelectItem key={c} value={c}>{LAND_MARKER_CONDITION_LABELS[c]}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">NKT</label>
                <Select value={nkt} onValueChange={(v) => setNkt(v ?? "all")}>
                  <SelectTrigger className="h-9 w-[170px]"><SelectValue>{(v: string) => (v === "nkt" ? "Patok lahan NKT" : v === "non" ? "Bukan NKT" : "Semua")}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="nkt">Patok lahan NKT</SelectItem>
                    <SelectItem value="non">Bukan NKT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(canExport || canPrint) && (
                <DropdownMenu>
                  <DropdownMenuTrigger disabled={!!exporting || filtered.length === 0} className="ml-auto flex h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent disabled:opacity-50 disabled:pointer-events-none">
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Unduh
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {canExport && (
                      <>
                        <DropdownMenuItem onClick={() => handleExport("xlsx")}>Excel</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport("shp")}>Shapefile (ZIP) <span className="ml-auto text-[10px] text-muted-foreground">Point</span></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport("geojson")}>GeoJSON <span className="ml-auto text-[10px] text-muted-foreground">Point</span></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport("kml")}>KML <span className="ml-auto text-[10px] text-muted-foreground">Point</span></DropdownMenuItem>
                      </>
                    )}
                    {canExport && canPrint && <DropdownMenuSeparator />}
                    {canPrint && (
                      <DropdownMenuItem onClick={() => handleExport("pdf")}><Printer className="mr-2 h-4 w-4" /> PDF <span className="ml-auto text-[10px] text-muted-foreground">peta + tabel</span></DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {rows && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            {[
              { label: "Patok", value: unique.length, note: `${formatNumber(rows.length)} tautan lahan · ${label ?? ""}` },
              { label: "Ada (terpasang)", value: counts.PRESENT, note: unique.length ? `${Math.round((counts.PRESENT / unique.length) * 100)}% dari patok` : "—" },
              { label: "Hilang", value: counts.MISSING, note: "perlu dipasang ulang" },
              { label: "Rusak", value: counts.DAMAGED, note: "perlu diperbaiki" },
              { label: "Belum dipasang", value: counts.NOT_INSTALLED, note: "koordinat dari poligon/GPS, fisik belum ada" },
              { label: "Patok lahan NKT", value: nktCount, note: "lahan pemakai termasuk/terdampak NKT" },
            ].map((c) => (
              <Card key={c.label} className="shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{c.label}</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold tabular-nums">{formatNumber(c.value)}</p><p className="text-xs text-muted-foreground">{c.note}</p></CardContent>
              </Card>
            ))}
          </div>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Daftar Patok ({formatNumber(filtered.length)}{filtered.length !== unique.length ? ` dari ${formatNumber(unique.length)}` : ""})
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Kode</th>
                    <th className="px-3 py-2">KT / Blok</th>
                    <th className="px-3 py-2">Lahan (Nama Petani · ID Petani · ID Lahan #no)</th>
                    <th className="px-3 py-2">Kondisi</th>
                    <th className="px-3 py-2">Jenis</th>
                    <th className="px-3 py-2">NKT</th>
                    <th className="px-3 py-2 text-right">Lintang, Bujur</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.markerId} className="border-t align-top">
                      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{r.code}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{[r.subGroupLv2, r.blok].filter(Boolean).join(" / ") || "—"}</td>
                      <td className="px-3 py-2 text-xs whitespace-pre-line">{r.lahan}</td>
                      <td className="px-3 py-2"><Badge variant={r.condition === "NOT_INSTALLED" ? "outline" : "default"} className={cn(CONDITION_TONE[r.condition])}>{labelOf(LAND_MARKER_CONDITION_LABELS, r.condition)}</Badge></td>
                      <td className="px-3 py-2 whitespace-nowrap">{labelOf(LAND_MARKER_TYPE_LABELS, r.type)}</td>
                      <td className="px-3 py-2">{r.nkt ? <Badge className="bg-red-600 hover:bg-red-600">NKT</Badge> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs whitespace-nowrap">{fmtCoord(r.latitude)}, {fmtCoord(r.longitude)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-muted-foreground">Tidak ada patok yang cocok dengan filter.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
