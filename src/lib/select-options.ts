import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac";
import {
  getAccessContext,
  farmerAccessFilter,
  farmerGroupAccessFilter,
} from "@/lib/access-context";

// Shared, RBAC-guarded "for select" helpers. Consolidates the copies that were
// duplicated across farmer/training/land-parcel/production actions (issue #129).
// Called from server-component pages; `menuKey` is that page's menu so the guard
// matches its access — per the audit lesson, every "for select" helper checks
// permission before touching the DB.

async function requireView(menuKey: string) {
  if (!(await hasPermission(menuKey, "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }
}

/** Farmers within the caller's data-access scope, for select/combobox inputs. */
export async function getFarmerOptions(menuKey: string) {
  await requireView(menuKey);

  const access = await getAccessContext();

  return prisma.farmer.findMany({
    where: { ...farmerAccessFilter(access), isActive: true },
    select: { id: true, name: true, farmerId: true },
    orderBy: { name: "asc" },
  });
}

/** Farmer groups within the caller's data-access scope, for select inputs. */
export async function getFarmerGroupOptions(menuKey: string) {
  await requireView(menuKey);

  const access = await getAccessContext();

  return prisma.farmerGroup.findMany({
    where: { ...farmerGroupAccessFilter(access), isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}
