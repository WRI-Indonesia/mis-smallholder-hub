import type { AccessContext } from "@/lib/access-scope";

/** Record UL Parcel Code aktif di lahan LAIN (hasil kueri `getLandParcelSatellites`). */
export interface SharedCodeHolder {
  source: string;
  code: string;
  parcel: {
    parcelId: string;
    revisions: { id: string; farmer: { farmerGroupId: string; farmerGroup: { districtId: string } } }[];
  };
}

/**
 * Lahan lain pemegang kode yang sama — tanda "Juga dipakai" tab Legalitas.
 * PENGECUALIAN SCOPE tercatat (docs/product/access-context.md, pola patok
 * bersama #329): ID Lahan tampil apa pun scope user; `id` (tautan ke detail)
 * hanya bila revisi aktifnya dalam scope, selain itu null. Lahan tanpa revisi
 * aktif dilewati (sama dengan STDB bersama).
 */
/** Petani pemilik revisi lahan berada dalam scope user? Dipakai juga oleh STDB bersama (`getLandParcelSatellites`). */
export function parcelFarmerInScope(
  farmer: { farmerGroupId: string; farmerGroup: { districtId: string } },
  access: AccessContext,
): boolean {
  return (
    access.mode === "ALL" ||
    (access.mode === "BY_FARMER_GROUP" && access.ids.includes(farmer.farmerGroupId)) ||
    (access.mode === "BY_DISTRICT" && access.ids.includes(farmer.farmerGroup.districtId))
  );
}

export function sharedCodeParcels(
  code: { source: string; code: string },
  holders: readonly SharedCodeHolder[],
  access: AccessContext,
): { parcelId: string; id: string | null }[] {
  return holders
    .filter((h) => h.source === code.source && h.code === code.code && h.parcel.revisions.length > 0)
    .map((h) => {
      const rev = h.parcel.revisions[0];
      return { parcelId: h.parcel.parcelId, id: parcelFarmerInScope(rev.farmer, access) ? rev.id : null };
    });
}
