"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteDialog } from "@/components/shared/delete-dialog";
import { formatArea } from "@/lib/format";
import { LAND_DOCUMENT_TYPE_LABELS } from "@/lib/land-parcel-detail-import";
import { deactivateLandParcelSatellite, unlinkLandStdb } from "@/server/actions/land-parcel-satellite";
import { ParcelSatelliteFormModal, type SatelliteFormTarget } from "./parcel-satellite-form-modal";
import type { LandParcelSatellites } from "@/types/land-parcel";

/**
 * Isi section "Legalitas & Dokumen" di Detail Lahan (#296): dokumen
 * kepemilikan, STDB, kode vendor, program. Data masuk lewat Bulk Upload →
 * Lahan → tab Detail Lahan (Excel) atau CRUD manual di sini (tahap 3c):
 * tombol Tambah (CREATE), Ubah (EDIT), Nonaktifkan/Lepas (DELETE) mengikuti
 * izin menu Lahan. Dirender di dalam SectionCard milik parcel-detail-client.
 */

const PROGRAM_LABELS: Record<string, string> = { DEMPLOT_PBU: "Demplot PBU (Productive Business Unit)" };
const STATUS_LABELS: Record<string, string> = { PLANNED: "Direncanakan", ACTIVE: "Berjalan", COMPLETED: "Selesai", CANCELLED: "Dibatalkan" };
const SOURCE_LABELS: Record<string, string> = { parcel_code: "Kode pemetaan vendor (parcel_code)" };

function fmtDate(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

function SubHead({ label, count, onAdd }: { label: string; count: number; onAdd?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label} <span className="font-normal">({count})</span>
      </p>
      {onAdd && (
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" /> Tambah
        </Button>
      )}
    </div>
  );
}

function RowActions({ onEdit, onRemove, removeTitle }: { onEdit?: () => void; onRemove?: () => void; removeTitle: string }) {
  if (!onEdit && !onRemove) return null;
  return (
    <span className="inline-flex gap-1">
      {onEdit && (
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Ubah" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
      {onRemove && (
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" title={removeTitle} onClick={onRemove}>
          {removeTitle.startsWith("Lepas") ? <Unlink className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      )}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm italic text-muted-foreground">{text}</p>;
}

interface Props {
  data: LandParcelSatellites;
  /** Luas poligon lahan (ha) — pembanding luas tertera di surat. */
  parcelArea: number | null;
  /** LandParcel.id — target action CRUD (server menerjemahkan ke parcelUid). */
  landParcelId: string;
  /** Izin menu Lahan (CREATE/EDIT/DELETE) — menentukan tombol yang tampil. */
  permissions: string[];
}

type RemoveTarget =
  | { kind: "document" | "externalId" | "program"; id: string; label: string }
  | { kind: "stdb"; id: string; label: string };

export function ParcelLegalSection({ data, parcelArea, landParcelId, permissions }: Props) {
  const router = useRouter();
  const { documents, stdbs, externalIds, programs } = data;
  const total = documents.length + stdbs.length + externalIds.length + programs.length;
  const canCreate = permissions.includes("CREATE");
  const canEdit = permissions.includes("EDIT");
  const canDelete = permissions.includes("DELETE");
  const [formTarget, setFormTarget] = useState<SatelliteFormTarget | null>(null);
  const [removeTarget, setRemoveTarget] = useState<RemoveTarget | null>(null);

  async function confirmRemove() {
    if (!removeTarget) return;
    const res =
      removeTarget.kind === "stdb"
        ? await unlinkLandStdb(landParcelId, removeTarget.id)
        : await deactivateLandParcelSatellite(removeTarget.kind, removeTarget.id);
    if (!res.success) {
      toast.error(typeof res.error === "string" ? res.error : "Gagal menonaktifkan data");
      return;
    }
    toast.success(removeTarget.kind === "stdb" ? "STDB dilepas dari lahan ini" : "Data dinonaktifkan");
    setRemoveTarget(null);
    router.refresh();
  }

  const modals = (
    <>
      {formTarget && (
        <ParcelSatelliteFormModal open onClose={() => setFormTarget(null)} landParcelId={landParcelId} target={formTarget} />
      )}
      <DeleteDialog
        open={removeTarget != null}
        onClose={() => setRemoveTarget(null)}
        onConfirm={confirmRemove}
        title={removeTarget?.kind === "stdb" ? "Lepas STDB dari lahan ini?" : "Nonaktifkan data ini?"}
        description={
          removeTarget?.kind === "stdb"
            ? `STDB ${removeTarget.label} tetap tersimpan untuk petani dan lahan lain; hanya tautan ke lahan ini yang dilepas.`
            : `${removeTarget?.label ?? "Data"} dinonaktifkan (soft delete) dan tidak tampil lagi di lahan ini.`
        }
      />
    </>
  );

  const addButtons = canCreate ? (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => setFormTarget({ kind: "document", item: null })}><Plus className="h-3.5 w-3.5" /> Surat</Button>
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => setFormTarget({ kind: "stdb", item: null })}><Plus className="h-3.5 w-3.5" /> STDB</Button>
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => setFormTarget({ kind: "externalId", item: null })}><Plus className="h-3.5 w-3.5" /> Kode Vendor</Button>
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={() => setFormTarget({ kind: "program", item: null })}><Plus className="h-3.5 w-3.5" /> Program</Button>
    </div>
  ) : null;

  if (total === 0) {
    return (
      <div className="space-y-3">
        <Empty text="Belum ada dokumen, STDB, kode vendor, maupun program untuk lahan ini. Data masuk lewat Bulk Upload → Lahan → tab Detail Lahan (Excel), atau tambahkan manual di bawah." />
        {addButtons}
        {modals}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dokumen kepemilikan */}
      <div>
        <SubHead label="Surat Kepemilikan" count={documents.length} onAdd={canCreate ? () => setFormTarget({ kind: "document", item: null }) : undefined} />
        {documents.length === 0 ? (
          <Empty text="Belum ada surat kepemilikan tercatat." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-1.5 pr-3 font-semibold">Jenis</th>
                  <th className="py-1.5 pr-3 font-semibold">Nomor</th>
                  <th className="py-1.5 pr-3 font-semibold">Nama di Surat</th>
                  <th className="py-1.5 pr-3 font-semibold text-right">Luas Tertera (Ha)</th>
                  <th className="py-1.5 pr-3 font-semibold text-right">Selisih vs Poligon</th>
                  <th className="py-1.5 pr-3 font-semibold text-right">Tahun</th>
                  <th className="py-1.5 pr-3 font-semibold">Keterangan</th>
                  {(canEdit || canDelete) && <th className="py-1.5 w-[70px]" />}
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => {
                  const diff = d.statedArea != null && parcelArea != null ? d.statedArea - parcelArea : null;
                  const unknownType = d.type === "OTHER" && !d.typeRaw;
                  return (
                    <tr key={d.id} className="border-b last:border-0 align-top">
                      <td className="py-1.5 pr-3">
                        {unknownType ? (
                          <span className="italic text-muted-foreground" title="Jenis surat kosong di sumber data">Lainnya (jenis belum diisi)</span>
                        ) : (
                          <span title={d.typeRaw ?? undefined}>{LAND_DOCUMENT_TYPE_LABELS[d.type] ?? d.type}</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3 font-mono break-all">{d.number ?? "—"}</td>
                      <td className="py-1.5 pr-3">{d.holderName ?? "—"}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{d.statedArea != null ? formatArea(d.statedArea) : "—"}</td>
                      <td className={`py-1.5 pr-3 text-right tabular-nums ${diff != null && Math.abs(diff) >= 0.5 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {diff != null ? `${diff > 0 ? "+" : ""}${formatArea(diff)}` : "—"}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{d.issuedYear ?? "—"}</td>
                      <td className="py-1.5 pr-3 text-muted-foreground">
                        {[d.custodyNote, d.notes].filter(Boolean).join(" · ") || "—"}
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="py-1 text-right">
                          <RowActions
                            onEdit={canEdit ? () => setFormTarget({ kind: "document", item: d }) : undefined}
                            onRemove={canDelete ? () => setRemoveTarget({ kind: "document", id: d.id, label: `Surat ${LAND_DOCUMENT_TYPE_LABELS[d.type]}${d.number ? ` ${d.number}` : ""}` }) : undefined}
                            removeTitle="Nonaktifkan"
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="text-xs text-muted-foreground mt-2">
              Luas tertera adalah angka di surat; selisih terhadap luas poligon
              {parcelArea != null ? ` (${formatArea(parcelArea)} Ha)` : ""} bukan kesalahan — perbedaan ≥ 0,5 Ha ditandai.
            </p>
          </div>
        )}
      </div>

      {/* STDB */}
      <div>
        <SubHead label="STDB (Surat Tanda Daftar Budidaya)" count={stdbs.length} onAdd={canCreate ? () => setFormTarget({ kind: "stdb", item: null }) : undefined} />
        {stdbs.length === 0 ? (
          <Empty text="Belum ada STDB tercatat. STDB terbit per petani dan dapat menutup beberapa lahan." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-1.5 pr-3 font-semibold">Nomor</th>
                  <th className="py-1.5 pr-3 font-semibold text-right">Tahun</th>
                  <th className="py-1.5 pr-3 font-semibold">Nama Pemegang</th>
                  <th className="py-1.5 pr-3 font-semibold text-right">Luas Tertera (Ha)</th>
                  <th className="py-1.5 pr-3 font-semibold">Lahan Lain dalam STDB Ini</th>
                  {(canEdit || canDelete) && <th className="py-1.5 w-[70px]" />}
                </tr>
              </thead>
              <tbody>
                {stdbs.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 align-top">
                    <td className="py-1.5 pr-3 font-mono break-all">{s.number}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{s.issuedYear ?? "—"}</td>
                    <td className="py-1.5 pr-3">{s.holderName ?? "—"}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{s.statedArea != null ? formatArea(s.statedArea) : "—"}</td>
                    <td className="py-1.5 pr-3">
                      {s.otherParcels.length === 0 ? (
                        <span className="text-muted-foreground">Hanya lahan ini</span>
                      ) : (
                        <span className="flex flex-wrap gap-1.5">
                          {s.otherParcels.map((p) =>
                            p.id ? (
                              <Link key={p.parcelId} href={`/admin/master-data/parcels/${p.id}`} className="font-mono text-primary hover:underline">
                                {p.parcelId}
                              </Link>
                            ) : (
                              <span key={p.parcelId} className="font-mono text-muted-foreground">{p.parcelId}</span>
                            ),
                          )}
                        </span>
                      )}
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="py-1 text-right">
                        <RowActions
                          onEdit={canEdit ? () => setFormTarget({ kind: "stdb", item: s }) : undefined}
                          onRemove={canDelete ? () => setRemoveTarget({ kind: "stdb", id: s.id, label: s.number }) : undefined}
                          removeTitle="Lepas dari lahan ini"
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Kode vendor & program — dua kolom */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <SubHead label="Kode Pemetaan Vendor" count={externalIds.length} onAdd={canCreate ? () => setFormTarget({ kind: "externalId", item: null }) : undefined} />
          {externalIds.length === 0 ? (
            <Empty text="Belum ada kode vendor." />
          ) : (
            <ul className="space-y-1.5 text-sm">
              {externalIds.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-mono">{e.code}</span>
                  <span className="text-xs text-muted-foreground">{SOURCE_LABELS[e.source] ?? e.source}</span>
                  {e.mappedAt && <span className="text-xs text-muted-foreground">· dipetakan {fmtDate(e.mappedAt)}</span>}
                  <RowActions
                    onEdit={canEdit ? () => setFormTarget({ kind: "externalId", item: e }) : undefined}
                    onRemove={canDelete ? () => setRemoveTarget({ kind: "externalId", id: e.id, label: `Kode vendor ${e.code}` }) : undefined}
                    removeTitle="Nonaktifkan"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <SubHead label="Program" count={programs.length} onAdd={canCreate ? () => setFormTarget({ kind: "program", item: null }) : undefined} />
          {programs.length === 0 ? (
            <Empty text="Lahan ini tidak terdaftar di program mana pun (mis. demplot PBU)." />
          ) : (
            <ul className="space-y-2 text-sm">
              {programs.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{PROGRAM_LABELS[p.programType] ?? p.programType}</span>
                  <Badge variant={p.status === "ACTIVE" ? "default" : "outline"}>{STATUS_LABELS[p.status] ?? p.status}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {fmtDate(p.startDate)} – {fmtDate(p.endDate)}
                  </span>
                  <RowActions
                    onEdit={canEdit ? () => setFormTarget({ kind: "program", item: p }) : undefined}
                    onRemove={canDelete ? () => setRemoveTarget({ kind: "program", id: p.id, label: `Program ${PROGRAM_LABELS[p.programType] ?? p.programType}` }) : undefined}
                    removeTitle="Nonaktifkan"
                  />
                  {p.notes && <span className="text-xs text-muted-foreground w-full">{p.notes}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {modals}
    </div>
  );
}
