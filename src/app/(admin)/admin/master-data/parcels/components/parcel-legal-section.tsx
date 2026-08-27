"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatArea } from "@/lib/format";
import { LAND_DOCUMENT_TYPE_LABELS } from "@/lib/land-parcel-detail-import";
import type { LandParcelSatellites } from "@/types/land-parcel";

/**
 * Isi section "Legalitas & Dokumen" di Detail Lahan (#296): dokumen
 * kepemilikan, STDB, kode vendor, program. Baca-saja — data masuk lewat
 * Bulk Upload → Lahan → tab Detail Lahan (Excel); CRUD manual menyusul.
 * Dirender di dalam SectionCard milik parcel-detail-client.
 */

const PROGRAM_LABELS: Record<string, string> = { DEMPLOT_PBU: "Demplot PBU (Productive Business Unit)" };
const STATUS_LABELS: Record<string, string> = { PLANNED: "Direncanakan", ACTIVE: "Berjalan", COMPLETED: "Selesai", CANCELLED: "Dibatalkan" };
const SOURCE_LABELS: Record<string, string> = { parcel_code: "Kode pemetaan vendor (parcel_code)" };

function fmtDate(d: Date | null) {
  return d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "—";
}

function SubHead({ label, count }: { label: string; count: number }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
      {label} <span className="font-normal">({count})</span>
    </p>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm italic text-muted-foreground">{text}</p>;
}

interface Props {
  data: LandParcelSatellites;
  /** Luas poligon lahan (ha) — pembanding luas tertera di surat. */
  parcelArea: number | null;
}

export function ParcelLegalSection({ data, parcelArea }: Props) {
  const { documents, stdbs, externalIds, programs } = data;
  const total = documents.length + stdbs.length + externalIds.length + programs.length;

  if (total === 0) {
    return (
      <Empty text="Belum ada dokumen, STDB, kode vendor, maupun program untuk lahan ini. Data masuk lewat Bulk Upload → Lahan → tab Detail Lahan (Excel)." />
    );
  }

  return (
    <div className="space-y-6">
      {/* Dokumen kepemilikan */}
      <div>
        <SubHead label="Surat Kepemilikan" count={documents.length} />
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
                  <th className="py-1.5 font-semibold">Keterangan</th>
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
                      <td className="py-1.5 text-muted-foreground">
                        {[d.custodyNote, d.notes].filter(Boolean).join(" · ") || "—"}
                      </td>
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
        <SubHead label="STDB (Surat Tanda Daftar Budidaya)" count={stdbs.length} />
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
                  <th className="py-1.5 font-semibold">Lahan Lain dalam STDB Ini</th>
                </tr>
              </thead>
              <tbody>
                {stdbs.map((s) => (
                  <tr key={s.id} className="border-b last:border-0 align-top">
                    <td className="py-1.5 pr-3 font-mono break-all">{s.number}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{s.issuedYear ?? "—"}</td>
                    <td className="py-1.5 pr-3">{s.holderName ?? "—"}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{s.statedArea != null ? formatArea(s.statedArea) : "—"}</td>
                    <td className="py-1.5">
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
          <SubHead label="Kode Pemetaan Vendor" count={externalIds.length} />
          {externalIds.length === 0 ? (
            <Empty text="Belum ada kode vendor." />
          ) : (
            <ul className="space-y-1.5 text-sm">
              {externalIds.map((e) => (
                <li key={e.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-mono">{e.code}</span>
                  <span className="text-xs text-muted-foreground">{SOURCE_LABELS[e.source] ?? e.source}</span>
                  {e.mappedAt && <span className="text-xs text-muted-foreground">· dipetakan {fmtDate(e.mappedAt)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <SubHead label="Program" count={programs.length} />
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
                  {p.notes && <span className="text-xs text-muted-foreground w-full">{p.notes}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
