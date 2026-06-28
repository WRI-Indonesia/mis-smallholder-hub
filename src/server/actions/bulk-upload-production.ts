"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { getAccessContext } from "@/lib/access-context";
import { productionSchema } from "@/validations/production.schema";

export async function getFarmersForProductionMapping() {
  if (!(await hasPermission("bulk-upload-production", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { farmerGroupId: { in: access.ids } } :
    access.mode === "BY_DISTRICT" ? { farmerGroup: { districtId: { in: access.ids } } } :
    {};

  return prisma.farmer.findMany({
    where: { ...accessFilter, isActive: true },
    select: {
      id: true,
      name: true,
      farmerId: true,
    },
    orderBy: { name: "asc" },
  });
}

export async function getExistingProductionRecords() {
  if (!(await hasPermission("bulk-upload-production", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { farmer: { farmerGroupId: { in: access.ids } } } :
    access.mode === "BY_DISTRICT" ? { farmer: { farmerGroup: { districtId: { in: access.ids } } } } :
    {};

  return prisma.productionRecord.findMany({
    where: { ...accessFilter, isActive: true },
    select: {
      farmerId: true,
      period: true,
      harvestNumber: true,
      parcelId: true,
      parcel: {
        select: {
          parcelId: true
        }
      }
    },
  });
}

export async function bulkCreateProductionRecords(dataList: any[]) {
  if (!(await hasPermission("bulk-upload-production", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menyimpan data" };
  }

  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Validate all farmerIds in scope
  const access = await getAccessContext();
  if (access.mode !== "ALL") {
    const accessFilter =
      access.mode === "BY_FARMER_GROUP" ? { farmerGroupId: { in: access.ids } } :
      { farmerGroup: { districtId: { in: access.ids } } };

    const allowedFarmers = await prisma.farmer.findMany({
      where: { ...accessFilter, isActive: true },
      select: { id: true },
    });
    const allowedFarmerIds = new Set(allowedFarmers.map((f) => f.id));

    const unauthorizedRow = dataList.find((item) => !allowedFarmerIds.has(item.farmerId));
    if (unauthorizedRow) {
      return {
        success: false,
        error: `Tidak memiliki izin untuk membuat data produksi bagi petani dengan ID: "${unauthorizedRow.farmerId}"`,
      };
    }
  }

  // Validate all records before saving (zod validation)
  const validatedRecords: any[] = [];
  for (const item of dataList) {
    // Make sure date properties are parsed or preprocess works
    const parsed = productionSchema.safeParse(item);
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

  try {
    await prisma.$transaction(async (tx) => {
      for (const record of validatedRecords) {
        let mappedParcelId = record.parcelId;
        
        // Validate parcel ownership if provided
        if (record.parcelId) {
          const parcel = await tx.landParcel.findFirst({
            where: {
              OR: [{ id: record.parcelId }, { parcelId: record.parcelId }],
              isActive: true 
            },
          });
          if (!parcel) {
            throw new Error(`ID Lahan "${record.parcelId}" tidak ditemukan atau tidak aktif`);
          }
          if (parcel.farmerId !== record.farmerId) {
            throw new Error(`ID Lahan "${record.parcelId}" tidak dimiliki oleh petani terpilih`);
          }
          mappedParcelId = parcel.id;
        }

        // Double-check duplicate in transaction
        const duplicate = await tx.productionRecord.findFirst({
          where: {
            farmerId: record.farmerId,
            parcelId: mappedParcelId || null,
            period: record.period,
            harvestNumber: record.harvestNumber,
            isActive: true,
          },
        });

        if (duplicate) {
          throw new Error(
            `Data panen ke-${record.harvestNumber} periode ${record.period} untuk petani tersebut sudah terdaftar`
          );
        }

        await tx.productionRecord.create({
          data: {
            ...record,
            parcelId: mappedParcelId || null,
            createdBy: userId,
          },
        });
      }
    });

    return { success: true, count: validatedRecords.length };
  } catch (error: any) {
    console.error("Bulk save production error:", error);
    return { success: false, error: error.message || "Gagal menyimpan data ke database" };
  }
}
