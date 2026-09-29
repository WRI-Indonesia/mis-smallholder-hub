import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type { AccessContext } from "@/lib/access-scope";
export { farmerGroupAccessFilter, rawFarmerGroupScope, farmerAccessFilter, farmerRelationAccessFilter } from "@/lib/access-scope";
import type { AccessContext } from "@/lib/access-scope";

/**
 * Scope data user — dedup per request dengan `cache()` (#252, pola `rbac.ts`):
 * satu halaman memanggilnya dari banyak action paralel, dulu masing-masing
 * mengulang `auth()` + kueri user bersarang. Asumsi: assignment scope user
 * TIDAK berubah di tengah satu request, dan pemanggil tidak memutasi hasilnya
 * (objek yang sama dibagi ke semua pemanggil dalam request itu).
 */
export const getAccessContext = cache(async (): Promise<AccessContext> => {
  const session = await auth();
  if (!session?.user) return { mode: "BY_DISTRICT", ids: [] };
  if (session.user.role === "SUPERADMIN") return { mode: "ALL" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    // Hanya id yang dipakai — dulu baris penuh ≤ 50 distrik per provinsi.
    select: {
      provinces: { select: { province: { select: { districts: { select: { id: true } } } } } },
      districts: { select: { districtId: true } },
      farmerGroups: { select: { farmerGroupId: true } },
    },
  });

  if (!user) return { mode: "BY_DISTRICT", ids: [] };

  // No assignments at all → unrestricted (show all)
  if (user.provinces.length === 0 && user.districts.length === 0 && user.farmerGroups.length === 0) {
    return { mode: "ALL" };
  }

  // FarmerGroup-only assignment → filter by specific KT IDs
  if (user.farmerGroups.length > 0 && user.provinces.length === 0 && user.districts.length === 0) {
    return { mode: "BY_FARMER_GROUP", ids: user.farmerGroups.map((f) => f.farmerGroupId) };
  }

  // Province/District assignment → resolve to district IDs
  const ids = new Set<string>();
  for (const up of user.provinces) {
    for (const d of up.province.districts) ids.add(d.id);
  }
  for (const ud of user.districts) ids.add(ud.districtId);

  return { mode: "BY_DISTRICT", ids: [...ids] };
});

/**
 * District ids the user may access, or `null` for unrestricted (ALL).
 * BY_FARMER_GROUP resolves to the districts of the assigned groups.
 */
export async function getAccessibleDistrictIds(access: AccessContext): Promise<string[] | null> {
  if (access.mode === "ALL") return null;
  if (access.mode === "BY_DISTRICT") return access.ids;

  if (access.ids.length === 0) return [];
  const groups = await prisma.farmerGroup.findMany({
    where: { id: { in: access.ids } },
    select: { districtId: true },
  });
  return [...new Set(groups.map((g) => g.districtId))];
}
