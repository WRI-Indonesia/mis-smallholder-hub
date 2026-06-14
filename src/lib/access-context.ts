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
