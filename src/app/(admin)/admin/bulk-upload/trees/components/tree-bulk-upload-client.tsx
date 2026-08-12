"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, TreePine } from "lucide-react";
import {
  parseTreeShapefile,
  matchTreeUploadParcels,
  bulkCreateTrees,
} from "@/server/actions/bulk-upload-tree";
import type { TreeUploadParcel } from "@/server/actions/bulk-upload-tree";
import {
  groupTreeFeatures,
  treeDensity,
  type TreeGroupInput,
  type SkippedTreeFeature,
} from "@/lib/tree-upload";
import { MAX_TREE_ROWS_PER_PARCEL } from "@/validations/tree.schema";
import { readFileAsBase64 } from "@/lib/file-base64";
import { formatNumber, formatArea } from "@/lib/format";

interface Props {
  permissions: string[];
}

/** Grup per lahan hasil parse + status pencocokan ke lahan di database. */
interface PreviewGroup {
  group: TreeGroupInput;
  parcel: TreeUploadParcel | null;
  density: number | null;
  /** parcelId terdaftar >1 petani secara GLOBAL (cek server) — tak bisa dicocokkan. */
  ambiguous: boolean;
  /** Melebihi batas titik per lahan (cek dini; server juga menolak via zod). */
  tooManyRows: boolean;
}

export function TreeBulkUploadClient({ permissions }: Props) {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [previews, setPreviews] = useState<PreviewGroup[]>([]);
  const [skipped, setSkipped] = useState<SkippedTreeFeature[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canCreate = permissions.includes("CREATE");

  const validPreviews = previews.filter(
    (p) => p.parcel != null && !p.ambiguous && !p.tooManyRows,
  );
  const totalTrees = validPreviews.reduce((sum, p) => sum + p.group.rows.length, 0);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    // Kosongkan value agar memilih berkas yang sama memicu onChange lagi
    // (mis. setelah Reset atau re-export dengan nama sama).
    e.target.value = "";
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".zip")) {
      toast.error("Hanya mendukung berkas ZIP Shapefile (.zip)");
      return;
    }

    setFileName(selectedFile.name);
    setPreviews([]);
    setSkipped([]);
    setIsProcessing(true);

    try {
      const base64 = await readFileAsBase64(selectedFile);
      const res = await parseTreeShapefile(base64);

      if (!res.success || !res.features) {
        toast.error(res.error || "Gagal mengurai file shapefile");
        return;
      }
      if (res.features.length === 0) {
        toast.error("Shapefile tidak mengandung fitur titik");
        return;
      }

      const { groups, skipped: skippedRows } = groupTreeFeatures(res.features);
      setSkipped(skippedRows);
      if (groups.length === 0) {
        toast.error(
          "Tidak ada titik valid — pastikan shapefile bertipe Point dengan atribut parcel_id",
        );
        return;
      }

      // Pencocokan server-side hanya untuk parcel_id yang ada di file (#241)
      // — termasuk cek ambiguitas GLOBAL (paritas penolakan saat simpan).
      const match = await matchTreeUploadParcels(groups.map((g) => g.parcelId));
      const parcelByBusinessId = new Map(match.parcels.map((p) => [p.parcelId, p]));
      const ambiguousIds = new Set(match.ambiguousParcelIds);

      setPreviews(
        groups.map((group) => {
          const ambiguous = ambiguousIds.has(group.parcelId);
          const parcel = ambiguous ? null : (parcelByBusinessId.get(group.parcelId) ?? null);
          return {
            group,
            parcel,
            density: parcel ? treeDensity(group.rows.length, parcel.area) : null,
            ambiguous,
            tooManyRows: group.rows.length > MAX_TREE_ROWS_PER_PARCEL,
          };
        }),
      );
      toast.success(
        `Berhasil mengurai shapefile: ${formatNumber(
          groups.reduce((s, g) => s + g.rows.length, 0),
        )} titik pohon pada ${formatNumber(groups.length)} lahan`,
      );
    } catch (err) {
      toast.error((err instanceof Error && err.message) || "Gagal membaca berkas ZIP");
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleSave() {
    if (validPreviews.length === 0) return;
    setIsSaving(true);
    try {
      const res = await bulkCreateTrees({
        sourceFile: fileName,
        groups: validPreviews.map((p) => p.group),
      });
      if (res.success && res.data) {
        toast.success(
          `Tersimpan: ${formatNumber(res.data.trees)} pohon pada ${formatNumber(
            res.data.parcels,
          )} lahan`,
        );
        setPreviews([]);
        setSkipped([]);
        setFileName(null);
        router.refresh();
      } else {
        toast.error(res.success ? "Gagal menyimpan data" : res.error);
      }
    } catch (err) {
      // Payload terlalu besar / koneksi putus / sesi habis — jangan diam:
      // tanpa toast, user tak tahu simpan gagal dan bisa upload dobel.
      toast.error(
        (err instanceof Error && err.message) || "Gagal menyimpan — periksa koneksi lalu coba lagi",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Step 1: pilih berkas */}
      <Card className="p-6">
        <div className="space-y-3">
          <Label htmlFor="tree-zip">Berkas ZIP Shapefile Titik Pohon</Label>
          <Input
            id="tree-zip"
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            disabled={isProcessing || isSaving}
          />
          <p className="text-xs text-muted-foreground">
            Atribut yang dibaca: <span className="font-mono">parcel_id</span> (wajib, dicocokkan ke
            ID Lahan),{" "}
            <span className="font-mono">tree_id, no, lon/lat, category, vigor, source, model_ver</span>{" "}
            (opsional). Koordinat diambil dari geometri titik (WGS84). Upload ulang untuk lahan yang
            sama akan menggantikan seluruh set pohon lahan tersebut (revisi — set lama tetap
            tersimpan nonaktif).
          </p>
          {isProcessing && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Mengurai shapefile…
            </p>
          )}
        </div>
      </Card>

      {/* Step 2: preview per lahan */}
      {previews.length > 0 && (
        <Card className="p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <TreePine className="h-4 w-4 text-primary" />
              Pratinjau ({formatNumber(previews.length)} lahan)
            </h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPreviews([]);
                  setSkipped([]);
                  setFileName(null);
                }}
                disabled={isSaving}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              {canCreate && (
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving || validPreviews.length === 0}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Simpan {formatNumber(totalTrees)} Pohon ({formatNumber(validPreviews.length)}{" "}
                  lahan)
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID Lahan (parcel_id)</TableHead>
                  <TableHead>Petani</TableHead>
                  <TableHead className="text-right">Titik Pohon</TableHead>
                  <TableHead className="text-right">Luas (Ha)</TableHead>
                  <TableHead className="text-right">Kerapatan (pohon/ha)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previews.map((p) => (
                  <TableRow key={p.group.parcelId}>
                    <TableCell className="font-mono">{p.group.parcelId}</TableCell>
                    <TableCell>{p.parcel?.farmerName ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(p.group.rows.length)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.parcel?.area != null ? formatArea(p.parcel.area) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.density != null ? formatArea(p.density) : "—"}
                    </TableCell>
                    <TableCell>
                      {p.tooManyRows ? (
                        <Badge variant="destructive">
                          Melebihi batas {formatNumber(MAX_TREE_ROWS_PER_PARCEL)} titik per lahan
                        </Badge>
                      ) : p.ambiguous ? (
                        <Badge variant="destructive">ID Lahan ganda (lintas petani)</Badge>
                      ) : p.parcel == null ? (
                        <Badge variant="destructive">Lahan tidak ditemukan</Badge>
                      ) : p.parcel.activeTreeCount > 0 ? (
                        <Badge variant="secondary">
                          Revisi (ganti {formatNumber(p.parcel.activeTreeCount)} pohon lama)
                        </Badge>
                      ) : (
                        <Badge variant="default">Baru</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {previews.some((p) => p.parcel == null || p.tooManyRows) && (
            <p className="text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              Baris berstatus merah dilewati saat menyimpan — pastikan ID Lahan terdaftar (dan
              aktif) di Master Data Lahan dan dalam scope akses Anda; ID yang dipakai lebih dari
              satu petani tidak bisa dicocokkan otomatis; lahan dengan lebih dari{" "}
              {formatNumber(MAX_TREE_ROWS_PER_PARCEL)} titik harus dipecah menjadi beberapa berkas.
            </p>
          )}

          {skipped.length > 0 && (
            <p className="text-sm text-muted-foreground flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {formatNumber(skipped.length)} titik dilewati: {skipped[0].reason}
              {skipped.length > 1 && " (dan lainnya)"}
            </p>
          )}
        </Card>
      )}
    </div>
  );
}
