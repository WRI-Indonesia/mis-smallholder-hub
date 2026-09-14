"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerRelationAccessFilter, farmerGroupAccessFilter, type AccessContext } from "@/lib/access-context";
import { s3, S3_BUCKET, getPresignedUrl } from "@/lib/s3";
import { isNktAffected } from "@/lib/land-parcel-satellite-format";
import {
  MARKER_MAX_DISTANCE_M,
  MARKER_MOVE_EPSILON_M,
  MARKER_PHOTO_MAX_BYTES,
  MARKER_PHOTO_TYPES,
  MARKER_SNAP_M,
  checkMarkerNearParcel,
  distanceMeters,
  planMarkersFromVertices,
  type MarkerCandidate,
} from "@/lib/land-marker";
import { distancesToParcelBoundary, fetchNearbyMarkers, fetchSimplifiedVertices } from "@/lib/land-marker-query";
import type { MarkerUploadParcelRef } from "@/lib/land-marker-upload";
import {
  createLandMarkerSchema,
  updateLandMarkerSchema,
  createMarkersFromPolygonSchema,
  renumberLandMarkersSchema,
  landMarkerUploadBatchSchema,
  type LandMarkerUploadRow,
} from "@/validations/land-marker.schema";
import type { ActionResult } from "@/types/action-result";
import type { LandMarkerItem, LandParcelMarkers } from "@/types/land-parcel";

/**
 * Patok batas lahan (#329). Izin menumpang menu Lahan (`master-data-parcels`):
 * VIEW baca/pratinjau · CREATE generate/tambah · EDIT ubah/urutkan/foto ·
 * DELETE lepas tautan. Scope diturunkan dari BARIS LAHAN yang diminta
 * (`resolveParcel`), lalu patok diakses lewat tautan `parcelUid`.
 *
 * Satu patok fisik dipakai bersama lahan berdampingan: mengubah koordinat/
 * kondisi/foto berlaku untuk semua lahan yang menautkannya.
 */
const MENU = "master-data-parcels";
type FieldErrors = Record<string, string[]>;
type Result<T = { id: string }> = ActionResult<T> | { success: false; error: FieldErrors };

const PARCEL_SELECT = { id: true, parcelUid: true, parcelId: true, revision: true, geometry: true } as const;

async function resolveParcel(landParcelId: string, access?: AccessContext) {
  const ctx = access ?? (await getAccessContext());
  return prisma.landParcel.findFirst({
    where: { id: landParcelId, isActive: true, ...farmerRelationAccessFilter(ctx) },
    select: PARCEL_SELECT,
  });
}

/** Pesan galat DB yang bisa ditindaklanjuti (unique nomor patok / tautan) — bukan teks Prisma mentah. */
function dbError(e: unknown, fallback: string): string {
  const code = typeof e === "object" && e !== null && "code" in e ? (e as { code?: string }).code : undefined;
  if (code === "P2002") return "Nomor patok bentrok dengan perubahan lain pada lahan ini — muat ulang halaman lalu coba lagi";
  console.error("land-marker:", e);
  return fallback;
}

async function userId() {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Nomor urut berikutnya untuk tautan aktif lahan — dipanggil DI DALAM transaksi penulisnya. */
async function nextSequenceNo(parcelUid: string, tx: Prisma.TransactionClient): Promise<number> {
  const agg = await tx.landParcelMarker.aggregate({ where: { parcelUid, isActive: true }, _max: { sequenceNo: true } });
  return (agg._max.sequenceNo ?? 0) + 1;
}

/** Guard ≤ MARKER_MAX_DISTANCE_M dari batas lahan (lat/long tertukar, desimal salah tempel). */
async function assertNearParcel(landParcelId: string, lon: number, lat: number): Promise<string | null> {
  const [d, dSwapped] = await distancesToParcelBoundary(landParcelId, [
    { lon, lat },
    { lon: lat, lat: lon },
  ]);
  return checkMarkerNearParcel({ lon, lat }, (p) => (p.lon === lon && p.lat === lat ? d : dSwapped), MARKER_MAX_DISTANCE_M);
}

// ─── Baca ───

export async function getLandParcelMarkers(landParcelId: string): Promise<LandParcelMarkers | null> {
  if (!(await hasPermission(MENU, "VIEW"))) throw new Error("Tidak memiliki izin untuk mengakses data ini");
  const access = await getAccessContext();
  const parcel = await resolveParcel(landParcelId, access);
  if (!parcel) return null;

  const links = await prisma.landParcelMarker.findMany({
    where: { parcelUid: parcel.parcelUid, isActive: true },
    orderBy: { sequenceNo: "asc" },
    select: {
      id: true,
      sequenceNo: true,
      sourceRevision: true,
      marker: {
        select: {
          id: true, longitude: true, latitude: true, source: true, condition: true, type: true,
          installedAt: true, installedBy: true, photoKey: true, photoName: true, notes: true, modifiedAt: true,
          // Lahan LAIN yang memakai patok yang sama + status NKT-nya (tanda turunan).
          parcels: {
            where: { isActive: true, parcelUid: { not: parcel.parcelUid } },
            select: {
              parcel: {
                select: {
                  parcelId: true,
                  nkt: { select: { status: true } },
                  farmer: { select: { name: true, farmerGroup: { select: { name: true } } } },
                  revisions: { where: { isActive: true }, select: { id: true, farmer: { select: { farmerGroupId: true, farmerGroup: { select: { districtId: true } } } } }, take: 1 },
                },
              },
            },
          },
        },
      },
    },
  });
  const ownNkt = await prisma.landParcelNkt.findUnique({ where: { parcelUid: parcel.parcelUid }, select: { status: true } });
  const ownAffected = isNktAffected(ownNkt?.status);

  const inScope = (p: { farmer: { farmerGroupId: string; farmerGroup: { districtId: string } } }) =>
    access.mode === "ALL" ||
    (access.mode === "BY_FARMER_GROUP" && access.ids.includes(p.farmer.farmerGroupId)) ||
    (access.mode === "BY_DISTRICT" && access.ids.includes(p.farmer.farmerGroup.districtId));

  const markers: LandMarkerItem[] = await Promise.all(
    links.map(async (l) => {
      const m = l.marker;
      const shared = m.parcels.map((x) => {
        const active = x.parcel.revisions[0];
        return {
          parcelId: x.parcel.parcelId,
          landParcelId: active && inScope(active) ? active.id : null,
          farmerName: x.parcel.farmer.name,
          groupName: x.parcel.farmer.farmerGroup.name,
          nktAffected: isNktAffected(x.parcel.nkt?.status),
        };
      });
      return {
        linkId: l.id,
        id: m.id,
        sequenceNo: l.sequenceNo,
        sourceRevision: l.sourceRevision,
        longitude: m.longitude,
        latitude: m.latitude,
        source: m.source,
        condition: m.condition,
        type: m.type,
        installedAt: m.installedAt,
        installedBy: m.installedBy,
        photoKey: m.photoKey,
        photoName: m.photoName,
        photoUrl: m.photoKey ? await getPresignedUrl(m.photoKey, 60 * 60) : null,
        notes: m.notes,
        modifiedAt: m.modifiedAt,
        sharedWith: shared,
        // Turunan: lahan ini ATAU salah satu lahan lain yang memakai patok ini kena NKT.
        nkt: ownAffected || shared.some((x) => x.nktAffected),
      };
    }),
  );

  return {
    parcelUid: parcel.parcelUid,
    revision: parcel.revision,
    hasGeometry: parcel.geometry != null,
    // Petunjuk "poligon berubah sejak patok dibuat": ada tautan dari revisi lebih lama.
    polygonChangedSince: markers.some((m) => m.sourceRevision != null && m.sourceRevision < parcel.revision),
    markers,
  };
}

// ─── Buat patok dari poligon ───

export async function previewMarkersFromPolygon(landParcelId: string): Promise<ActionResult<MarkerCandidate[]>> {
  if (!(await hasPermission(MENU, "VIEW"))) return { success: false, error: "Tidak memiliki izin untuk mengakses data ini" };
  const parcel = await resolveParcel(landParcelId);
  if (!parcel) return { success: false, error: "Lahan tidak ditemukan atau di luar akses Anda" };
  if (!parcel.geometry) return { success: false, error: "Lahan belum punya poligon — unggah shapefile lebih dulu" };
  const [vertices, nearby] = await Promise.all([fetchSimplifiedVertices(landParcelId), fetchNearbyMarkers(landParcelId, parcel.parcelUid)]);
  if (vertices.length === 0) return { success: false, error: "Poligon lahan tidak punya cukup vertex" };
  return { success: true, data: planMarkersFromVertices(vertices, nearby, MARKER_SNAP_M) };
}

export async function createMarkersFromPolygon(
  input: unknown,
): Promise<ActionResult<{ created: number; linked: number; skipped: number }>> {
  if (!(await hasPermission(MENU, "CREATE"))) return { success: false, error: "Tidak memiliki izin untuk membuat patok" };
  const parsed = createMarkersFromPolygonSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors.keepSequenceNos?.[0] ?? "Input tidak valid" };
  const parcel = await resolveParcel(parsed.data.landParcelId);
  if (!parcel) return { success: false, error: "Lahan tidak ditemukan atau di luar akses Anda" };
  if (!parcel.geometry) return { success: false, error: "Lahan belum punya poligon" };

  // Rencana dihitung ULANG di server (bukan dipercaya dari klien) — klien hanya
  // mengirim nomor vertex yang dicentang.
  const [vertices, nearby] = await Promise.all([fetchSimplifiedVertices(parcel.id), fetchNearbyMarkers(parcel.id, parcel.parcelUid)]);
  const plan = planMarkersFromVertices(vertices, nearby, MARKER_SNAP_M);
  const keep = new Set(parsed.data.keepSequenceNos);
  const uid = await userId();
  let created = 0, linked = 0, skipped = 0;

  try {
  await prisma.$transaction(async (tx) => {
    let seq = await nextSequenceNo(parcel.parcelUid, tx);
    for (const c of plan) {
      if (!keep.has(c.sequenceNo)) continue;
      if (c.alreadyLinked) { skipped++; continue; }
      let markerId = c.existingMarkerId;
      if (!markerId) {
        const m = await tx.landMarker.create({
          data: { longitude: c.lon, latitude: c.lat, source: "POLYGON_VERTEX", createdBy: uid },
          select: { id: true },
        });
        markerId = m.id;
        created++;
      } else {
        // Patok yang ada bisa nonaktif (semua tautannya pernah dilepas) — hidupkan lagi.
        await tx.landMarker.update({ where: { id: markerId }, data: { isActive: true, modifiedBy: uid } });
        linked++;
      }
      // Tautan lama nonaktif untuk pasangan ini → aktifkan ulang (unique parcelUid+markerId).
      const existingLink = await tx.landParcelMarker.findUnique({ where: { parcelUid_markerId: { parcelUid: parcel.parcelUid, markerId } }, select: { id: true } });
      if (existingLink) {
        await tx.landParcelMarker.update({ where: { id: existingLink.id }, data: { isActive: true, sequenceNo: seq++, sourceRevision: parcel.revision, modifiedBy: uid } });
      } else {
        await tx.landParcelMarker.create({
          data: { parcelUid: parcel.parcelUid, markerId, sequenceNo: seq++, sourceRevision: parcel.revision, createdBy: uid },
        });
      }
    }
  });
  } catch (e) {
    return { success: false, error: dbError(e, "Gagal menyimpan patok dari poligon") };
  }
  return { success: true, data: { created, linked, skipped } };
}

// ─── CRUD manual ───

export async function createLandMarker(input: unknown): Promise<Result> {
  if (!(await hasPermission(MENU, "CREATE"))) return { success: false, error: "Tidak memiliki izin untuk menambah patok" };
  const parsed = createLandMarkerSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors as FieldErrors };
  const parcel = await resolveParcel(parsed.data.landParcelId);
  if (!parcel) return { success: false, error: "Lahan tidak ditemukan atau di luar akses Anda" };
  if (parcel.geometry) {
    const err = await assertNearParcel(parcel.id, parsed.data.longitude, parsed.data.latitude);
    if (err) return { success: false, error: { longitude: [err] } };
  }
  const { landParcelId: _ignored, ...d } = parsed.data;
  void _ignored;
  const uid = await userId();
  try {
    // Nomor berikutnya dihitung di dalam transaksi — dua tab yang menambah bersamaan
    // tidak boleh sama-sama memilih nomor yang sama lalu satu gagal di unique index.
    const row = await prisma.$transaction(async (tx) => {
      const seq = await nextSequenceNo(parcel.parcelUid, tx);
      const m = await tx.landMarker.create({
        data: {
          longitude: d.longitude, latitude: d.latitude, source: "MANUAL", condition: d.condition, type: d.type ?? null,
          installedAt: d.installedAt ?? null, installedBy: d.installedBy ?? null, notes: d.notes ?? null, createdBy: uid,
        },
        select: { id: true },
      });
      await tx.landParcelMarker.create({ data: { parcelUid: parcel.parcelUid, markerId: m.id, sequenceNo: seq, createdBy: uid } });
      return m;
    }, { isolationLevel: "Serializable" });
    return { success: true, data: row };
  } catch (e) {
    return { success: false, error: dbError(e, "Gagal menambah patok") };
  }
}

export async function updateLandMarker(input: unknown): Promise<Result> {
  if (!(await hasPermission(MENU, "EDIT"))) return { success: false, error: "Tidak memiliki izin untuk mengubah patok" };
  const parsed = updateLandMarkerSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors as FieldErrors };
  const parcel = await resolveParcel(parsed.data.landParcelId);
  if (!parcel) return { success: false, error: "Lahan tidak ditemukan atau di luar akses Anda" };
  // Kepemilikan: patok harus tertaut aktif ke lahan ini — id patok lahan lain tak bisa ditebak.
  const link = await prisma.landParcelMarker.findFirst({
    where: { parcelUid: parcel.parcelUid, markerId: parsed.data.markerId, isActive: true },
    select: { id: true, marker: { select: { longitude: true, latitude: true, source: true } } },
  });
  if (!link) return { success: false, error: "Patok tidak ditemukan pada lahan ini" };
  const d = parsed.data;
  // Form mengirim ulang koordinat yang DIBULATKAN 6 desimal (≤ ~8 cm selisih dari
  // nilai tersimpan) — ambang 20 cm supaya ubah kondisi saja tidak dianggap
  // "digeser" (temuan review 2026-09-14); bila tak digeser, koordinat asli dibiarkan.
  const moved = distanceMeters({ lon: link.marker.longitude, lat: link.marker.latitude }, { lon: d.longitude, lat: d.latitude }) > MARKER_MOVE_EPSILON_M;
  if (moved && parcel.geometry) {
    const err = await assertNearParcel(parcel.id, d.longitude, d.latitude);
    if (err) return { success: false, error: { longitude: [err] } };
  }
  try {
    await prisma.landMarker.update({
      where: { id: d.markerId },
      data: {
        ...(moved ? { longitude: d.longitude, latitude: d.latitude } : {}),
        // Koordinat digeser tangan = hasil pengukuran, bukan lagi vertex poligon.
        source: moved && link.marker.source === "POLYGON_VERTEX" ? "GPS" : link.marker.source,
        condition: d.condition, type: d.type ?? null, installedAt: d.installedAt ?? null,
        installedBy: d.installedBy ?? null, notes: d.notes ?? null, modifiedBy: await userId(),
      },
    });
  } catch (e) {
    return { success: false, error: dbError(e, "Gagal menyimpan patok") };
  }
  return { success: true, data: { id: d.markerId } };
}

/** Lepas patok dari lahan; patok yang tak punya tautan aktif lagi ikut nonaktif (koordinat tetap tersimpan). */
export async function unlinkLandMarker(landParcelId: string, markerId: string): Promise<ActionResult> {
  if (!(await hasPermission(MENU, "DELETE"))) return { success: false, error: "Tidak memiliki izin untuk melepas patok" };
  const parcel = await resolveParcel(landParcelId);
  if (!parcel) return { success: false, error: "Lahan tidak ditemukan atau di luar akses Anda" };
  const uid = await userId();
  const link = await prisma.landParcelMarker.findFirst({ where: { parcelUid: parcel.parcelUid, markerId, isActive: true }, select: { id: true } });
  if (!link) return { success: false, error: "Patok tidak ditemukan pada lahan ini" };
  try {
    await prisma.$transaction(async (tx) => {
      await tx.landParcelMarker.update({ where: { id: link.id }, data: { isActive: false, modifiedBy: uid } });
      const remaining = await tx.landParcelMarker.count({ where: { markerId, isActive: true } });
      if (remaining === 0) await tx.landMarker.update({ where: { id: markerId }, data: { isActive: false, modifiedBy: uid } });
    });
  } catch (e) {
    return { success: false, error: dbError(e, "Gagal melepas patok") };
  }
  return { success: true };
}

/** Urutkan ulang nomor patok lahan (daftar markerId lengkap dalam urutan baru). */
export async function renumberLandMarkers(input: unknown): Promise<ActionResult> {
  if (!(await hasPermission(MENU, "EDIT"))) return { success: false, error: "Tidak memiliki izin untuk mengubah patok" };
  const parsed = renumberLandMarkersSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Input tidak valid" };
  const parcel = await resolveParcel(parsed.data.landParcelId);
  if (!parcel) return { success: false, error: "Lahan tidak ditemukan atau di luar akses Anda" };
  const links = await prisma.landParcelMarker.findMany({ where: { parcelUid: parcel.parcelUid, isActive: true }, select: { id: true, markerId: true } });
  const byMarker = new Map(links.map((l) => [l.markerId, l.id]));
  const order = parsed.data.order;
  if (order.length !== links.length || order.some((m) => !byMarker.has(m)) || new Set(order).size !== order.length) {
    return { success: false, error: "Daftar urutan harus memuat semua patok lahan ini, masing-masing sekali" };
  }
  const uid = await userId();
  try {
    await prisma.$transaction(async (tx) => {
      // Dua tahap agar partial unique (parcel_uid, sequence_no) tidak tertabrak di tengah.
      // Parkir di nomor NEGATIF — nomor positif berapa pun bisa sudah dipakai
      // (unggahan menerima nomor bebas, mis. 1000; temuan review 2026-09-14).
      for (let i = 0; i < order.length; i++) await tx.landParcelMarker.update({ where: { id: byMarker.get(order[i])! }, data: { sequenceNo: -(i + 1) } });
      for (let i = 0; i < order.length; i++) await tx.landParcelMarker.update({ where: { id: byMarker.get(order[i])! }, data: { sequenceNo: i + 1, modifiedBy: uid } });
    });
  } catch (e) {
    return { success: false, error: dbError(e, "Gagal mengurutkan ulang patok") };
  }
  return { success: true };
}

// ─── Foto ───

export async function uploadLandMarkerPhoto(formData: FormData): Promise<ActionResult<{ key: string; url: string }>> {
  if (!(await hasPermission(MENU, "EDIT")) && !(await hasPermission(MENU, "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengunggah foto patok" };
  }
  const file = formData.get("file") as File | null;
  const landParcelId = String(formData.get("landParcelId") ?? "");
  const markerId = String(formData.get("markerId") ?? "");
  if (!file || !landParcelId || !markerId) return { success: false, error: "Berkas atau patok tidak ditemukan" };
  if (!(MARKER_PHOTO_TYPES as readonly string[]).includes(file.type)) return { success: false, error: "Hanya JPG, PNG, atau WebP" };
  if (file.size > MARKER_PHOTO_MAX_BYTES) return { success: false, error: "Ukuran foto maksimal 5 MB" };
  const parcel = await resolveParcel(landParcelId);
  if (!parcel) return { success: false, error: "Lahan tidak ditemukan atau di luar akses Anda" };
  const link = await prisma.landParcelMarker.findFirst({ where: { parcelUid: parcel.parcelUid, markerId, isActive: true }, select: { id: true } });
  if (!link) return { success: false, error: "Patok tidak ditemukan pada lahan ini" };
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").toLowerCase();
  const key = `land-marker/${markerId}/${Date.now()}-${safeName}`;
  try {
    await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: Buffer.from(await file.arrayBuffer()), ContentType: file.type }));
  } catch (e) {
    console.error("Upload foto patok gagal:", e);
    return { success: false, error: "Gagal mengunggah foto. Coba lagi." };
  }
  // Satu foto per patok: foto baru menggantikan kunci lama (objek lama dibiarkan di bucket — riwayat).
  await prisma.landMarker.update({ where: { id: markerId }, data: { photoKey: key, photoName: file.name, modifiedBy: await userId() } });
  return { success: true, data: { key, url: await getPresignedUrl(key, 60 * 60) } };
}

// ─── Ekspor per Lembaga ───

export interface LandMarkerExportRow {
  parcelId: string;
  farmerCode: string;
  farmerName: string;
  groupName: string;
  subGroupLv2: string | null;
  blok: string | null;
  sequenceNo: number;
  latitude: number;
  longitude: number;
  condition: string;
  type: string | null;
  installedAt: string | null;
  installedBy: string | null;
  source: string;
  nkt: boolean;
  sharedWith: string[];
  notes: string | null;
}

/**
 * Semua patok aktif lahan aktif satu Lembaga — item "Patok batas (Excel)" di
 * menu Unduh Lahan pada Detail Lembaga; digate `master-data-groups:EXPORT`
 * (pola `getFarmerGroupParcelExportData`: hanya id lembaga, scope tetap
 * berlaku → lembaga di luar cakupan = 0 baris).
 */
export async function getFarmerGroupMarkerExportRows(farmerGroupId: string): Promise<ActionResult<{ rows: LandMarkerExportRow[]; label: string | null }>> {
  if (!(await hasPermission("master-data-groups", "EXPORT"))) return { success: false, error: "Tidak memiliki izin untuk mengekspor data ini" };
  if (typeof farmerGroupId !== "string" || !farmerGroupId) return { success: false, error: "Lembaga tidak valid" };
  const access = await getAccessContext();
  const group = await prisma.farmerGroup.findFirst({
    where: { id: farmerGroupId, isActive: true, AND: farmerGroupAccessFilter(access) },
    select: { code: true, name: true },
  });
  if (!group) return { success: true, data: { rows: [], label: null } };

  const parcels = await prisma.landParcel.findMany({
    where: { isActive: true, farmer: { isActive: true, farmerGroupId } },
    select: {
      parcelId: true, parcelUid: true, subGroupLv2: true, blok: true,
      farmer: { select: { farmerId: true, name: true } },
      identity: {
        select: {
          nkt: { select: { status: true } },
          markers: {
            where: { isActive: true },
            orderBy: { sequenceNo: "asc" },
            select: {
              sequenceNo: true,
              marker: {
                select: {
                  longitude: true, latitude: true, condition: true, type: true, installedAt: true, installedBy: true, source: true, notes: true,
                  parcels: { where: { isActive: true }, select: { parcelUid: true, parcel: { select: { parcelId: true, nkt: { select: { status: true } } } } } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { parcelId: "asc" },
  });

  const rows: LandMarkerExportRow[] = [];
  for (const p of parcels) {
    const own = isNktAffected(p.identity.nkt?.status);
    for (const l of p.identity.markers) {
      const others = l.marker.parcels.filter((x) => x.parcelUid !== p.parcelUid);
      rows.push({
        parcelId: p.parcelId,
        farmerCode: p.farmer.farmerId,
        farmerName: p.farmer.name,
        groupName: group.name,
        subGroupLv2: p.subGroupLv2,
        blok: p.blok,
        sequenceNo: l.sequenceNo,
        latitude: l.marker.latitude,
        longitude: l.marker.longitude,
        condition: l.marker.condition,
        type: l.marker.type,
        installedAt: l.marker.installedAt ? l.marker.installedAt.toISOString().slice(0, 10) : null,
        installedBy: l.marker.installedBy,
        source: l.marker.source,
        nkt: own || others.some((x) => isNktAffected(x.parcel.nkt?.status)),
        sharedWith: others.map((x) => x.parcel.parcelId),
        notes: l.marker.notes,
      });
    }
  }
  return { success: true, data: { rows, label: group.code?.trim() || group.name } };
}

/**
 * Patok pada filter Peta Lahan (#331) — unduhan baris legenda "Patok lahan" /
 * "Patok lahan NKT"; digate `map-parcel:EXPORT`. Satu baris per patok per
 * lahan (Excel) — klien mengelompokkan per `markerId` untuk fitur Point.
 * `nktOnly` = hanya patok yang salah satu lahan pemakainya kena NKT.
 */
export async function getMapMarkerExportRows(
  filters: { provinceId?: string | null; districtId: string; farmerGroupId?: string | null },
  nktOnly = false,
): Promise<ActionResult<{ rows: (LandMarkerExportRow & { markerId: string })[]; label: string | null }>> {
  if (!(await hasPermission("map-parcel", "EXPORT"))) return { success: false, error: "Tidak memiliki izin untuk mengekspor data ini" };
  if (typeof filters?.districtId !== "string" || !filters.districtId) return { success: false, error: "Pilih Distrik terlebih dahulu" };
  const access = await getAccessContext();
  const groupWhere = {
    isActive: true,
    districtId: filters.districtId,
    ...(filters.farmerGroupId ? { id: filters.farmerGroupId } : {}),
    ...(filters.provinceId ? { district: { provinceId: filters.provinceId } } : {}),
    AND: farmerGroupAccessFilter(access),
  };
  const [parcels, group, district] = await Promise.all([
    prisma.landParcel.findMany({
      where: { isActive: true, farmer: { isActive: true, farmerGroup: groupWhere } },
      select: {
        parcelId: true, parcelUid: true, subGroupLv2: true, blok: true,
        farmer: { select: { farmerId: true, name: true, farmerGroup: { select: { name: true } } } },
        identity: {
          select: {
            nkt: { select: { status: true } },
            markers: {
              where: { isActive: true },
              orderBy: { sequenceNo: "asc" },
              select: {
                sequenceNo: true,
                marker: {
                  select: {
                    id: true, longitude: true, latitude: true, condition: true, type: true, installedAt: true, installedBy: true, source: true, notes: true,
                    parcels: { where: { isActive: true }, select: { parcelUid: true, parcel: { select: { parcelId: true, nkt: { select: { status: true } } } } } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { parcelId: "asc" },
    }),
    filters.farmerGroupId
      ? prisma.farmerGroup.findFirst({ where: { id: filters.farmerGroupId, isActive: true, AND: farmerGroupAccessFilter(access) }, select: { code: true, name: true } })
      : Promise.resolve(null),
    prisma.district.findUnique({ where: { id: filters.districtId }, select: { name: true } }),
  ]);
  const rows: (LandMarkerExportRow & { markerId: string })[] = [];
  for (const p of parcels) {
    const own = isNktAffected(p.identity.nkt?.status);
    for (const l of p.identity.markers) {
      const others = l.marker.parcels.filter((x) => x.parcelUid !== p.parcelUid);
      const nkt = own || others.some((x) => isNktAffected(x.parcel.nkt?.status));
      if (nktOnly && !nkt) continue;
      rows.push({
        markerId: l.marker.id,
        parcelId: p.parcelId,
        farmerCode: p.farmer.farmerId,
        farmerName: p.farmer.name,
        groupName: p.farmer.farmerGroup.name,
        subGroupLv2: p.subGroupLv2,
        blok: p.blok,
        sequenceNo: l.sequenceNo,
        latitude: l.marker.latitude,
        longitude: l.marker.longitude,
        condition: l.marker.condition,
        type: l.marker.type,
        installedAt: l.marker.installedAt ? l.marker.installedAt.toISOString().slice(0, 10) : null,
        installedBy: l.marker.installedBy,
        source: l.marker.source,
        nkt,
        sharedWith: others.map((x) => x.parcel.parcelId),
        notes: l.marker.notes,
      });
    }
  }
  const label = filters.farmerGroupId ? (group?.code?.trim() || group?.name || null) : (district?.name ?? null);
  return { success: true, data: { rows, label } };
}

// ─── Unggah titik (Excel/CSV & shapefile point) ───

export interface LandMarkerUploadMatchResult {
  parcels: MarkerUploadParcelRef[];
  /** Jumlah lahan aktif per ID Lahan secara GLOBAL (tanpa scope) — >1 berarti perlu ID Petani. */
  globalCounts: { parcelId: string; count: number }[];
}

/**
 * Cocokkan ID Lahan dari berkas dengan lahan aktif dalam scope (pola
 * `matchTreeUploadParcels`, #241): hanya id yang ada di berkas, ikut jumlah
 * global untuk deteksi ID ganda lintas petani (klien minta kolom ID Petani).
 */
export async function matchLandMarkerUploadParcels(parcelIds: string[]): Promise<LandMarkerUploadMatchResult> {
  if (!(await hasPermission("bulk-upload-parcels", "VIEW"))) throw new Error("Tidak memiliki izin untuk mengakses data ini");
  const ids = [...new Set(parcelIds)].filter((id) => typeof id === "string" && id.length > 0);
  if (ids.length === 0) return { parcels: [], globalCounts: [] };
  const access = await getAccessContext();
  const [rows, global] = await Promise.all([
    prisma.landParcel.findMany({
      where: { parcelId: { in: ids }, isActive: true, ...farmerRelationAccessFilter(access) },
      select: {
        id: true, parcelId: true, parcelUid: true,
        farmer: { select: { farmerId: true, name: true } },
        identity: { select: { markers: { where: { isActive: true }, select: { sequenceNo: true } } } },
      },
      orderBy: { parcelId: "asc" },
    }),
    prisma.landParcel.groupBy({ by: ["parcelId"], where: { parcelId: { in: ids }, isActive: true }, _count: { _all: true } }),
  ]);
  // Ada/tidaknya geometri: cek lewat kolom generated `geom` agar poligon
  // invalid (geom NULL) dilaporkan "belum punya poligon", bukan lolos ke guard.
  const withGeom = rows.length
    ? await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM tbl_land_parcel WHERE id IN (${Prisma.join(rows.map((r) => r.id))}) AND geom IS NOT NULL`
    : [];
  const geomIds = new Set(withGeom.map((r) => r.id));
  return {
    parcels: rows.map((r) => ({
      id: r.id,
      parcelId: r.parcelId,
      farmerCode: r.farmer.farmerId,
      farmerName: r.farmer.name,
      hasGeometry: geomIds.has(r.id),
      activeMarkerCount: r.identity.markers.length,
      sequenceNos: r.identity.markers.map((m) => m.sequenceNo).sort((a, b) => a - b),
    })),
    globalCounts: global.map((g) => ({ parcelId: g.parcelId, count: g._count._all })),
  };
}

export interface LandMarkerUploadSummary {
  rows: number;
  created: number;
  updated: number;
  /** Patok baru yang DITAUTKAN ke patok lahan lain (snap ≤ 5 m) alih-alih dibuat. */
  linked: number;
  /** Baris ditolak server (di luar 100 m dari batas, dsb.) — pesan per baris. */
  rejected: { landParcelId: string; parcelId: string | null; sequenceNo: number | null; reason: string }[];
}

/**
 * Terapkan baris titik patok per lahan. Aturan: nomor urut yang SUDAH ADA di
 * lahan → perbarui koordinat/atribut patok itu (koordinat → source GPS);
 * tanpa nomor tetapi ≤ 5 m dari patok yang sudah tertaut ke lahan ini →
 * perbarui patok itu (unggah ulang berkas yang sama idempoten, bukan kembaran);
 * nomor baru / tanpa nomor → patok baru + tautan, dengan snap ≤ 5 m ke patok
 * lahan lain (termasuk patok nonaktif → dihidupkan). Guard ≤ 100 m dari batas
 * per titik (lat/long tertukar). Satu transaksi PER LAHAN: galat DB pada satu
 * lahan masuk `rejected`, lahan lain tetap diproses.
 */
export async function bulkUpsertLandMarkers(input: unknown): Promise<ActionResult<LandMarkerUploadSummary>> {
  if (!(await hasPermission("bulk-upload-parcels", "CREATE"))) return { success: false, error: "Tidak memiliki izin untuk menyimpan data" };
  const parsed = landMarkerUploadBatchSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Data yang dikirim tidak valid — ulangi validasi" };
  const rows: LandMarkerUploadRow[] = parsed.data;
  const uid = await userId();
  const summary: LandMarkerUploadSummary = { rows: rows.length, created: 0, updated: 0, linked: 0, rejected: [] };

  const byParcel = new Map<string, LandMarkerUploadRow[]>();
  for (const r of rows) byParcel.set(r.landParcelId, [...(byParcel.get(r.landParcelId) ?? []), r]);

  // Scope dihitung SEKALI untuk seluruh batch (bukan auth() per lahan).
  const access = await getAccessContext();
  const parcels = await prisma.landParcel.findMany({
    where: { id: { in: [...byParcel.keys()] }, isActive: true, ...farmerRelationAccessFilter(access) },
    select: PARCEL_SELECT,
  });
  const parcelById = new Map(parcels.map((p) => [p.id, p]));

  for (const [landParcelId, group] of byParcel) {
    const parcel = parcelById.get(landParcelId);
    if (!parcel) {
      for (const r of group) summary.rejected.push({ landParcelId, parcelId: null, sequenceNo: r.sequenceNo, reason: "Lahan tidak ditemukan atau di luar akses Anda" });
      continue;
    }
    // Guard jarak: satu kueri untuk 2N titik (asli + tertukar).
    const n = group.length;
    const dists = parcel.geometry
      ? await distancesToParcelBoundary(landParcelId, [
          ...group.map((r) => ({ lon: r.longitude, lat: r.latitude })),
          ...group.map((r) => ({ lon: r.latitude, lat: r.longitude })),
        ])
      : new Array<number>(2 * n).fill(0);
    const nearby = parcel.geometry ? await fetchNearbyMarkers(landParcelId, parcel.parcelUid) : [];
    const existing = await prisma.landParcelMarker.findMany({
      where: { parcelUid: parcel.parcelUid, isActive: true },
      select: { id: true, sequenceNo: true, markerId: true },
    });
    const bySeq = new Map(existing.map((l) => [l.sequenceNo, l]));
    const byMarker = new Map(existing.map((l) => [l.markerId, l]));
    let nextSeq = existing.reduce((m, l) => Math.max(m, l.sequenceNo), 0) + 1;
    const usedNearby = new Set<string>();
    const local = { created: 0, updated: 0, linked: 0, rejected: [] as LandMarkerUploadSummary["rejected"] };

    try {
      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < n; i++) {
          const r = group[i];
          const point = { lon: r.longitude, lat: r.latitude };
          const err = checkMarkerNearParcel(point, (p) => (p.lon === point.lon && p.lat === point.lat ? dists[i] : dists[n + i]), MARKER_MAX_DISTANCE_M);
          if (err) { local.rejected.push({ landParcelId, parcelId: parcel.parcelId, sequenceNo: r.sequenceNo, reason: err }); continue; }
          const attrs = {
            condition: r.condition ?? undefined,
            type: r.type ?? undefined,
            installedAt: r.installedAt ? new Date(`${r.installedAt}T00:00:00Z`) : undefined,
            installedBy: r.installedBy ?? undefined,
            notes: r.notes ?? undefined,
          };

          // (a) Nomor yang sudah ada di lahan → perbarui patok itu.
          let target = r.sequenceNo != null ? bySeq.get(r.sequenceNo) : undefined;
          // (b) Tanpa nomor → titik ≤ 5 m dari patok yang SUDAH tertaut ke lahan ini = patok yang sama (unggah ulang idempoten).
          if (!target && r.sequenceNo == null) {
            let best: { link: { id: string; sequenceNo: number; markerId: string }; d: number } | null = null;
            for (const m of nearby) {
              const link = m.linkedToThisParcel ? byMarker.get(m.id) : undefined;
              if (!link || usedNearby.has(m.id)) continue;
              const d = distanceMeters(point, m);
              if (d <= MARKER_SNAP_M && (!best || d < best.d)) best = { link, d };
            }
            if (best) { target = best.link; usedNearby.add(best.link.markerId); }
          }
          if (target) {
            await tx.landMarker.update({ where: { id: target.markerId }, data: { longitude: r.longitude, latitude: r.latitude, source: "GPS", isActive: true, ...attrs, modifiedBy: uid } });
            local.updated++;
            continue;
          }

          // (c) Patok baru: snap ke patok lahan lain (atau patok nonaktif) ≤ 5 m yang belum tertaut ke lahan ini.
          let snap: { id: string; d: number } | null = null;
          for (const m of nearby) {
            if (usedNearby.has(m.id) || m.linkedToThisParcel) continue;
            const d = distanceMeters(point, m);
            if (d <= MARKER_SNAP_M && (!snap || d < snap.d)) snap = { id: m.id, d };
          }
          const seq = r.sequenceNo ?? nextSeq++;
          if (r.sequenceNo != null && r.sequenceNo >= nextSeq) nextSeq = r.sequenceNo + 1;
          let markerId: string;
          if (snap) {
            usedNearby.add(snap.id);
            markerId = snap.id;
            await tx.landMarker.update({ where: { id: markerId }, data: { isActive: true, ...attrs, modifiedBy: uid } });
            local.linked++;
          } else {
            const m = await tx.landMarker.create({ data: { longitude: r.longitude, latitude: r.latitude, source: "GPS", ...attrs, createdBy: uid }, select: { id: true } });
            markerId = m.id;
            local.created++;
          }
          const old = await tx.landParcelMarker.findUnique({ where: { parcelUid_markerId: { parcelUid: parcel.parcelUid, markerId } }, select: { id: true } });
          const link = old
            ? await tx.landParcelMarker.update({ where: { id: old.id }, data: { isActive: true, sequenceNo: seq, modifiedBy: uid }, select: { id: true } })
            : await tx.landParcelMarker.create({ data: { parcelUid: parcel.parcelUid, markerId, sequenceNo: seq, createdBy: uid }, select: { id: true } });
          // Tautan NYATA (bukan sentinel) — baris berikutnya yang menyebut nomor ini memperbarui patok yang sama.
          const rec = { id: link.id, sequenceNo: seq, markerId };
          bySeq.set(seq, rec);
          byMarker.set(markerId, rec);
        }
      });
      summary.created += local.created; summary.updated += local.updated; summary.linked += local.linked;
      summary.rejected.push(...local.rejected);
    } catch (e) {
      const reason = dbError(e, "Gagal menyimpan patok lahan ini");
      for (const r of group) summary.rejected.push({ landParcelId, parcelId: parcel.parcelId, sequenceNo: r.sequenceNo, reason });
    }
  }
  return { success: true, data: summary };
}
