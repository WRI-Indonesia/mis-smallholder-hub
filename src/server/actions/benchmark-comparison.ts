"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerGroupAccessFilter } from "@/lib/access-context";
import {
  aggregateMisMetrics,
  buildComparisonView,
  TRAINING_METRIC_BY_PACKAGE,
} from "@/lib/benchmark-comparison";
import { referenceBenchmarkSchema, type ReferenceBenchmarkInput } from "@/validations/reference-benchmark.schema";
import type { BenchmarkComparisonView } from "@/types/benchmark-comparison";
import type { DashboardPackageCode } from "@/types/dashboard";

const MENU_KEY = "data-analyst-benchmark-comparison";
const FORBIDDEN = "Tidak memiliki izin untuk mengakses data ini";
const PAGE_PATH = "/admin/data-analyst/benchmark-comparison";

async function requireView() {
  if (!(await hasPermission(MENU_KEY, "VIEW"))) {
    throw new Error(FORBIDDEN);
  }
}

/**
 * Tabel komparasi: angka acuan manual (ReferenceBenchmark) vs agregasi MIS
 * live per lembaga petani, dikelompokkan per distrik, dalam scope akses user.
 */
export async function getBenchmarkComparisonView(): Promise<BenchmarkComparisonView> {
  await requireView();
  const access = await getAccessContext();

  const groups = await prisma.farmerGroup.findMany({
    where: { isActive: true, AND: farmerGroupAccessFilter(access) },
    select: {
      id: true,
      code: true,
      abrv: true,
      name: true,
      district: { select: { id: true, name: true } },
    },
    orderBy: [{ code: "asc" }],
  });
  const groupIds = groups.map((g) => g.id);
  if (groupIds.length === 0) {
    return { sections: [], groupsWithDiff: 0, totalGroups: 0 };
  }

  const groupScope = { farmerGroupId: { in: groupIds } };
  const [farmers, parcels, participations, producers, benchmarks] = await Promise.all([
    prisma.farmer.findMany({
      where: { isActive: true, ...groupScope },
      select: { id: true, farmerGroupId: true },
    }),
    prisma.landParcel.findMany({
      where: { isActive: true, farmer: { isActive: true, ...groupScope } },
      select: { farmerId: true, area: true },
    }),
    prisma.trainingParticipant.findMany({
      where: {
        isActive: true,
        farmer: { isActive: true, ...groupScope },
        activity: {
          isActive: true,
          ...groupScope,
          package: { code: { in: Object.keys(TRAINING_METRIC_BY_PACKAGE) as DashboardPackageCode[] } },
        },
      },
      select: {
        farmerId: true,
        activity: { select: { farmerGroupId: true, package: { select: { code: true } } } },
      },
    }),
    prisma.productionRecord.findMany({
      where: { isActive: true, farmer: { isActive: true, ...groupScope } },
      select: { farmerId: true },
      distinct: ["farmerId"],
    }),
    prisma.referenceBenchmark.findMany({
      where: { isActive: true, ...groupScope },
    }),
  ]);

  const misByGroup = aggregateMisMetrics({
    groupIds,
    farmers,
    parcels,
    trainingParticipations: participations.map((p) => ({
      farmerId: p.farmerId,
      activityFarmerGroupId: p.activity.farmerGroupId,
      packageCode: p.activity.package.code,
    })),
    productionFarmerIds: producers.map((p) => p.farmerId),
  });

  return buildComparisonView(groups, misByGroup, benchmarks);
}

/** Simpan (buat/timpa) angka acuan manual satu lembaga petani. */
export async function upsertReferenceBenchmark(input: ReferenceBenchmarkInput) {
  if (!(await hasPermission(MENU_KEY, "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah angka acuan" };
  }

  const parsed = referenceBenchmarkSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const access = await getAccessContext();
  const group = await prisma.farmerGroup.findFirst({
    where: { id: parsed.data.farmerGroupId, isActive: true, AND: farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!group) {
    return { success: false, error: "Lembaga Petani tidak ditemukan atau di luar akses Anda" };
  }

  const session = await auth();
  const { farmerGroupId, ...values } = parsed.data;

  // Satu baris per lembaga (unique). Baris nonaktif (bekas "hapus")
  // diaktifkan kembali dan ditimpa nilai baru.
  await prisma.referenceBenchmark.upsert({
    where: { farmerGroupId },
    create: { farmerGroupId, ...values, createdBy: session?.user?.id ?? null },
    update: { ...values, isActive: true, modifiedBy: session?.user?.id ?? null },
  });

  revalidatePath(PAGE_PATH);
  return { success: true };
}
