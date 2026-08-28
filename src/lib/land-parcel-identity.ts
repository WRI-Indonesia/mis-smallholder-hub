/**
 * Identitas lahan stabil antar revisi (`LandParcelIdentity` / `parcelUid`,
 * Decision Log 2026-08-27, #296).
 *
 * `LandParcel` berevisi dengan id baru per baris, sedangkan satelit
 * (dokumen, STDB, external id, program) menempel ke `parcelUid`. Semua jalur
 * yang membuat baris lahan (form create, bulk upload) WAJIB menaut identitas
 * lewat argumen upsert ini — satu sumber agar kunci & perilaku reaktivasi
 * tidak menyimpang antar jalur.
 */

export interface ParcelIdentityKey {
  farmerId: string;
  parcelId: string;
}

/**
 * Argumen `prisma.landParcelIdentity.upsert` untuk pasangan (farmer, parcelId).
 *
 * - `where` memakai unique composite `farmerId_parcelId` — identitas yang sama
 *   dipakai ulang oleh SEMUA revisi pasangan tersebut.
 * - `update` menyalakan kembali `isActive` — pasangan yang pernah
 *   dinonaktifkan lalu didaftarkan ulang memakai identitas lama (satelitnya
 *   tetap tertaut), bukan identitas baru.
 * - `select` hanya `id`, karena pemanggil cuma butuh `parcelUid`.
 */
export function parcelIdentityUpsertArgs(key: ParcelIdentityKey, userId: string | null) {
  return {
    where: { farmerId_parcelId: { farmerId: key.farmerId, parcelId: key.parcelId } },
    update: { isActive: true, modifiedBy: userId },
    create: { farmerId: key.farmerId, parcelId: key.parcelId, createdBy: userId },
    select: { id: true },
  } as const;
}
