"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, CheckCircle2, Download, Loader2, MapPin, RefreshCw } from "lucide-react";
import { readSpreadsheetFile } from "@/lib/excel-sheet-reader";
import { readFileAsBase64 } from "@/lib/file-base64";
import { exportToExcel } from "@/lib/xlsx";
import { formatNumber } from "@/lib/format";
import {
  MARKER_UPLOAD_FIELDS,
  MARKER_UPLOAD_TEMPLATE_COLUMNS,
  MARKER_UPLOAD_TEMPLATE_EXAMPLE,
  autoMatchMarkerUploadColumns,
  markerFeaturesToRecords,
  toUploadPayload,
  validateMarkerUploadRows,
  type MarkerUploadFieldKey,
  type MarkerUploadParcelRef,
  type MarkerUploadValidatedRow,
} from "@/lib/land-marker-upload";
import { LAND_MARKER_CONDITION_LABELS, LAND_MARKER_TYPE_LABELS, MARKER_MAX_DISTANCE_M, MARKER_SNAP_M, fmtCoord, labelOf } from "@/lib/land-marker";
import { parseShapefile } from "@/server/actions/bulk-upload-parcel";
import { bulkUpsertLandMarkers, matchLandMarkerUploadParcels } from "@/server/actions/land-marker";

/**
 * Tab "Patok (Excel/CSV/Shapefile titik)" di Upload Massal Lahan (#329).
 * Excel/CSV dan shapefile Point dinormalisasi ke record ber-header yang sama
 * (`markerFeaturesToRecords`), lalu alur 3 langkah seperti Detail Lahan:
 * pemetaan kolom → validasi (pencocokan lahan di server, hanya ID yang ada di
 * berkas) → simpan per baris (server: snap ≤ 5 m, guard ≤ 100 m).
 */
interface Props {
  permissions: string[];
}

const MAX_ROWS = 20_000;

export function ParcelMarkerUploadClient({ permissions }: Props) {
  const router = useRouter();
  const canCreate = permissions.includes("CREATE");
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [rowNumbers, setRowNumbers] = useState<number[]>([]);
  const [skipped, setSkipped] = useState<{ index: number; reason: string }[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<MarkerUploadFieldKey, string>>>({});
  const [validated, setValidated] = useState<MarkerUploadValidatedRow[]>([]);
  const [reading, setReading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ created: number; updated: number; linked: number; rejected: { landParcelId: string; parcelId: string | null; sequenceNo: number | null; reason: string }[] } | null>(null);

  const valid = useMemo(() => validated.filter((r) => r.row), [validated]);
  const invalid = validated.length - valid.length;
  const parcelCount = new Set(valid.map((r) => r.landParcelId)).size;

  function reset() {
    setFileName(null);
    setHeaders([]);
    setRecords([]);
    setRowNumbers([]);
    setSkipped([]);
    setMapping({});
    setValidated([]);
    setResult(null);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    e.target.value = "";
    if (!selected) return;
    reset();
    setFileName(selected.name);
    setReading(true);
    try {
      const ext = selected.name.split(".").pop()?.toLowerCase();
      if (ext === "zip") {
        const res = await parseShapefile(await readFileAsBase64(selected));
        if (!res.success || !res.features) {
          toast.error(res.error || "Gagal mengurai shapefile");
          return;
        }
        const out = markerFeaturesToRecords(res.features.map((f) => ({ index: f.index, properties: f.properties as Record<string, unknown>, geometry: f.geometry as { type?: string; coordinates?: unknown } | null })));
        if (out.records.length === 0) {
          toast.error("Shapefile tidak mengandung fitur titik");
          return;
        }
        const hdrs = [...new Set(out.records.flatMap((r) => Object.keys(r)))];
        setHeaders(hdrs);
        setRecords(out.records);
        setRowNumbers(out.rowNumbers);
        setSkipped(out.skipped);
        setMapping(autoMatchMarkerUploadColumns(hdrs));
        toast.success(`${formatNumber(out.records.length)} titik terbaca dari shapefile`);
      } else {
        const sheet = await readSpreadsheetFile(selected, {
          isHeaderCandidate: (labels) => Object.keys(autoMatchMarkerUploadColumns(labels)).length > 0,
        });
        if (sheet.headers.length === 0) {
          toast.error("Tidak menemukan baris header pada berkas ini");
          return;
        }
        if (sheet.rows.length > MAX_ROWS) {
          toast.error(`Maksimal ${formatNumber(MAX_ROWS)} baris per berkas`);
          return;
        }
        if (sheet.headerRowNumber > 1) toast.info(`Header ditemukan di baris ${sheet.headerRowNumber}`);
        setHeaders(sheet.headers);
        setRecords(sheet.rows);
        setRowNumbers(sheet.rowNumbers);
        setMapping(autoMatchMarkerUploadColumns(sheet.headers));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membaca berkas");
    } finally {
      setReading(false);
    }
  }

  async function handleValidate() {
    const missing = MARKER_UPLOAD_FIELDS.filter((f) => f.required && !mapping[f.key]);
    if (missing.length) {
      toast.error(`Kolom wajib belum dipetakan: ${missing.map((f) => f.label).join(", ")}`);
      return;
    }
    setValidating(true);
    setResult(null);
    try {
      const col = mapping.parcelId!;
      const ids = [...new Set(records.map((r) => String(r[col] ?? "").trim()).filter(Boolean))];
      const match = await matchLandMarkerUploadParcels(ids);
      const parcelsById = new Map<string, MarkerUploadParcelRef[]>();
      for (const p of match.parcels) parcelsById.set(p.parcelId, [...(parcelsById.get(p.parcelId) ?? []), p]);
      const rows = validateMarkerUploadRows(records, mapping, {
        parcelsById,
        globalCounts: new Map(match.globalCounts.map((g) => [g.parcelId, g.count])),
      }, rowNumbers);
      setValidated(rows);
      const ok = rows.filter((r) => r.row).length;
      if (ok === 0) toast.error("Tidak ada baris valid — periksa kolom error");
      else toast.success(`${formatNumber(ok)} baris valid${rows.length - ok ? `, ${formatNumber(rows.length - ok)} bermasalah` : ""}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memvalidasi");
    } finally {
      setValidating(false);
    }
  }

  async function handleSave() {
    if (valid.length === 0) return;
    setSaving(true);
    try {
      const res = await bulkUpsertLandMarkers(toUploadPayload(valid));
      if (!res.success || !res.data) {
        toast.error(res.success ? "Gagal menyimpan" : res.error);
        return;
      }
      setResult(res.data);
      toast.success(`Patok tersimpan: ${formatNumber(res.data.created)} baru · ${formatNumber(res.data.updated)} diperbarui · ${formatNumber(res.data.linked)} ditautkan`);
      setValidated([]);
      router.refresh();
    } catch (err) {
      toast.error((err instanceof Error && err.message) || "Gagal menyimpan — periksa koneksi lalu coba lagi");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadTemplate() {
    await exportToExcel({
      filename: "Template_Patok_Lahan",
      sheetName: "Data",
      columns: MARKER_UPLOAD_TEMPLATE_COLUMNS,
      data: [MARKER_UPLOAD_TEMPLATE_EXAMPLE],
    });
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <Label htmlFor="marker-file">Berkas titik patok — Excel (.xlsx), CSV, atau ZIP Shapefile Point</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Kolom: <span className="font-mono">ID Lahan</span> (wajib), <span className="font-mono">Lintang</span>, <span className="font-mono">Bujur</span> (wajib — dari geometri bila shapefile),
              <span className="font-mono"> No Patok</span>, <span className="font-mono">ID Petani</span> (bila ID Lahan dipakai &gt;1 petani), Kondisi, Bahan, Tanggal Pemasangan, Dipasang oleh, Keterangan.
              Nomor patok yang sudah ada di lahan diperbarui koordinatnya; nomor baru/kosong menjadi patok baru — titik ≤ {MARKER_SNAP_M} m dari patok lahan tetangga ditautkan ke patok itu. Titik &gt; {MARKER_MAX_DISTANCE_M} m dari batas lahan ditolak.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="text-xs h-8 gap-1.5">
            <Download className="h-3.5 w-3.5" /> Unduh Template Excel
          </Button>
        </div>
        <Input id="marker-file" type="file" accept=".xlsx,.csv,.zip" onChange={handleFileChange} className="max-w-md" disabled={reading || saving} />
        {reading && (
          <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Membaca berkas…</p>
        )}
        {skipped.length > 0 && (
          <p className="text-sm text-muted-foreground flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            {formatNumber(skipped.length)} fitur dilewati: {skipped[0].reason}{skipped.length > 1 && " (dan lainnya)"}
          </p>
        )}
      </Card>

      {headers.length > 0 && (
        <Card className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Pemetaan kolom — {fileName} ({formatNumber(records.length)} baris)
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reset} disabled={saving}><RefreshCw className="h-4 w-4 mr-2" /> Reset</Button>
              <Button size="sm" onClick={handleValidate} disabled={validating || saving}>
                {validating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />} Validasi
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {MARKER_UPLOAD_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5 border p-3 rounded-lg bg-card/50">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-sm">{f.label} {f.required && <span className="text-red-500">*</span>}</Label>
                  <Badge variant={f.required ? "default" : "outline"} className="text-[10px]">{f.required ? "Wajib" : "Opsional"}</Badge>
                </div>
                <Select
                  value={mapping[f.key] || "_empty"}
                  onValueChange={(val) => {
                    setMapping((prev) => ({ ...prev, [f.key]: !val || val === "_empty" ? "" : val }));
                    setValidated([]);
                  }}
                >
                  <SelectTrigger className="w-full h-9">
                    <SelectValue>{(v: string) => (!v || v === "_empty" ? "-- Kosongkan --" : v)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_empty">-- Kosongkan --</SelectItem>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </Card>
      )}

      {validated.length > 0 && (
        <Card className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              Pratinjau — {formatNumber(valid.length)} valid pada {formatNumber(parcelCount)} lahan{invalid > 0 && <span className="text-destructive normal-case font-normal">· {formatNumber(invalid)} bermasalah (dilewati)</span>}
            </h3>
            {canCreate && (
              <Button size="sm" onClick={handleSave} disabled={saving || valid.length === 0}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Simpan {formatNumber(valid.length)} patok
              </Button>
            )}
          </div>
          <div className="overflow-x-auto max-h-[480px] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-14">Baris</TableHead>
                  <TableHead>ID Lahan</TableHead>
                  <TableHead>Petani</TableHead>
                  <TableHead className="text-right">No</TableHead>
                  <TableHead>Koordinat</TableHead>
                  <TableHead>Kondisi · Bahan</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validated.map((r) => (
                  <TableRow key={r.rowNumber} className={r.errors.length ? "bg-destructive/5" : undefined}>
                    <TableCell className="text-muted-foreground tabular-nums">{r.rowNumber}</TableCell>
                    <TableCell className="font-mono text-xs">{r.parcelId || "—"}</TableCell>
                    <TableCell className="text-xs">{r.farmerName ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.row?.sequenceNo ?? <span className="text-muted-foreground">baru</span>}</TableCell>
                    <TableCell className="font-mono text-xs">{r.row ? `${fmtCoord(r.row.latitude)}, ${fmtCoord(r.row.longitude)}` : "—"}</TableCell>
                    <TableCell className="text-xs">
                      {r.row ? [r.row.condition ? labelOf(LAND_MARKER_CONDITION_LABELS, r.row.condition) : null, r.row.type ? labelOf(LAND_MARKER_TYPE_LABELS, r.row.type) : null].filter(Boolean).join(" · ") || "—" : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {r.errors.length ? (
                        <span className="text-destructive">{r.errors.join("; ")}</span>
                      ) : r.action === "update" ? (
                        <Badge variant="secondary">Perbarui patok #{r.row?.sequenceNo}</Badge>
                      ) : (
                        <Badge variant="default">Patok baru</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {result && (
        <Card className="p-6 space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Hasil simpan</h3>
          <p className="text-sm">
            {formatNumber(result.created)} patok baru · {formatNumber(result.updated)} diperbarui · {formatNumber(result.linked)} ditautkan ke patok lahan tetangga
            {result.rejected.length > 0 && <span className="text-destructive"> · {formatNumber(result.rejected.length)} ditolak server</span>}
          </p>
          {result.rejected.length > 0 && (
            <ul className="text-xs text-destructive list-disc pl-5 space-y-0.5 max-h-48 overflow-auto">
              {result.rejected.map((x, i) => (
                <li key={i}><span className="font-mono">{x.parcelId ?? x.landParcelId}</span> {x.sequenceNo != null ? `patok #${x.sequenceNo}` : "patok baru"} — {x.reason}</li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
