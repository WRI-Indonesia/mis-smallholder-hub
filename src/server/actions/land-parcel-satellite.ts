"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerAccessFilter, farmerRelationAccessFilter } from "@/lib/access-context";
import {
  landParcelDocumentSchema,
  updateLandParcelDocumentSchema,
  landStdbSchema,
  updateLandStdbSchema,
  landParcelExternalIdSchema,
  updateLandParcelExternalIdSchema,
  landParcelProgramSchema,
  updateLandParcelProgramSchema,
  type SatelliteKind,
} from "@/validations/land-parcel-satellite.schema";
import type { ActionResult } from "@/types/action-result";

/**
 * CRUD manual satelit lahan (#296 tahap 3c): dokumen kepemilikan, STDB, kode
 * vendor, program. Izin menumpang menu Lahan (`master-data-parcels`):
 * CREATE tambah · EDIT ubah · DELETE nonaktifkan/aktifkan. Scope selalu
 * diturunkan dari BARIS LAHAN yang diminta (`farmerRelationAccessFilter`),
 * lalu satelit diakses lewat `parcelUid` — klien tidak pernah mengirim
 * parcelUid, dan untuk update/toggle kepemilikan record dicek ulang lewat
 * relasi `parcel.farmer` agar id record dari lahan lain tak bisa ditebak.
 */

const MENU = "master-data-parcels";
type FieldErrors = Record<string, string[]>;
type Result = ActionResult<{ id: string }> | { success: false; error: FieldErrors };

async function resolveParcel(landParcelId: string) {
  const access = await getAccessContext();
  return prisma.landParcel.findFirst({
    where: { id: landParcelId, isActive: true, ...farmerRelationAccessFilter(access) },
    select: { parcelUid: true, farmerId: true },
  });
}

/** Where-fragment: satelit milik lahan (identitas) yang ada dalam scope user. */
async function satelliteScope() {
  const access = await getAccessContext();
  const farmerScope = farmerRelationAccessFilter(access);
  return { parcel: { ...farmerScope } } as const;
}

async function userId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

// ─── Dokumen kepemilikan ───

export async function createLandParcelDocument(input: unknown): Promise<Result> {
  if (!(await hasPermission(MENU, "CREATE"))) return { success: false, error: "Tidak memiliki izin untuk menambah dokumen" };
  const parsed = landParcelDocumentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors as FieldErrors };
  const parcel = await resolveParcel(parsed.data.landParcelId);
  if (!parcel) return { success: false, error: "Lahan tidak ditemukan atau di luar akses Anda" };
  const { landParcelId: _ignored, ...data } = parsed.data;
  void _ignored;
  const row = await prisma.landParcelDocument.create({
    data: { ...data, parcelUid: parcel.parcelUid, createdBy: await userId() },
    select: { id: true },
  });
  return { success: true, data: row };
}

export async function updateLandParcelDocument(input: unknown): Promise<Result> {
  if (!(await hasPermission(MENU, "EDIT"))) return { success: false, error: "Tidak memiliki izin untuk mengubah dokumen" };
  const parsed = updateLandParcelDocumentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors as FieldErrors };
  const { id, ...data } = parsed.data;
  const existing = await prisma.landParcelDocument.findFirst({ where: { id, isActive: true, ...(await satelliteScope()) }, select: { id: true } });
  if (!existing) return { success: false, error: "Dokumen tidak ditemukan atau di luar akses Anda" };
  await prisma.landParcelDocument.update({ where: { id }, data: { ...data, modifiedBy: await userId() } });
  return { success: true, data: { id } };
}

// ─── STDB ───

export async function createLandStdb(input: unknown): Promise<Result> {
  if (!(await hasPermission(MENU, "CREATE"))) return { success: false, error: "Tidak memiliki izin untuk menambah STDB" };
  const parsed = landStdbSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors as FieldErrors };
  const parcel = await resolveParcel(parsed.data.landParcelId);
  if (!parcel) return { success: false, error: "Lahan tidak ditemukan atau di luar akses Anda" };
  const { landParcelId: _ignored, number, ...rest } = parsed.data;
  void _ignored;
  const uid = await userId();

  // STDB unik per petani: nomor yang sudah ada → pakai ulang (aktifkan bila
  // nonaktif) lalu tautkan; ini yang membuat satu STDB menutup banyak lahan.
  const result = await prisma.$transaction(async (tx) => {
    const found = await tx.landStdb.findUnique({ where: { farmerId_number: { farmerId: parcel.farmerId, number } }, select: { id: true, isActive: true } });
    let stdbId: string;
    if (found) {
      stdbId = found.id;
      // Pakai ulang: hanya timpa field yang diisi — field kosong di form
      // tidak boleh mengosongkan data STDB yang sudah ada dari lahan lain.
      const filled = Object.fromEntries(Object.entries(rest).filter(([, v]) => v != null && v !== ""));
      await tx.landStdb.update({ where: { id: found.id }, data: { ...filled, isActive: true, modifiedBy: uid } });
    } else {
      const created = await tx.landStdb.create({ data: { farmerId: parcel.farmerId, number, ...rest, createdBy: uid }, select: { id: true } });
      stdbId = created.id;
    }
    const link = await tx.landParcelStdb.findUnique({ where: { parcelUid_stdbId: { parcelUid: parcel.parcelUid, stdbId } }, select: { id: true, isActive: true } });
    if (!link) await tx.landParcelStdb.create({ data: { parcelUid: parcel.parcelUid, stdbId, createdBy: uid } });
    else if (!link.isActive) await tx.landParcelStdb.update({ where: { id: link.id }, data: { isActive: true } });
    return { id: stdbId };
  });
  return { success: true, data: { id: result.id } };
}

export async function updateLandStdb(input: unknown): Promise<Result> {
  if (!(await hasPermission(MENU, "EDIT"))) return { success: false, error: "Tidak memiliki izin untuk mengubah STDB" };
  const parsed = updateLandStdbSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors as FieldErrors };
  const { id, ...data } = parsed.data;
  const access = await getAccessContext();
  const existing = await prisma.landStdb.findFirst({
    where: { id, isActive: true, farmer: farmerAccessFilter(access) },
    select: { id: true, farmerId: true, number: true },
  });
  if (!existing) return { success: false, error: "STDB tidak ditemukan atau di luar akses Anda" };
  if (data.number !== existing.number) {
    const clash = await prisma.landStdb.findUnique({ where: { farmerId_number: { farmerId: existing.farmerId, number: data.number } }, select: { id: true } });
    if (clash) return { success: false, error: { number: ["Nomor STDB ini sudah terdaftar untuk petani yang sama"] } };
  }
  await prisma.landStdb.update({ where: { id }, data: { ...data, modifiedBy: await userId() } });
  return { success: true, data: { id } };
}

/** Lepas tautan STDB dari SATU lahan (STDB-nya tetap ada untuk lahan lain). */
export async function unlinkLandStdb(landParcelId: string, stdbId: string): Promise<ActionResult> {
  if (!(await hasPermission(MENU, "DELETE"))) return { success: false, error: "Tidak memiliki izin untuk melepas STDB" };
  const parcel = await resolveParcel(landParcelId);
  if (!parcel) return { success: false, error: "Lahan tidak ditemukan atau di luar akses Anda" };
  const res = await prisma.landParcelStdb.updateMany({
    where: { parcelUid: parcel.parcelUid, stdbId, isActive: true },
    data: { isActive: false },
  });
  if (res.count === 0) return { success: false, error: "Tautan STDB tidak ditemukan" };
  return { success: true };
}

// ─── UL Parcel Code ───

export async function createLandParcelExternalId(input: unknown): Promise<Result> {
  if (!(await hasPermission(MENU, "CREATE"))) return { success: false, error: "Tidak memiliki izin untuk menambah UL Parcel Code" };
  const parsed = landParcelExternalIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors as FieldErrors };
  const parcel = await resolveParcel(parsed.data.landParcelId);
  if (!parcel) return { success: false, error: "Lahan tidak ditemukan atau di luar akses Anda" };
  const { landParcelId: _ignored, ...data } = parsed.data;
  void _ignored;
  const clash = await prisma.landParcelExternalId.findUnique({ where: { source_code: { source: data.source, code: data.code } }, select: { parcelUid: true, isActive: true } });
  if (clash && clash.isActive && clash.parcelUid !== parcel.parcelUid) {
    return { success: false, error: { code: ["Kode ini sudah dipakai lahan lain untuk sumber yang sama"] } };
  }
  const uid = await userId();
  const row = clash
    ? await prisma.landParcelExternalId.update({ where: { source_code: { source: data.source, code: data.code } }, data: { ...data, parcelUid: parcel.parcelUid, isActive: true, modifiedBy: uid }, select: { id: true } })
    : await prisma.landParcelExternalId.create({ data: { ...data, parcelUid: parcel.parcelUid, createdBy: uid }, select: { id: true } });
  return { success: true, data: row };
}

export async function updateLandParcelExternalId(input: unknown): Promise<Result> {
  if (!(await hasPermission(MENU, "EDIT"))) return { success: false, error: "Tidak memiliki izin untuk mengubah UL Parcel Code" };
  const parsed = updateLandParcelExternalIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors as FieldErrors };
  const { id, ...data } = parsed.data;
  const existing = await prisma.landParcelExternalId.findFirst({ where: { id, isActive: true, ...(await satelliteScope()) }, select: { id: true, parcelUid: true } });
  if (!existing) return { success: false, error: "UL Parcel Code tidak ditemukan atau di luar akses Anda" };
  const clash = await prisma.landParcelExternalId.findUnique({ where: { source_code: { source: data.source, code: data.code } }, select: { id: true } });
  if (clash && clash.id !== id) return { success: false, error: { code: ["Kode ini sudah dipakai record lain untuk sumber yang sama"] } };
  await prisma.landParcelExternalId.update({ where: { id }, data: { ...data, modifiedBy: await userId() } });
  return { success: true, data: { id } };
}

// ─── Program ───

export async function createLandParcelProgram(input: unknown): Promise<Result> {
  if (!(await hasPermission(MENU, "CREATE"))) return { success: false, error: "Tidak memiliki izin untuk menambah program" };
  const parsed = landParcelProgramSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors as FieldErrors };
  const parcel = await resolveParcel(parsed.data.landParcelId);
  if (!parcel) return { success: false, error: "Lahan tidak ditemukan atau di luar akses Anda" };
  const { landParcelId: _ignored, ...data } = parsed.data;
  void _ignored;
  const row = await prisma.landParcelProgram.create({ data: { ...data, parcelUid: parcel.parcelUid, createdBy: await userId() }, select: { id: true } });
  return { success: true, data: row };
}

export async function updateLandParcelProgram(input: unknown): Promise<Result> {
  if (!(await hasPermission(MENU, "EDIT"))) return { success: false, error: "Tidak memiliki izin untuk mengubah program" };
  const parsed = updateLandParcelProgramSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors as FieldErrors };
  const { id, ...data } = parsed.data;
  const existing = await prisma.landParcelProgram.findFirst({ where: { id, isActive: true, ...(await satelliteScope()) }, select: { id: true } });
  if (!existing) return { success: false, error: "Program tidak ditemukan atau di luar akses Anda" };
  await prisma.landParcelProgram.update({ where: { id }, data: { ...data, modifiedBy: await userId() } });
  return { success: true, data: { id } };
}

// ─── Nonaktifkan (soft delete) ───

/** Nonaktifkan satu record satelit (dokumen / UL Parcel Code / program). STDB dilepas lewat `unlinkLandStdb`. */
export async function deactivateLandParcelSatellite(kind: Exclude<SatelliteKind, "stdb">, id: string): Promise<ActionResult> {
  if (!(await hasPermission(MENU, "DELETE"))) return { success: false, error: "Tidak memiliki izin untuk menonaktifkan data ini" };
  const scope = await satelliteScope();
  const uid = await userId();
  const table = kind === "document" ? prisma.landParcelDocument : kind === "externalId" ? prisma.landParcelExternalId : prisma.landParcelProgram;
  // Ketiga delegate punya bentuk where/data yang sama untuk operasi ini.
  const existing = await (table as typeof prisma.landParcelDocument).findFirst({ where: { id, isActive: true, ...scope }, select: { id: true } });
  if (!existing) return { success: false, error: "Data tidak ditemukan atau di luar akses Anda" };
  await (table as typeof prisma.landParcelDocument).update({ where: { id }, data: { isActive: false, modifiedBy: uid } });
  return { success: true };
}
