import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type AccessContext =
  | { mode: "ALL" }
  | { mode: "BY_FARMER_GROUP"; ids: string[] }
  | { mode: "BY_DISTRICT"; ids: string[] };

export async function getAccessContext(): Promise<AccessContext> {
  const session = await auth();
  if (!session?.user) return { mode: "BY_DISTRICT", ids: [] };
  if (session.user.role === "SUPERADMIN") return { mode: "ALL" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      provinces: { include: { province: { include: { districts: true } } } },
      districts: true,
      farmerGroups: true,
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
}

/** Prisma `where` fragment scoping a FarmerGroup query to the user's data-access. */
export function farmerGroupAccessFilter(access: AccessContext) {
  return access.mode === "BY_FARMER_GROUP"
    ? { id: { in: access.ids } }
    : access.mode === "BY_DISTRICT"
    ? { districtId: { in: access.ids } }
    : {};
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
