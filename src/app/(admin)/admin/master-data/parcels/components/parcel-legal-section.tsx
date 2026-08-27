"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileBadge, Hash, Pencil, Plus, ScrollText, Sprout, Trash2, Unlink } from "lucide-react";
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

/** Kartu grup: ikon + judul + pill jumlah + tombol Tambah; isi = daftar item atau empty state. */
function Group({
  icon: Icon,
  title,
  count,
  hint,
  onAdd,
  empty,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count: number;
  hint?: string;
  onAdd?: () => void;
  empty: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              {title}
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">{count}</span>
            </h3>
            {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
          </div>
        </div>
        {onAdd && (
          <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs shrink-0" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" /> Tambah
          </Button>
        )}
      </div>
      <div className="p-3">
        {count === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="space-y-2">{children}</ul>
        )}
      </div>
    </section>
  );
}

/** Chip meta kecil; `tone="warn"` untuk selisih luas yang perlu diperhatikan. */
function Chip({ children, tone }: { children: React.ReactNode; tone?: "warn" }) {
  return (
    <span
      className={
        tone === "warn"
          ? "inline-flex items-center rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-800"
          : "inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
      }
    >
      {children}
    </span>
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

/** Satu item: blok bernuansa — judul (kiri), chip meta di bawahnya, aksi di kanan. */
function Row({ title, meta, actions }: { title: React.ReactNode; meta?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-md bg-muted/40 px-3 py-2.5">
      <div className="min-w-0 space-y-1.5">
        <div className="text-sm flex flex-wrap items-center gap-x-2 gap-y-1">{title}</div>
        {meta && <div className="flex flex-wrap items-center gap-1.5">{meta}</div>}
      </div>
      {actions}
    </li>
  );
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ── Surat kepemilikan ── */}
      <Group icon={ScrollText} title="Surat kepemilikan" count={documents.length} hint="Luas tertera adalah angka di surat; selisih terhadap poligon bukan kesalahan." onAdd={add("document")} empty="Belum ada surat tercatat.">
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
                        {d.statedArea != null && <Chip>Luas tertera {formatArea(d.statedArea)} Ha</Chip>}
                        {diff != null && (
                          <Chip tone={bigDiff ? "warn" : undefined}>
                            {diff > 0 ? "+" : ""}{formatArea(diff)} Ha vs poligon
                          </Chip>
                        )}
                        {d.issuedYear != null && <Chip>Terbit {d.issuedYear}</Chip>}
                        {d.custodyNote && <Chip>{d.custodyNote}</Chip>}
                        {d.notes && <span className="text-xs text-muted-foreground">{d.notes}</span>}
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
      </Group>

      {/* ── STDB ── */}
      <Group icon={FileBadge} title="STDB" count={stdbs.length} hint="Surat Tanda Daftar Budidaya terbit per petani dan dapat menutup beberapa lahan." onAdd={add("stdb")} empty="Belum ada STDB tercatat.">
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
                    {s.statedArea != null && <Chip>Luas tertera {formatArea(s.statedArea)} Ha</Chip>}
                    {s.otherParcels.length === 0 ? (
                      <Chip>Hanya lahan ini</Chip>
                    ) : (
                      <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                        Juga mencakup
                        {s.otherParcels.map((p) =>
                          p.id ? (
                            <Link key={p.parcelId} href={`/admin/master-data/parcels/${p.id}`} className="rounded-md bg-primary/10 px-1.5 py-0.5 font-mono text-[11px] text-primary hover:underline">
                              {p.parcelId}
                            </Link>
                          ) : (
                            <span key={p.parcelId} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px]">{p.parcelId}</span>
                          ),
                        )}
                      </span>
                    )}
                    {s.notes && <span className="text-xs text-muted-foreground">{s.notes}</span>}
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
      </Group>

      {/* ── Kode vendor ── */}
      <Group icon={Hash} title="Kode pemetaan vendor" count={externalIds.length} hint="Identitas lahan dari sistem/vendor pemetaan pihak ketiga." onAdd={add("externalId")} empty="Belum ada kode vendor.">
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
                  meta={(mapped || e.notes) && (<>{mapped && <Chip>Dipetakan {mapped}</Chip>}{e.notes && <span className="text-xs text-muted-foreground">{e.notes}</span>}</>)}
                  actions={
                    <RowActions
                      onEdit={canEdit ? () => setFormTarget({ kind: "externalId", item: e }) : undefined}
                      onRemove={canDelete ? () => setRemoveTarget({ kind: "externalId", id: e.id, label: `Kode vendor ${e.code}` }) : undefined}
                    />
                  }
                />
              );
            })}
      </Group>

      {/* ── Program ── */}
      <Group icon={Sprout} title="Program" count={programs.length} hint="Keikutsertaan lahan dalam program, mis. demplot PBU." onAdd={add("program")} empty="Tidak terdaftar di program mana pun.">
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
                  meta={(start || end || p.notes) && (<>{(start || end) && <Chip>{start ?? "…"} – {end ?? "…"}</Chip>}{p.notes && <span className="text-xs text-muted-foreground">{p.notes}</span>}</>)}
                  actions={
                    <RowActions
                      onEdit={canEdit ? () => setFormTarget({ kind: "program", item: p }) : undefined}
                      onRemove={canDelete ? () => setRemoveTarget({ kind: "program", id: p.id, label: `Program ${PROGRAM_LABELS[p.programType] ?? p.programType}` }) : undefined}
                    />
                  }
                />
              );
            })}
      </Group>

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
