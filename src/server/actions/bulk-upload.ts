"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerGroupAccessFilter } from "@/lib/access-context";
import { farmerSchema, type FarmerInput } from "@/validations/farmer.schema";
import type { ActionResult } from "@/types/action-result";

export async function getFarmerGroupsForMapping() {
  if (!(await hasPermission("bulk-upload-farmers", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  return prisma.farmerGroup.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      code: true,
    },
  });
}

/**
 * ID petani yang sudah dipakai **di satu Lembaga** — untuk memvalidasi berkas
 * unggahan sebelum disimpan.
 *
 * Keunikan `farmerId` berlaku **per Lembaga** (TD-024), jadi pemeriksaannya
 * dibatasi ke lembaga tujuan. Sebelumnya query ini mengambil seluruh `farmerId`
 * di database tanpa filter apa pun: aturannya jadi lebih ketat daripada yang
 * ditegakkan sistem, **dan** membocorkan keberadaan ID di luar wilayah kerja
 * pengguna (melanggar lapisan data-access).
 *
 * Baris nonaktif ikut dihitung — constraint DB tidak mengenal soft delete.
 */
export async function getExistingFarmerIds(farmerGroupId: string) {
  if (!(await hasPermission("bulk-upload-farmers", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  // Lembaga tujuan wajib berada dalam scope pengguna. `AND` (bukan spread) agar
  // filter `{ id: { in } }` pada mode BY_FARMER_GROUP tidak menimpa literal `id`.
  const access = await getAccessContext();
  const group = await prisma.farmerGroup.findFirst({
    where: { id: farmerGroupId, isActive: true, AND: farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!group) throw new Error("Lembaga petani tidak ditemukan atau di luar akses Anda");

  const farmers = await prisma.farmer.findMany({
    where: { farmerGroupId },
    select: { farmerId: true },
  });

  return farmers.map((f) => f.farmerId);
}

export async function bulkCreateFarmers(
  dataList: Record<string, unknown>[],
): Promise<ActionResult<{ count: number }>> {
  if (!(await hasPermission("bulk-upload-farmers", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menyimpan data" };
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Validate all records before saving
  const validatedRecords: FarmerInput[] = [];
  for (const item of dataList) {
    const parsed = farmerSchema.safeParse(item);
    if (!parsed.success) {
      return {
        success: false,
        error: `Validasi gagal pada salah satu baris: ${JSON.stringify(
          parsed.error.flatten().fieldErrors,
        )}`,
      };
    }
    validatedRecords.push(parsed.data);
  }

  // Validasi semua lembaga tani target berada dalam scope data-access user.
  const access = await getAccessContext();
  if (access.mode !== "ALL") {
    const allowedGroups = await prisma.farmerGroup.findMany({
      where: { ...farmerGroupAccessFilter(access), isActive: true },
      select: { id: true },
    });
    const allowedGroupIds = new Set(allowedGroups.map((g) => g.id));

    const unauthorized = validatedRecords.find((r) => !allowedGroupIds.has(r.farmerGroupId));
    if (unauthorized) {
      return {
        success: false,
        error: `Tidak memiliki izin untuk menambah petani ke lembaga tani dengan ID: "${unauthorized.farmerGroupId}"`,
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const record of validatedRecords) {
        await tx.farmer.create({
          data: {
            ...record,
            createdBy: userId,
          },
        });
      }
    });

    return { success: true, data: { count: validatedRecords.length } };
  } catch (error) {
    console.error("Bulk save error:", error);
    // Pesan Prisma memuat nama tabel/kolom internal dan tak bisa ditindaklanjuti
    // pengguna. Kasus yang paling mungkin — ID Petani bentrok di lembaga yang
    // sama (@@unique, TD-024) — diterjemahkan ke bahasa yang bisa dikerjakan.
    if (typeof error === "object" && error !== null && "code" in error) {
      if ((error as { code?: string }).code === "P2002") {
        return {
          success: false,
          error:
            "Ada ID Petani yang sudah terdaftar di lembaga ini. Jalankan Validasi Data sekali lagi untuk menandai barisnya, lalu keluarkan dari berkas.",
        };
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message || "Gagal menyimpan data ke database" };
  }
}
