// Helper scope akses MURNI (tanpa next-auth/Prisma) — dipisah dari
// `access-context.ts` supaya bisa diimpor test di env node dan dipakai kueri
// mentah tanpa menarik `auth()` (review pra-rilis #352: test guard sebelumnya
// menguji SALINAN `rawFarmerGroupScope`, bukan aslinya).

export type AccessContext =
  | { mode: "ALL" }
  | { mode: "BY_FARMER_GROUP"; ids: string[] }
  | { mode: "BY_DISTRICT"; ids: string[] };

/** Prisma `where` fragment scoping a FarmerGroup query to the user's data-access. */
export function farmerGroupAccessFilter(access: AccessContext) {
  return access.mode === "BY_FARMER_GROUP"
    ? { id: { in: access.ids } }
    : access.mode === "BY_DISTRICT"
    ? { districtId: { in: access.ids } }
    : {};
}

/**
 * Boleh menaruh Lembaga di `districtId` ini? Dipakai aksi TULIS Lembaga (#409):
 * filter baca saja tidak cukup — distrik tujuan dari klien juga harus dalam scope.
 * - ALL → selalu boleh.
 * - BY_DISTRICT → distrik tujuan harus salah satu distrik scope.
 * - BY_FARMER_GROUP → scope berupa Lembaga, bukan wilayah: membuat Lembaga baru
 *   ditolak (Lembaga baru tak akan masuk scope), mengubah hanya boleh bila distrik
 *   tetap (`currentDistrictId` = distrik Lembaga saat ini).
 */
export function canPlaceGroupInDistrict(access: AccessContext, districtId: string, currentDistrictId?: string): boolean {
  if (access.mode === "ALL") return true;
  if (access.mode === "BY_DISTRICT") return access.ids.includes(districtId);
  return currentDistrictId !== undefined && districtId === currentDistrictId;
}

/**
 * Cermin `farmerGroupAccessFilter` untuk kueri SQL mentah (PostGIS) yang tidak
 * bisa memakai objek where Prisma: daftar id Lembaga / distrik, `undefined` =
 * tanpa batasan. Satu sumber agar mode akses baru tidak bocor di jalur mentah
 * (review #352). Sisipkan `groupIds` tambahan bila kueri hanya untuk satu Lembaga.
 */
export function rawFarmerGroupScope(
  access: AccessContext,
  groupIds?: string[],
): { groupIds?: string[]; districtIds?: string[] } {
  const scopedGroups = access.mode === "BY_FARMER_GROUP" ? access.ids : undefined;
  const ids =
    groupIds && scopedGroups ? groupIds.filter((id) => scopedGroups.includes(id)) : (groupIds ?? scopedGroups);
  return {
    groupIds: ids,
    districtIds: access.mode === "BY_DISTRICT" ? access.ids : undefined,
  };
}

/**
 * Prisma `where` fragment scoping a query on a model that carries a
 * `farmerGroupId` field + `farmerGroup` relation (e.g. `Farmer`,
 * `TrainingActivity`). Replaces the hand-written ternary repeated across actions.
 */
export function farmerAccessFilter(access: AccessContext) {
  return access.mode === "BY_FARMER_GROUP"
    ? { farmerGroupId: { in: access.ids } }
    : access.mode === "BY_DISTRICT"
    ? { farmerGroup: { districtId: { in: access.ids } } }
    : {};
}

/**
 * Prisma `where` fragment scoping a query on a model that owns a `farmer`
 * relation (e.g. `LandParcel`, `ProductionRecord`, `TrainingParticipant`).
 */
export function farmerRelationAccessFilter(access: AccessContext) {
  return access.mode === "BY_FARMER_GROUP"
    ? { farmer: { farmerGroupId: { in: access.ids } } }
    : access.mode === "BY_DISTRICT"
    ? { farmer: { farmerGroup: { districtId: { in: access.ids } } } }
    : {};
}

