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
import { documentTypeShort } from "@/lib/land-parcel-satellite-format";
import { deactivateLandParcelSatellite, unlinkLandStdb } from "@/server/actions/land-parcel-satellite";
import { ParcelSatelliteFormModal, type SatelliteFormTarget } from "./parcel-satellite-form-modal";
import type { LandParcelSatellites } from "@/types/land-parcel";

/**
 * Tab "Legalitas" di Detail Lahan (#296, redesign #298): dokumen kepemilikan,
 * STDB, kode vendor, program — sebagai BARIS RINGKAS (bukan tabel lebar):
 * kolom yang kosong tidak dirender, meta dalam satu baris kecil, aksi di
 * ujung kanan. Data masuk lewat Bulk Upload → Lahan → tab Detail Lahan
 * (Excel) atau CRUD manual di sini (Tambah = CREATE, pensil = EDIT,
 * hapus/lepas = DELETE menu Lahan).
 */

const PROGRAM_LABELS: Record<string, string> = { DEMPLOT_PBU: "Demplot PBU (Productive Business Unit)" };
const STATUS_LABELS: Record<string, string> = { PLANNED: "Direncanakan", ACTIVE: "Berjalan", COMPLETED: "Selesai", CANCELLED: "Dibatalkan" };
const SOURCE_LABELS: Record<string, string> = { parcel_code: "pemetaan vendor" };

function fmtDate(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : null;
}

/** Judul grup + jumlah + tombol Tambah (bila boleh). Satu-satunya tingkat sub-judul di tab ini. */
function GroupHead({ title, count, hint, onAdd }: { title: string; count: number; hint?: string; onAdd?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold">
          {title} <span className="text-muted-foreground font-normal">· {count}</span>
        </h3>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {onAdd && (
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs shrink-0" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" /> Tambah
        </Button>
      )}
    </div>
  );
}

function RowActions({ onEdit, onRemove, unlink = false }: { onEdit?: () => void; onRemove?: () => void; unlink?: boolean }) {
  if (!onEdit && !onRemove) return null;
  return (
    <span className="inline-flex shrink-0 gap-0.5 -mr-1">
      {onEdit && (
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" title="Ubah" onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
      {onRemove && (
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" title={unlink ? "Lepas dari lahan ini" : "Nonaktifkan"} onClick={onRemove}>
          {unlink ? <Unlink className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      )}
    </span>
  );
}

/** Satu baris item: judul (kiri), meta kecil di bawahnya, aksi di kanan. */
function Row({ title, meta, children, actions }: { title: React.ReactNode; meta?: React.ReactNode; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="min-w-0 space-y-0.5">
        <div className="text-sm flex flex-wrap items-center gap-x-2 gap-y-1">{title}</div>
        {meta && <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">{meta}</div>}
        {children}
      </div>
      {actions}
    </li>
  );
}

const Empty = ({ text }: { text: string }) => <p className="text-sm text-muted-foreground">{text}</p>;

interface Props {
  data: LandParcelSatellites;
  /** Luas poligon lahan (ha) — pembanding luas tertera di surat. */
  parcelArea: number | null;
  /** LandParcel.id — target action CRUD (server menerjemahkan ke parcelUid). */
  landParcelId: string;
  /** Izin menu Lahan (CREATE/EDIT/DELETE) — menentukan tombol yang tampil. */
  permissions: string[];
}

type RemoveTarget = { kind: "document" | "externalId" | "program" | "stdb"; id: string; label: string };

export function ParcelLegalSection({ data, parcelArea, landParcelId, permissions }: Props) {
  const router = useRouter();
  const { documents, stdbs, externalIds, programs } = data;
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

  const add = (kind: SatelliteFormTarget["kind"]) => (canCreate ? () => setFormTarget({ kind, item: null } as SatelliteFormTarget) : undefined);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-8">
      {/* ── Surat kepemilikan ── */}
      <section className="space-y-3">
        <GroupHead title="Surat kepemilikan" count={documents.length} hint="Luas tertera adalah angka di surat; selisih terhadap poligon bukan kesalahan." onAdd={add("document")} />
        {documents.length === 0 ? (
          <Empty text="Belum ada surat tercatat." />
        ) : (
          <ul className="divide-y">
            {documents.map((d) => {
              const unknownType = d.type === "OTHER" && !d.typeRaw;
              const diff = d.statedArea != null && parcelArea != null ? d.statedArea - parcelArea : null;
              const bigDiff = diff != null && Math.abs(diff) >= 0.5;
              return (
                <Row
                  key={d.id}
                  title={
                    <>
                      <Badge variant={unknownType ? "outline" : "secondary"} title={d.typeRaw ?? LAND_DOCUMENT_TYPE_LABELS[d.type]} className={unknownType ? "italic text-muted-foreground" : undefined}>
                        {unknownType ? "Jenis belum diisi" : documentTypeShort(d.type)}
                      </Badge>
                      {d.number ? <span className="font-mono">{d.number}</span> : <span className="text-muted-foreground">tanpa nomor</span>}
                      {d.holderName && <span className="text-muted-foreground">a.n. <span className="text-foreground">{d.holderName}</span></span>}
                    </>
                  }
                  meta={
                    (d.statedArea != null || d.issuedYear != null || d.custodyNote || d.notes) && (
                      <>
                        {d.statedArea != null && (
                          <span>
                            Luas tertera {formatArea(d.statedArea)} Ha
                            {diff != null && (
                              <span className={bigDiff ? "text-amber-600 font-medium" : undefined}>
                                {" "}({diff > 0 ? "+" : ""}{formatArea(diff)} vs poligon)
                              </span>
                            )}
                          </span>
                        )}
                        {d.issuedYear != null && <span>Terbit {d.issuedYear}</span>}
                        {d.custodyNote && <span className="italic">{d.custodyNote}</span>}
                        {d.notes && <span>{d.notes}</span>}
                      </>
                    )
                  }
                  actions={
                    <RowActions
                      onEdit={canEdit ? () => setFormTarget({ kind: "document", item: d }) : undefined}
                      onRemove={canDelete ? () => setRemoveTarget({ kind: "document", id: d.id, label: `Surat ${documentTypeShort(d.type)}${d.number ? ` ${d.number}` : ""}` }) : undefined}
                    />
                  }
                />
              );
            })}
          </ul>
        )}
      </section>

      {/* ── STDB ── */}
      <section className="space-y-3">
        <GroupHead title="STDB" count={stdbs.length} hint="Surat Tanda Daftar Budidaya terbit per petani dan dapat menutup beberapa lahan." onAdd={add("stdb")} />
        {stdbs.length === 0 ? (
          <Empty text="Belum ada STDB tercatat." />
        ) : (
          <ul className="divide-y">
            {stdbs.map((s) => (
              <Row
                key={s.id}
                title={
                  <>
                    <span className="font-mono">{s.number}</span>
                    {s.issuedYear != null && <Badge variant="outline">{s.issuedYear}</Badge>}
                    {s.holderName && <span className="text-muted-foreground">a.n. <span className="text-foreground">{s.holderName}</span></span>}
                  </>
                }
                meta={
                  <>
                    {s.statedArea != null && <span>Luas tertera {formatArea(s.statedArea)} Ha</span>}
                    {s.otherParcels.length === 0 ? (
                      <span>Hanya lahan ini</span>
                    ) : (
                      <span className="flex flex-wrap items-center gap-1">
                        Juga menutup:
                        {s.otherParcels.map((p) =>
                          p.id ? (
                            <Link key={p.parcelId} href={`/admin/master-data/parcels/${p.id}`} className="font-mono text-primary hover:underline">
                              {p.parcelId}
                            </Link>
                          ) : (
                            <span key={p.parcelId} className="font-mono">{p.parcelId}</span>
                          ),
                        )}
                      </span>
                    )}
                    {s.notes && <span>{s.notes}</span>}
                  </>
                }
                actions={
                  <RowActions
                    unlink
                    onEdit={canEdit ? () => setFormTarget({ kind: "stdb", item: s }) : undefined}
                    onRemove={canDelete ? () => setRemoveTarget({ kind: "stdb", id: s.id, label: s.number }) : undefined}
                  />
                }
              />
            ))}
          </ul>
        )}
      </section>

      {/* ── Kode vendor ── */}
      <section className="space-y-3">
        <GroupHead title="Kode pemetaan vendor" count={externalIds.length} onAdd={add("externalId")} />
        {externalIds.length === 0 ? (
          <Empty text="Belum ada kode vendor." />
        ) : (
          <ul className="divide-y">
            {externalIds.map((e) => {
              const mapped = fmtDate(e.mappedAt);
              return (
                <Row
                  key={e.id}
                  title={
                    <>
                      <span className="font-mono">{e.code}</span>
                      <span className="text-muted-foreground">{SOURCE_LABELS[e.source] ?? e.source}</span>
                    </>
                  }
                  meta={(mapped || e.notes) && (<>{mapped && <span>Dipetakan {mapped}</span>}{e.notes && <span>{e.notes}</span>}</>)}
                  actions={
                    <RowActions
                      onEdit={canEdit ? () => setFormTarget({ kind: "externalId", item: e }) : undefined}
                      onRemove={canDelete ? () => setRemoveTarget({ kind: "externalId", id: e.id, label: `Kode vendor ${e.code}` }) : undefined}
                    />
                  }
                />
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Program ── */}
      <section className="space-y-3">
        <GroupHead title="Program" count={programs.length} hint="Keikutsertaan lahan dalam program, mis. demplot PBU." onAdd={add("program")} />
        {programs.length === 0 ? (
          <Empty text="Tidak terdaftar di program mana pun." />
        ) : (
          <ul className="divide-y">
            {programs.map((p) => {
              const start = fmtDate(p.startDate), end = fmtDate(p.endDate);
              return (
                <Row
                  key={p.id}
                  title={
                    <>
                      <span className="font-medium">{PROGRAM_LABELS[p.programType] ?? p.programType}</span>
                      <Badge variant={p.status === "ACTIVE" ? "default" : "outline"}>{STATUS_LABELS[p.status] ?? p.status}</Badge>
                    </>
                  }
                  meta={(start || end || p.notes) && (<>{(start || end) && <span>{start ?? "…"} – {end ?? "…"}</span>}{p.notes && <span>{p.notes}</span>}</>)}
                  actions={
                    <RowActions
                      onEdit={canEdit ? () => setFormTarget({ kind: "program", item: p }) : undefined}
                      onRemove={canDelete ? () => setRemoveTarget({ kind: "program", id: p.id, label: `Program ${PROGRAM_LABELS[p.programType] ?? p.programType}` }) : undefined}
                    />
                  }
                />
              );
            })}
          </ul>
        )}
      </section>

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
    </div>
  );
}
