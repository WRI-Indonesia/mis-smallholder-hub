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
import { parseTreeShapefile, bulkCreateTrees } from "@/server/actions/bulk-upload-tree";
import type { TreeUploadParcel } from "@/server/actions/bulk-upload-tree";
import {
  groupTreeFeatures,
  treeDensity,
  type TreeGroupInput,
  type SkippedTreeFeature,
} from "@/lib/tree-upload";

interface Props {
  parcels: TreeUploadParcel[];
  permissions: string[];
}

/** Grup per lahan hasil parse + status pencocokan ke lahan di database. */
interface PreviewGroup {
  group: TreeGroupInput;
  parcel: TreeUploadParcel | null;
  density: number | null;
}

const formatNumber = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const formatDecimal = (n: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export function TreeBulkUploadClient({ parcels, permissions }: Props) {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [previews, setPreviews] = useState<PreviewGroup[]>([]);
  const [skipped, setSkipped] = useState<SkippedTreeFeature[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canCreate = permissions.includes("CREATE");
  const parcelByBusinessId = new Map(parcels.map((p) => [p.parcelId, p]));

  const validPreviews = previews.filter((p) => p.parcel != null);
  const totalTrees = validPreviews.reduce((sum, p) => sum + p.group.rows.length, 0);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".zip")) {
      toast.error("Hanya mendukung berkas ZIP Shapefile (.zip)");
      return;
    }

    setFileName(selectedFile.name);
    setPreviews([]);
    setSkipped([]);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.readAsDataURL(selectedFile);
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const res = await parseTreeShapefile(base64);
        setIsProcessing(false);

        if (!res.success || !res.features) {
          toast.error(res.error || "Gagal mengurai file shapefile");
          return;
        }
        if (res.features.length === 0) {
          toast.error("Shapefile tidak mengandung fitur titik");
          return;
        }

        const { groups, skipped: skippedRows } = groupTreeFeatures(res.features);
        if (groups.length === 0) {
          toast.error(
            "Tidak ada titik valid — pastikan shapefile bertipe Point dengan atribut parcel_id",
          );
          setSkipped(skippedRows);
          return;
        }

        setSkipped(skippedRows);
        setPreviews(
          groups.map((group) => {
            const parcel = parcelByBusinessId.get(group.parcelId) ?? null;
            return {
              group,
              parcel,
              density: parcel ? treeDensity(group.rows.length, parcel.area) : null,
            };
          }),
        );
        toast.success(
          `Berhasil mengurai shapefile: ${formatNumber(
            groups.reduce((s, g) => s + g.rows.length, 0),
          )} titik pohon pada ${formatNumber(groups.length)} lahan`,
        );
      } catch (err) {
        setIsProcessing(false);
        toast.error((err instanceof Error && err.message) || "Gagal membaca berkas ZIP");
      }
    };
    reader.onerror = () => {
      setIsProcessing(false);
      toast.error("Gagal membaca berkas");
    };
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
                      {p.parcel?.area != null ? formatDecimal(p.parcel.area) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.density != null ? formatDecimal(p.density) : "—"}
                    </TableCell>
                    <TableCell>
                      {p.parcel == null ? (
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

          {previews.some((p) => p.parcel == null) && (
            <p className="text-sm text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              Lahan dengan status &quot;tidak ditemukan&quot; dilewati saat menyimpan — pastikan ID
              Lahan sudah terdaftar (dan aktif) di Master Data Lahan, atau ada dalam scope akses
              Anda.
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
