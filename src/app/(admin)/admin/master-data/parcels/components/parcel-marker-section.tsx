"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Geometry } from "geojson";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Download, Link2Off, Loader2, MapPin, Pencil, Plus, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { ParcelMapView } from "./parcel-map-view";
import { ParcelMarkerFormModal } from "./parcel-marker-form-modal";
import { ParcelNeighborList } from "./parcel-neighbor-list";
import {
  createMarkersFromPolygon,
  previewMarkersFromPolygon,
  renumberLandMarkers,
  unlinkLandMarker,
} from "@/server/actions/land-marker";
import {
  LAND_MARKER_CONDITION_LABELS,
  LAND_MARKER_SOURCE_LABELS,
  LAND_MARKER_TYPE_LABELS,
  MARKER_SNAP_M,
  fmtCoord,
  labelOf,
  type MarkerCandidate,
} from "@/lib/land-marker";
import { exportToExcel } from "@/lib/xlsx";
import type { LandMarkerItem, LandParcelMarkers } from "@/types/land-parcel";
import { NEIGHBOR_DISTANCE_M, type ParcelNeighbor } from "@/lib/parcel-neighbor";

/**
 * Tab Patok di Detail Lahan (#329): peta (persegi bernomor) + tabel + tombol
 * generate-dari-poligon (pratinjau bercentang), tambah manual, unduh koordinat,
 * urutkan ulang. Nomor patok = urutan tabel = nomor di peta & Profil Lahan PDF.
 */
interface Props {
  landParcelId: string;
  parcelId: string;
  geometry: Geometry | null;
  data: LandParcelMarkers;
  /** Lahan tetangga ≤ 25 m (#327) — patok bersama hampir selalu milik tetangga ini; ditampilkan di peta + daftar. */
  neighbors: ParcelNeighbor[];
  neighborsOmitted: number;
  permissions: string[];
  /** Nama petani & Lembaga untuk berkas ekspor. */
  farmerName: string;
  farmerCode: string;
  groupName: string;
}

const CONDITION_TONE: Record<string, string> = {
  PRESENT: "bg-emerald-600 hover:bg-emerald-600",
  MISSING: "bg-red-600 hover:bg-red-600",
  DAMAGED: "bg-amber-500 hover:bg-amber-500",
  NOT_INSTALLED: "",
};

export function ParcelMarkerSection({ landParcelId, parcelId, geometry, data, neighbors, neighborsOmitted, permissions, farmerName, farmerCode, groupName }: Props) {
  const router = useRouter();
  const canCreate = permissions.includes("CREATE");
  const canEdit = permissions.includes("EDIT");
  const canDelete = permissions.includes("DELETE");
  // Unduh Excel = izin EXPORT (docs/standards/rbac.md) — bukan VIEW.
  const canExport = permissions.includes("EXPORT");
  const [formTarget, setFormTarget] = useState<{ item: LandMarkerItem | null } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<LandMarkerItem | null>(null);
  const [preview, setPreview] = useState<{ candidates: MarkerCandidate[]; keep: Set<number> } | null>(null);
  const [busy, setBusy] = useState(false);
  const [reordering, setReordering] = useState(false);

  const markers = data.markers;
  const points = markers.map((m) => ({ id: m.id, sequenceNo: m.sequenceNo, longitude: m.longitude, latitude: m.latitude, nkt: m.nkt }));

  // Semua pemanggil action: try/finally supaya tombol tidak terkunci bila action
  // melempar (sesi habis, jaringan) — bukan hanya bila mengembalikan success:false.
  async function openPreview() {
    setBusy(true);
    try {
      const res = await previewMarkersFromPolygon(landParcelId);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      const candidates = res.data!;
      setPreview({ candidates, keep: new Set(candidates.filter((c) => !c.alreadyLinked).map((c) => c.sequenceNo)) });
    } catch {
      toast.error("Gagal memuat pratinjau — periksa koneksi lalu coba lagi");
    } finally {
      setBusy(false);
    }
  }

  async function confirmPreview() {
    if (!preview) return;
    setBusy(true);
    try {
      const res = await createMarkersFromPolygon({ landParcelId, keepSequenceNos: [...preview.keep] });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      const s = res.data!;
      toast.success(`Patok dibuat: ${s.created} baru · ${s.linked} ditautkan ke patok lahan lain · ${s.skipped} sudah ada`);
      setPreview(null);
      router.refresh();
    } catch {
      toast.error("Gagal menyimpan — periksa koneksi lalu coba lagi");
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, dir: -1 | 1) {
    const order = markers.map((m) => m.id);
    const j = index + dir;
    if (j < 0 || j >= order.length) return;
    [order[index], order[j]] = [order[j], order[index]];
    setReordering(true);
    try {
      const res = await renumberLandMarkers({ landParcelId, order });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    } catch {
      toast.error("Gagal mengurutkan ulang — periksa koneksi lalu coba lagi");
    } finally {
      setReordering(false);
    }
  }

  async function downloadCoordinates() {
    await exportToExcel({
      filename: `Patok_${parcelId.replace(/[^A-Za-z0-9.-]/g, "_")}`,
      columns: [
        { header: "No Patok", key: "no", width: 10 },
        { header: "Kode Patok", key: "code", width: 18 },
        { header: "ID Lahan", key: "parcelId", width: 30 },
        { header: "ID Petani", key: "farmerCode", width: 26 },
        { header: "Nama Petani", key: "farmerName", width: 26 },
        { header: "Lembaga Petani", key: "groupName", width: 26 },
        { header: "Lintang", key: "lat", width: 14 },
        { header: "Bujur", key: "lon", width: 14 },
        { header: "Kondisi", key: "condition", width: 16 },
        { header: "Jenis", key: "type", width: 12 },
        { header: "Dipasang", key: "installedAt", width: 12 },
        { header: "Sumber koordinat", key: "source", width: 16 },
        { header: "NKT", key: "nkt", width: 8 },
        { header: "Dipakai juga oleh", key: "shared", width: 30 },
        { header: "Keterangan", key: "notes", width: 30 },
      ],
      data: markers.map((m) => ({
        no: m.sequenceNo,
        code: m.code,
        parcelId,
        farmerCode,
        farmerName,
        groupName,
        lat: Number(fmtCoord(m.latitude)),
        lon: Number(fmtCoord(m.longitude)),
        condition: labelOf(LAND_MARKER_CONDITION_LABELS, m.condition),
        type: labelOf(LAND_MARKER_TYPE_LABELS, m.type),
        installedAt: m.installedAt ? new Date(m.installedAt).toISOString().slice(0, 10) : "",
        source: labelOf(LAND_MARKER_SOURCE_LABELS, m.source),
        nkt: m.nkt ? "Ya" : "",
        shared: m.sharedWith.map((s) => s.parcelId).join(", "),
        notes: m.notes ?? "",
      })),
    });
  }

  return (
    <Card className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">Patok Batas</h3>
          <p className="text-xs text-muted-foreground">
            Satu patok fisik dipakai bersama lahan berdampingan — sudut ≤ {MARKER_SNAP_M} m dari patok yang ada ditautkan, bukan digandakan.
            Tanda <span className="font-medium text-red-600">NKT</span> ikut dari status lahan pemakainya.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate && (
            <Button type="button" size="sm" variant="outline" onClick={openPreview} disabled={!data.hasGeometry || busy} title={data.hasGeometry ? "Turunkan patok dari sudut poligon" : "Lahan belum punya poligon"}>
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
              Buat patok dari poligon
            </Button>
          )}
          {canCreate && (
            <Button type="button" size="sm" variant="outline" onClick={() => setFormTarget({ item: null })}>
              <Plus className="mr-1.5 h-4 w-4" /> Tambah patok
            </Button>
          )}
          {canExport && markers.length > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={downloadCoordinates}>
              <Download className="mr-1.5 h-4 w-4" /> Unduh koordinat
            </Button>
          )}
        </div>
      </div>

      {data.polygonChangedSince && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Poligon lahan sudah direvisi sejak patok dibuat (revisi sekarang {data.revision}). Patok lama tidak digeser; jalankan
          <strong> Buat patok dari poligon</strong> lagi untuk menambah vertex baru.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-3">
          <ParcelMapView geometry={geometry} heightClassName="h-[460px]" label={parcelId.split(".").find((x) => /^[A-Z]$/i.test(x)) ?? parcelId} markerPoints={points} neighbors={neighbors} />
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm border-2 border-amber-700 bg-amber-400" /> Patok lahan</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm border-2 border-red-800 bg-red-500" /> Patok lahan NKT (lahan pemakainya termasuk/terdampak NKT)</span>
            {neighbors.length > 0 && (
              <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 shrink-0 rounded-sm border border-dashed border-slate-600" /> Putus-putus = lahan tetangga (≤ {NEIGHBOR_DISTANCE_M} m), bernomor</span>
            )}
            <span>Nomor patok = urutan tabel = nomor di Profil Lahan PDF.</span>
          </div>
          <ParcelNeighborList neighbors={neighbors} omitted={neighborsOmitted} className="mt-4" />
        </div>
        <div className="lg:col-span-2">
          {markers.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              <MapPin className="mx-auto mb-2 h-6 w-6" />
              Belum ada patok — buat dari poligon, tambah manual, atau unggah titik GPS lewat Bulk Upload → Lahan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-1.5 pr-2 font-medium w-10">No</th>
                    <th className="py-1.5 pr-3 font-medium">Kode · Koordinat</th>
                    <th className="py-1.5 pr-3 font-medium">Kondisi</th>
                    <th className="py-1.5 pr-3 font-medium">NKT</th>
                    <th className="py-1.5 font-medium text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {markers.map((m, i) => (
                    <tr key={m.linkId} className="border-b last:border-0 align-top">
                      <td className="py-2 pr-2 font-mono text-muted-foreground">{m.sequenceNo}</td>
                      <td className="py-2 pr-3">
                        <div className="font-mono text-xs font-semibold">{m.code}</div>
                        <div className="font-mono text-xs">{fmtCoord(m.latitude)}, {fmtCoord(m.longitude)}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {labelOf(LAND_MARKER_SOURCE_LABELS, m.source)}
                          {m.type && ` · ${labelOf(LAND_MARKER_TYPE_LABELS, m.type)}`}
                          {m.installedAt && ` · ${new Date(m.installedAt).toLocaleDateString("id-ID")}`}
                        </div>
                        {m.sharedWith.length > 0 && (
                          <div className="text-[11px] text-muted-foreground">
                            Juga patok{" "}
                            {m.sharedWith.map((s, k) => (
                              <span key={s.parcelId}>
                                {k > 0 && ", "}
                                {s.landParcelId ? (
                                  <Link href={`/admin/master-data/parcels/${s.landParcelId}`} className="text-primary hover:underline font-mono">{s.parcelId}</Link>
                                ) : (
                                  <span className="font-mono">{s.parcelId}</span>
                                )}{" "}
                                ({s.farmerName})
                              </span>
                            ))}
                          </div>
                        )}
                        {m.photoUrl && (
                          <a href={m.photoUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={m.photoUrl} alt={`Foto patok #${m.sequenceNo}`} className="h-12 w-12 rounded border object-cover" />
                          </a>
                        )}
                        {m.notes && <div className="text-[11px] italic text-muted-foreground">{m.notes}</div>}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant={m.condition === "NOT_INSTALLED" ? "outline" : "default"} className={CONDITION_TONE[m.condition]}>
                          {labelOf(LAND_MARKER_CONDITION_LABELS, m.condition)}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">{m.nkt ? <Badge className="bg-red-600 hover:bg-red-600">NKT</Badge> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        {canEdit && (
                          <>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Naikkan urutan" disabled={i === 0 || reordering} onClick={() => move(i, -1)}>
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Turunkan urutan" disabled={i === markers.length - 1 || reordering} onClick={() => move(i, 1)}>
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Ubah" onClick={() => setFormTarget({ item: m })}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {canDelete && (
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Lepas dari lahan ini" onClick={() => setRemoveTarget(m)}>
                            <Link2Off className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {formTarget && (
        <ParcelMarkerFormModal open onClose={() => setFormTarget(null)} landParcelId={landParcelId} item={formTarget.item} />
      )}

      {removeTarget && (
        <DeleteDialog
          open
          onClose={() => setRemoveTarget(null)}
          title={`Lepas patok #${removeTarget.sequenceNo} dari lahan ini?`}
          description={
            removeTarget.sharedWith.length > 0
              ? `Patok tetap dipakai lahan ${removeTarget.sharedWith.map((s) => s.parcelId).join(", ")}; hanya tautan ke lahan ini yang dilepas.`
              : "Patok tidak dipakai lahan lain — akan dinonaktifkan (koordinatnya tetap tersimpan)."
          }
          onConfirm={async () => {
            const res = await unlinkLandMarker(landParcelId, removeTarget.id);
            if (res.success) {
              toast.success("Patok dilepas dari lahan ini");
              setRemoveTarget(null);
              router.refresh();
            } else toast.error(res.error);
          }}
        />
      )}

      {preview && (
        <Dialog open onOpenChange={(v) => !v && setPreview(null)}>
          <DialogContent className="sm:max-w-[720px]">
            <DialogHeader>
              <DialogTitle>Pratinjau patok dari poligon</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              Sudut poligon (disederhanakan ±1 m) dinomori searah jarum jam dari yang paling utara. Vertex ≤ {MARKER_SNAP_M} m dari patok yang sudah ada akan
              <strong> ditautkan</strong> ke patok itu. Hilangkan centang pada vertex yang bukan patok (mis. lengkung digitasi).
            </p>
            <div className="max-h-[360px] overflow-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-2 py-1.5 w-8"></th>
                    <th className="px-2 py-1.5 font-medium">No</th>
                    <th className="px-2 py-1.5 font-medium">Koordinat</th>
                    <th className="px-2 py-1.5 font-medium">Hasil</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.candidates.map((c) => (
                    <tr key={c.sequenceNo} className={`border-b last:border-0 ${c.alreadyLinked ? "text-muted-foreground" : ""}`}>
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 accent-primary"
                          disabled={c.alreadyLinked}
                          checked={preview.keep.has(c.sequenceNo)}
                          onChange={(e) =>
                            setPreview((p) => {
                              if (!p) return p;
                              const keep = new Set(p.keep);
                              if (e.target.checked) keep.add(c.sequenceNo);
                              else keep.delete(c.sequenceNo);
                              return { ...p, keep };
                            })
                          }
                        />
                      </td>
                      <td className="px-2 py-1.5 font-mono">{c.sequenceNo}</td>
                      <td className="px-2 py-1.5 font-mono text-xs">{fmtCoord(c.lat)}, {fmtCoord(c.lon)}</td>
                      <td className="px-2 py-1.5 text-xs">
                        {c.alreadyLinked
                          ? "Sudah ada di lahan ini"
                          : c.existingMarkerId
                            ? `Tautkan ke patok lahan ${c.existingParcelIds.join(", ") || "lain"} (${c.snapDistanceM} m)`
                            : "Patok baru"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs text-muted-foreground">
                {preview.keep.size} dari {preview.candidates.length} vertex dipilih · nomor akhir mengikuti urutan setelah patok yang sudah ada
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setPreview(null)} disabled={busy}>Batal</Button>
                <Button type="button" onClick={confirmPreview} disabled={busy || preview.keep.size === 0}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan {preview.keep.size} patok
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
