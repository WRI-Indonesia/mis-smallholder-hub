"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerRelationAccessFilter } from "@/lib/access-context";
import type { ParcelRef } from "@/lib/land-parcel-detail-import";
import { applyLandParcelDetailRows, emptyParcelDetailSummary, type ParcelDetailSaveSummary } from "@/lib/land-parcel-detail-save";
import { landParcelDetailBatchSchema } from "@/validations/land-parcel-detail.schema";
import type { ActionResult } from "@/types/action-result";

/**
 * Import detail lahan dari Excel (#296) — surat kepemilikan, STDB, kode
 * vendor — menempel ke `parcelUid` (identitas stabil antar revisi), bukan ke
 * baris revisi lahan. Menumpang izin menu `bulk-upload-parcels` (keputusan
 * owner 2026-08-27: tab kedua di halaman Upload Lahan, tanpa menu baru).
 */

/** Lahan aktif dalam scope user, dipakai klien untuk mencocokkan (ID Petani, ID Lahan). */
export async function getParcelsForDetailMapping(): Promise<ParcelRef[]> {
  if (!(await hasPermission("bulk-upload-parcels", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const access = await getAccessContext();
  const rows = await prisma.landParcel.findMany({
    where: { ...farmerRelationAccessFilter(access), isActive: true },
    select: {
      parcelUid: true,
      parcelId: true,
      farmerId: true,
      subGroupLv2: true,
      farmer: { select: { farmerId: true, name: true } },
    },
    orderBy: { parcelId: "asc" },
  });
  return rows.map((r) => ({
    parcelUid: r.parcelUid,
    parcelId: r.parcelId,
    farmerCode: r.farmer.farmerId,
    farmerName: r.farmer.name,
    farmerDbId: r.farmerId,
    subGroupLv2: r.subGroupLv2,
  }));
}

/** Simpan batch — guard izin/scope/Zod di sini, inti upsert di `applyLandParcelDetailRows`. */
/** 500 baris ≈ 5 findMany + createMany + update hanya yang berubah — jauh di bawah 60 dtk. */
const PARCEL_DETAIL_CHUNK_SIZE = 500;
const PARCEL_DETAIL_TX_TIMEOUT_MS = 60_000;

export async function bulkSaveLandParcelDetails(
  input: unknown,
): Promise<ActionResult<ParcelDetailSaveSummary>> {
  if (!(await hasPermission("bulk-upload-parcels", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menyimpan data" };
  }

  const parsed = landParcelDetailBatchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Data yang dikirim tidak valid — ulangi validasi lalu simpan kembali" };
  }
  const rows = parsed.data;

  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Scope: setiap parcelUid harus milik lahan aktif dalam jurisdiksi user, dan
  // farmerDbId yang dikirim klien harus sama dengan pemilik identitas —
  // klien tidak dipercaya menentukan pemilik.
  const access = await getAccessContext();
  const uids = [...new Set(rows.map((r) => r.parcelUid))];
  const owned = await prisma.landParcel.findMany({
    where: { parcelUid: { in: uids }, isActive: true, ...farmerRelationAccessFilter(access) },
    select: { parcelUid: true, farmerId: true, parcelId: true },
  });
  const ownerByUid = new Map(owned.map((p) => [p.parcelUid, p]));
  for (const r of rows) {
    const o = ownerByUid.get(r.parcelUid);
    if (!o) {
      return { success: false, error: `ID Lahan "${r.parcelId}" tidak ditemukan, nonaktif, atau di luar akses Anda` };
    }
    if (o.farmerId !== r.farmerDbId) {
      return { success: false, error: `ID Lahan "${r.parcelId}" bukan milik petani yang dikirim` };
    }
  }

  const summary = emptyParcelDetailSummary(rows.length);

  // Chunk per transaksi (#300): tiap chunk = prefetch → plan → createMany/update,
  // bukan N×7 query serial. Chunk yang gagal tidak membatalkan chunk sebelumnya —
  // unggah ulang aman karena semantik upsert (baris tersimpan jadi "tanpa perubahan").
  let saved = 0;
  try {
    for (let i = 0; i < rows.length; i += PARCEL_DETAIL_CHUNK_SIZE) {
      const chunk = rows.slice(i, i + PARCEL_DETAIL_CHUNK_SIZE);
      await prisma.$transaction(
        async (tx) => {
          await applyLandParcelDetailRows(tx, chunk, userId, summary);
        },
        { timeout: PARCEL_DETAIL_TX_TIMEOUT_MS },
      );
      saved += chunk.length;
    }
    return { success: true, data: summary };
  } catch (error) {
    console.error("Bulk save land parcel details error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `${saved} dari ${rows.length} baris sudah tersimpan sebelum gagal — perbaiki lalu unggah ulang berkas yang sama (baris tersimpan tidak digandakan). ${message || "Gagal menyimpan data ke database"}`,
    };
  }
}
