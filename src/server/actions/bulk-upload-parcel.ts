"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { landParcelSchema, type LandParcelInput } from "@/validations/land-parcel.schema";
import { landParcelBorderSidesSchema, type LandParcelBorderSidesInput } from "@/validations/land-parcel-satellite.schema";
import { formatFieldErrors } from "@/lib/validation-message";
import { getAccessContext } from "@/lib/access-context";
import { parcelIdentityUpsertArgs } from "@/lib/land-parcel-identity";
import { parseShapefileZip } from "@/lib/shapefile-server";
import { groupScopeSql } from "@/lib/access-scope-sql";
import { buildUploadOverlapWarnings, uploadOverlapMessages, type UploadOverlapRaw } from "@/lib/parcel-overlap";
import { uploadOverlapInputSchema } from "@/validations/parcel-topology.schema";
import type { ActionResult } from "@/types/action-result";

export async function parseShapefile(base64Data: string) {
  if (!(await hasPermission("bulk-upload-parcels", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  return parseShapefileZip(base64Data);
}

export async function getFarmersForMapping() {
  if (!(await hasPermission("bulk-upload-parcels", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { farmerGroupId: { in: access.ids } } :
    access.mode === "BY_DISTRICT" ? { farmerGroup: { districtId: { in: access.ids } } } :
    {};

  return prisma.farmer.findMany({
    where: { ...accessFilter, isActive: true },
    select: {
      id: true,
      name: true,
      farmerId: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getExistingParcelIds() {
  if (!(await hasPermission("bulk-upload-parcels", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { farmer: { farmerGroupId: { in: access.ids } } } :
    access.mode === "BY_DISTRICT" ? { farmer: { farmerGroup: { districtId: { in: access.ids } } } } :
    {};

  return prisma.landParcel.findMany({
    where: { ...accessFilter, isActive: true },
    select: {
      farmerId: true,
      parcelId: true,
      geometry: true,
      revision: true,
    },
  });
}

function isGeometryEqual(g1: unknown, g2: unknown) {
  if (!g1 || !g2) return false;
  try {
    const obj1 = (typeof g1 === "string" ? JSON.parse(g1) : g1) as { coordinates?: unknown };
    const obj2 = (typeof g2 === "string" ? JSON.parse(g2) : g2) as { coordinates?: unknown };
    return JSON.stringify(obj1.coordinates) === JSON.stringify(obj2.coordinates);
  } catch {
    return false;
  }
}

export async function bulkCreateLandParcels(
  dataList: Record<string, unknown>[]
): Promise<ActionResult<{ count: number }>> {
  if (!(await hasPermission("bulk-upload-parcels", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menyimpan data" };
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  // CRIT-3: Validasi semua farmerId ada dalam scope akses user
  const access = await getAccessContext();
  if (access.mode !== "ALL") {
    const accessFilter =
      access.mode === "BY_FARMER_GROUP" ? { farmerGroupId: { in: access.ids } } :
      { farmerGroup: { districtId: { in: access.ids } } };

    const allowedFarmers = await prisma.farmer.findMany({
      where: { ...accessFilter, isActive: true },
      select: { id: true },
    });
    const allowedFarmerIds = new Set(allowedFarmers.map((f) => f.id));

    const unauthorizedRow = dataList.find((item) => !allowedFarmerIds.has(item.farmerId as string));
    if (unauthorizedRow) {
      return {
        success: false,
        error: `Tidak memiliki izin untuk membuat lahan bagi petani dengan ID: "${String(unauthorizedRow.farmerId)}"`,
      };
    }
  }

  // Validate all records before saving. Sepadan (#326) divalidasi TERPISAH:
  // `landParcelSchema` menulis ke LandParcel (dan membuang kunci asing), sedangkan
  // sepadan menempel ke identitas lahan — ikut skema lahan berarti hilang di
  // revisi berikutnya, persis masalah yang dihindari keputusan owner.
  const validatedRecords: Array<LandParcelInput & { revision?: number; border: LandParcelBorderSidesInput | null }> = [];
  for (const item of dataList) {
    const parsed = landParcelSchema.safeParse(item);
    if (!parsed.success) {
      return {
        success: false,
        error: formatFieldErrors(
          parsed.error.flatten().fieldErrors,
          "Ada baris yang tidak lolos validasi",
        ),
      };
    }
    let border: LandParcelBorderSidesInput | null = null;
    if (item.border != null) {
      const sides = landParcelBorderSidesSchema.safeParse(item.border);
      if (!sides.success) {
        return { success: false, error: formatFieldErrors(sides.error.flatten().fieldErrors, "Ada sepadan yang tidak lolos validasi") };
      }
      border = sides.data;
    }
    validatedRecords.push({ ...parsed.data, border });
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Prefetch semua pasangan aktif (farmerId, parcelId) dalam satu query
      // (audit #233) — semula findFirst per baris = N round-trip. Loop create
      // per-baris TETAP: dibutuhkan revision tracking + repoint produksi/pohon
      // (TD-022/#238). Map di-update setiap create agar pasangan yang muncul
      // dua kali dalam satu batch tetap terdeteksi duplikat (perilaku setara
      // findFirst dalam transaksi yang melihat tulisan sendiri).
      const pairKey = (farmerId: string, parcelId: string) => `${farmerId}\u0000${parcelId}`;
      const existing = await tx.landParcel.findMany({
        where: {
          isActive: true,
          OR: [...new Map(
            validatedRecords.map((r) => [pairKey(r.farmerId, r.parcelId), { farmerId: r.farmerId, parcelId: r.parcelId }])
          ).values()],
        },
        select: { id: true, farmerId: true, parcelId: true, revision: true, geometry: true },
      });
      const activeByPair = new Map(
        existing.map((d) => [pairKey(d.farmerId, d.parcelId), { id: d.id, revision: d.revision, geometry: d.geometry }])
      );

      for (const { border, ...record } of validatedRecords) {
        const duplicate = activeByPair.get(pairKey(record.farmerId, record.parcelId)) ?? null;

        let finalRevision = record.revision ?? 0;

        if (duplicate) {
          if (isGeometryEqual(duplicate.geometry, record.geometry)) {
            throw new Error(`ID Lahan "${record.parcelId}" sudah terdaftar untuk petani tersebut dengan polygon yang sama`);
          } else {
            // Set old active record to inactive
            await tx.landParcel.update({
              where: { id: duplicate.id },
              data: { isActive: false },
            });
            finalRevision = duplicate.revision + 1;
          }
        }

        // Identitas stabil antar revisi (Decision Log 2026-08-27): revisi
        // memakai identitas yang sama, sehingga satelit (dokumen/STDB/dll.)
        // tak perlu ikut di-repoint seperti produksi & pohon di bawah.
        const identity = await tx.landParcelIdentity.upsert(parcelIdentityUpsertArgs(record, userId));

        // Sepadan (#326) ke satelit identitas: sisi TERISI menimpa, sisi kosong
        // dibiarkan (tidak mengosongkan) — pola yang sama dengan import Excel.
        const filledSides = border
          ? Object.fromEntries(Object.entries(border).filter(([, v]) => typeof v === "string" && v.length > 0))
          : {};
        if (Object.keys(filledSides).length > 0) {
          await tx.landParcelBorder.upsert({
            where: { parcelUid: identity.id },
            create: { ...filledSides, parcelUid: identity.id, createdBy: userId },
            update: { ...filledSides, modifiedBy: userId },
          });
        }

        const created = await tx.landParcel.create({
          data: {
            ...record,
            parcelUid: identity.id,
            geometry: record.geometry ?? null,
            revision: finalRevision,
            createdBy: userId,
          },
          select: { id: true },
        });

        // Revisi = baris lahan BARU (id baru), baris lama dinonaktifkan. Produksi
        // masih menunjuk id lama, jadi harus ikut dipindahkan — kalau tidak,
        // atribusi per-lahan putus: lahan terbaca "tanpa data produksi" padahal
        // tonasenya tetap masuk pembilang produktivitas BMP (TD-022).
        // Semua revisi ikut dipindah (bukan hanya yang aktif) agar riwayat utuh.
        if (duplicate) {
          await tx.productionRecord.updateMany({
            where: { parcelId: duplicate.id },
            data: { parcelId: created.id, modifiedBy: userId },
          });
          // Titik pohon (#238) juga menunjuk id baris lahan — ikut repoint
          // dengan alasan yang sama; semua revisi pohon dipindah agar utuh.
          await tx.tree.updateMany({
            where: { landParcelId: duplicate.id },
            data: { landParcelId: created.id, modifiedBy: userId },
          });
        }

        // Baris yang baru dibuat kini jadi baris aktif untuk pasangan ini.
        activeByPair.set(pairKey(record.farmerId, record.parcelId), {
          id: created.id,
          revision: finalRevision,
          geometry: record.geometry ?? null,
        });
      }
    });

    return { success: true, data: { count: validatedRecords.length } };
  } catch (error) {
    console.error("Bulk save land parcels error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message || "Gagal menyimpan data ke database" };
  }
}

/**
 * Guard tumpang tindih saat bulk upload shapefile (#317 Fase 3, keputusan owner
 * 2026-09-01: PERINGATAN, tidak memblokir simpan). Poligon baris berkas yang lolos
 * validasi diurai on-the-fly (`ST_GeomFromGeoJSON`, ekspresi sama dengan kolom generated
 * `geom`) lalu diadu ke (a) lahan aktif di DB lewat GiST dan (b) sesama baris berkas.
 *
 * Revisi lahan itu sendiri (petani + ID Lahan sama → baris lama dinonaktifkan saat
 * simpan) tidak dihitung; pencocokan persis seperti `bulkCreateLandParcels`. Baris yang
 * petaninya di luar scope dibuang (sama dengan simpan). PENGECUALIAN SCOPE tercatat
 * (#317, docs/product/access-context.md): lahan lawan di DB dicari di SELURUH data dan
 * identitasnya ditampilkan — tanpa itu klaim ganda lintas Lembaga tak terlihat.
 *
 * Hasil: `{ [rowNum]: pesan[] }` — hanya baris yang punya peringatan.
 */
export async function checkUploadParcelOverlaps(
  rows: { rowNum: number; farmerId: string; parcelId: string; geometry: string }[]
): Promise<ActionResult<Record<number, string[]>>> {
  if (!(await hasPermission("bulk-upload-parcels", "VIEW"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengakses data ini" };
  }
  const parsed = uploadOverlapInputSchema.safeParse(rows);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Data cek tumpang tindih tidak valid" };
  if (parsed.data.length === 0) return { success: true, data: {} };

  const access = await getAccessContext();
  const inScope = groupScopeSql("g", access);
  const c = parsed.data;
  try {
    const raws = await prisma.$queryRaw<UploadOverlapRaw[]>`
      WITH cand AS MATERIALIZED (
        SELECT c.row_num, c.farmer_id, c.parcel_id, f.farmer_group_id AS group_id,
               ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(c.gj), 4326)), 3)) AS geom
        FROM unnest(${c.map((r) => r.rowNum)}::int[], ${c.map((r) => r.farmerId)}::text[],
                    ${c.map((r) => r.parcelId)}::text[], ${c.map((r) => r.geometry)}::text[])
             AS c(row_num, farmer_id, parcel_id, gj)
        JOIN tbl_farmer f ON f.id = c.farmer_id AND f.is_active
        JOIN tbl_farmer_group g ON g.id = f.farmer_group_id AND g.is_active
        WHERE ${inScope}
      ),
      cand_ok AS MATERIALIZED (SELECT * FROM cand WHERE NOT ST_IsEmpty(geom))
      SELECT c.row_num AS "rowNum", 'DB' AS source, NULL::int AS "otherRowNum",
             ST_Area(ST_Intersection(c.geom, b.geom)::geography) AS "intersectionM2",
             ST_Area(c.geom::geography) AS "rowAreaM2", c.farmer_id AS "rowFarmerId", c.group_id AS "rowGroupId",
             b.parcel_id AS "otherParcelId", ST_Area(b.geom::geography) AS "otherAreaM2",
             fb.id AS "otherFarmerId", fb.farmer_id AS "otherFarmerCode", fb.name AS "otherFarmerName",
             gb.id AS "otherGroupId", gb.name AS "otherGroupName"
      FROM cand_ok c
      JOIN tbl_land_parcel b
        ON b.is_active AND b.geom IS NOT NULL
       AND ST_Intersects(c.geom, b.geom) AND NOT ST_Touches(c.geom, b.geom)
       AND NOT (b.farmer_id = c.farmer_id AND b.parcel_id = c.parcel_id)
      JOIN tbl_farmer fb ON fb.id = b.farmer_id AND fb.is_active
      JOIN tbl_farmer_group gb ON gb.id = fb.farmer_group_id AND gb.is_active
      UNION ALL
      SELECT a.row_num, 'FILE', o.row_num,
             ST_Area(ST_Intersection(a.geom, o.geom)::geography),
             ST_Area(a.geom::geography), a.farmer_id, a.group_id,
             o.parcel_id, ST_Area(o.geom::geography),
             fo.id, fo.farmer_id, fo.name, go.id, go.name
      FROM cand_ok a
      JOIN cand_ok o ON o.row_num <> a.row_num AND ST_Intersects(a.geom, o.geom) AND NOT ST_Touches(a.geom, o.geom)
      JOIN tbl_farmer fo ON fo.id = o.farmer_id
      JOIN tbl_farmer_group go ON go.id = fo.farmer_group_id
    `;
    const warnings = buildUploadOverlapWarnings(
      // Angka dari PostGIS bisa datang sebagai string (numeric) — normalkan.
      raws.map((r) => ({
        ...r,
        rowNum: Number(r.rowNum),
        otherRowNum: r.otherRowNum == null ? null : Number(r.otherRowNum),
        intersectionM2: Number(r.intersectionM2),
        rowAreaM2: Number(r.rowAreaM2),
        otherAreaM2: Number(r.otherAreaM2),
      }))
    );
    return { success: true, data: Object.fromEntries([...warnings].map(([rowNum, list]) => [rowNum, uploadOverlapMessages(list)])) };
  } catch (error) {
    // GeoJSON rusak di satu baris membuat seluruh kueri gagal — cek ini hanya peringatan,
    // jadi kegagalan tidak boleh menghalangi simpan; pemanggil menampilkan pemberitahuan.
    console.error("checkUploadParcelOverlaps", error);
    return { success: false, error: "Cek tumpang tindih gagal dijalankan — data tetap bisa disimpan" };
  }
}
