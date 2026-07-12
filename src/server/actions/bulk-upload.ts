"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext, farmerGroupAccessFilter } from "@/lib/access-context";
import { farmerSchema, type FarmerInput } from "@/validations/farmer.schema";

export async function getFarmerGroupsForMapping() {
  if (!(await hasPermission("bulk-upload-farmers", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  return prisma.farmerGroup.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      code: true,
    },
  });
}

export async function getExistingFarmerIds() {
  if (!(await hasPermission("bulk-upload-farmers", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const farmers = await prisma.farmer.findMany({
    where: { isActive: true },
    select: { farmerId: true },
  });

  return farmers.map((f) => f.farmerId);
}

export async function bulkCreateFarmers(dataList: Record<string, unknown>[]) {
  if (!(await hasPermission("bulk-upload-farmers", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menyimpan data" };
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Validate all records before saving
  const validatedRecords: FarmerInput[] = [];
  for (const item of dataList) {
    const parsed = farmerSchema.safeParse(item);
    if (!parsed.success) {
      return {
        success: false,
        error: `Validasi gagal pada salah satu baris: ${JSON.stringify(
          parsed.error.flatten().fieldErrors
        )}`,
      };
    }
    validatedRecords.push(parsed.data);
  }

  // Validasi semua kelompok tani target berada dalam scope data-access user.
  const access = await getAccessContext();
  if (access.mode !== "ALL") {
    const allowedGroups = await prisma.farmerGroup.findMany({
      where: { ...farmerGroupAccessFilter(access), isActive: true },
      select: { id: true },
    });
    const allowedGroupIds = new Set(allowedGroups.map((g) => g.id));

    const unauthorized = validatedRecords.find((r) => !allowedGroupIds.has(r.farmerGroupId));
    if (unauthorized) {
      return {
        success: false,
        error: `Tidak memiliki izin untuk menambah petani ke kelompok tani dengan ID: "${unauthorized.farmerGroupId}"`,
      };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const record of validatedRecords) {
        await tx.farmer.create({
          data: {
            ...record,
            createdBy: userId,
          },
        });
      }
    });

    return { success: true, count: validatedRecords.length };
  } catch (error) {
    console.error("Bulk save error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message || "Gagal menyimpan data ke database" };
  }
}
