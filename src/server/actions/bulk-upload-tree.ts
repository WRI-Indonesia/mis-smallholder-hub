"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerRelationAccessFilter } from "@/lib/access-context";
import { parseShapefileZip } from "@/lib/shapefile-server";
import { bulkCreateTreesSchema, type BulkCreateTreesInput } from "@/validations/tree.schema";
import { formatFieldErrors } from "@/lib/validation-message";
import type { ActionResult } from "@/types/action-result";

/**
 * Urai ZIP shapefile titik pohon (#238) — mesin parse bersama dengan upload
 * Lahan (`lib/shapefile-server.ts`, termasuk workaround proj4 CEA); dipisah
 * sebagai action karena guard menunya berbeda.
 */
export async function parseTreeShapefile(base64Data: string) {
  if (!(await hasPermission("bulk-upload-trees", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  return parseShapefileZip(base64Data);
}

export interface TreeUploadParcel {
  id: string;
  parcelId: string;
  area: number | null;
  farmerName: string;
  /** Jumlah pohon aktif saat ini (0 = belum ada; >0 = upload akan jadi revisi). */
  activeTreeCount: number;
}

export interface TreeUploadMatchResult {
  /** Lahan aktif dalam scope yang cocok dengan parcel_id file (non-ambigu). */
  parcels: TreeUploadParcel[];
  /** parcel_id terdaftar aktif pada >1 petani secara GLOBAL — akan ditolak
   *  server saat simpan (paritas cek `bulkCreateTrees`), tandai dini di preview. */
  ambiguousParcelIds: string[];
}

/**
 * Cocokkan parcel_id dari file yang diunggah dengan lahan aktif dalam scope +
 * jumlah pohon aktifnya — dipanggil klien SETELAH parse, hanya untuk id yang
 * ada di file. (Dulu `getTreeUploadParcels` mengirim SEMUA lahan aktif dalam
 * scope saat halaman dibuka — payload RSC multi-MB pada scope ALL, temuan #241.)
 */
export async function matchTreeUploadParcels(
  parcelIds: string[],
): Promise<TreeUploadMatchResult> {
  if (!(await hasPermission("bulk-upload-trees", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
  const ids = [...new Set(parcelIds)].filter((id) => typeof id === "string" && id.length > 0);
  if (ids.length === 0) return { parcels: [], ambiguousParcelIds: [] };

  const access = await getAccessContext();

  // Ambiguitas WAJIB dihitung global (tanpa filter scope) — paritas dengan
  // `bulkCreateTrees`: kembaran milik petani di luar scope tetap membuat id
  // tak bisa dipetakan. Query hanya membocorkan jumlah, bukan data petani lain.
  const [parcels, globalCounts] = await Promise.all([
    prisma.landParcel.findMany({
      where: { parcelId: { in: ids }, isActive: true, ...farmerRelationAccessFilter(access) },
      select: {
        id: true,
        parcelId: true,
        area: true,
        farmer: { select: { name: true } },
      },
      orderBy: { parcelId: "asc" },
    }),
    prisma.landParcel.groupBy({
      by: ["parcelId"],
      where: { parcelId: { in: ids }, isActive: true },
      _count: { _all: true },
    }),
  ]);

  const ambiguous = new Set(
    globalCounts.filter((g) => g._count._all > 1).map((g) => g.parcelId),
  );
  const matched = parcels.filter((p) => !ambiguous.has(p.parcelId));

  const grouped = await prisma.tree.groupBy({
    by: ["landParcelId"],
    where: { landParcelId: { in: matched.map((p) => p.id) }, isActive: true },
    _count: { _all: true },
  });
  const byParcel = new Map(grouped.map((g) => [g.landParcelId, g._count._all]));

  return {
    parcels: matched.map((p) => ({
      id: p.id,
      parcelId: p.parcelId,
      area: p.area,
      farmerName: p.farmer.name,
      activeTreeCount: byParcel.get(p.id) ?? 0,
    })),
    ambiguousParcelIds: [...ambiguous].sort(),
  };
}

/**
 * Simpan set pohon per lahan. Upload ulang untuk lahan yang sama =
 * revisi set: seluruh pohon aktif lahan tsb dinonaktifkan, set baru masuk
 * dengan revision + 1 (idiom revisi LandParcel, diterapkan per-set).
 */
export async function bulkCreateTrees(
  input: BulkCreateTreesInput,
): Promise<ActionResult<{ parcels: number; trees: number }>> {
  if (!(await hasPermission("bulk-upload-trees", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menyimpan data" };
  }

  const parsed = bulkCreateTreesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: formatFieldErrors(parsed.error.flatten().fieldErrors, "Data tidak lolos validasi"),
    };
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Scope: semua parcel_id harus resolve ke lahan aktif dalam jurisdiksi user.
  const access = await getAccessContext();
  const parcelIds = parsed.data.groups.map((g) => g.parcelId);
  const parcels = await prisma.landParcel.findMany({
    where: { parcelId: { in: parcelIds }, isActive: true, ...farmerRelationAccessFilter(access) },
    select: { id: true, parcelId: true },
  });

  // parcelId hanya unik per petani — id yang dipakai >1 petani tidak bisa
  // dipetakan dengan aman, tolak eksplisit (jangan diam-diam pilih salah satu).
  // Hitungannya WAJIB global (tanpa filter scope): bila kembarannya milik
  // petani di luar akses user, versi ter-scope hanya melihat satu baris dan
  // diam-diam menempelkan seluruh titik ke lahan yang salah (temuan review
  // 2026-08-10). Query ini hanya membocorkan jumlah, bukan data petani lain.
  const globalCounts = await prisma.landParcel.groupBy({
    by: ["parcelId"],
    where: { parcelId: { in: parcelIds }, isActive: true },
    _count: { _all: true },
  });
  const countPerParcelId = new Map(globalCounts.map((g) => [g.parcelId, g._count._all]));
  const ambiguous = parcelIds.filter((pid) => (countPerParcelId.get(pid) ?? 0) > 1);
  if (ambiguous.length > 0) {
    return {
      success: false,
      error: `ID Lahan terdaftar pada lebih dari satu petani (ambigu, tidak bisa dicocokkan otomatis): ${ambiguous.join(", ")}`,
    };
  }

  const parcelByBusinessId = new Map(parcels.map((p) => [p.parcelId, p.id]));
  const missing = parcelIds.filter((pid) => !parcelByBusinessId.has(pid));
  if (missing.length > 0) {
    return {
      success: false,
      error: `Lahan tidak ditemukan/di luar akses Anda: ${missing.join(", ")}`,
    };
  }

  const sourceFile = parsed.data.sourceFile ?? null;
  const totalTrees = parsed.data.groups.reduce((sum, g) => sum + g.rows.length, 0);

  try {
    // Batch tetap 3 query berapa pun jumlah lahan (groupBy → updateMany →
    // createMany) agar transaksi tidak menabrak timeout pada ZIP multi-lahan
    // besar; timeout dinaikkan mengikuti preseden role-permission.ts.
    await prisma.$transaction(
      async (tx) => {
        const landParcelIds = parsed.data.groups.map(
          (g) => parcelByBusinessId.get(g.parcelId)!,
        );

        const prev = await tx.tree.groupBy({
          by: ["landParcelId"],
          where: { landParcelId: { in: landParcelIds }, isActive: true },
          _max: { revision: true },
        });
        const prevRevision = new Map(prev.map((p) => [p.landParcelId, p._max.revision]));

        if (prev.length > 0) {
          await tx.tree.updateMany({
            where: { landParcelId: { in: prev.map((p) => p.landParcelId) }, isActive: true },
            data: { isActive: false, modifiedBy: userId },
          });
        }

        await tx.tree.createMany({
          data: parsed.data.groups.flatMap((group) => {
            const landParcelId = parcelByBusinessId.get(group.parcelId)!;
            const prevMax = prevRevision.get(landParcelId);
            const revision = prevMax != null ? prevMax + 1 : 0;
            return group.rows.map((row) => ({
              landParcelId,
              parcelId: group.parcelId,
              treeId: row.treeId,
              sequenceNo: row.sequenceNo,
              longitude: row.longitude,
              latitude: row.latitude,
              category: row.category,
              vigor: row.vigor,
              source: row.source,
              modelVersion: row.modelVersion,
              sourceFile,
              revision,
              createdBy: userId,
            }));
          }),
        });
      },
      { timeout: 20_000 },
    );

    return { success: true, data: { parcels: parsed.data.groups.length, trees: totalTrees } };
  } catch (error) {
    console.error("Bulk save trees error:", error);
    // Pesan Prisma berbahasa Inggris + memuat nama tabel/kolom internal —
    // terjemahkan ke pesan yang bisa ditindaklanjuti (pola bulkCreateFarmers).
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: string }).code;
      if (code === "P2028") {
        return {
          success: false,
          error:
            "Waktu penyimpanan habis — berkas terlalu besar. Pecah ZIP menjadi beberapa bagian lalu unggah bertahap.",
        };
      }
    }
    return {
      success: false,
      error: "Gagal menyimpan data pohon ke database. Coba lagi; bila berulang, laporkan ke admin.",
    };
  }
}
