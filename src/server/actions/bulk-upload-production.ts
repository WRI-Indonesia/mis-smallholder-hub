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
    // Resolve all referenced parcels in a single query (id OR human parcelId).
    const parcelRefs = [
      ...new Set(
        validatedRecords.map((r) => r.parcelId).filter((p): p is string => Boolean(p))
      ),
    ];
    const parcelByRef = new Map<string, { id: string; farmerId: string }>();
    if (parcelRefs.length > 0) {
      const parcels = await prisma.landParcel.findMany({
        where: {
          OR: [{ id: { in: parcelRefs } }, { parcelId: { in: parcelRefs } }],
          isActive: true,
        },
        select: { id: true, parcelId: true, farmerId: true },
      });
      for (const p of parcels) {
        parcelByRef.set(p.id, { id: p.id, farmerId: p.farmerId });
        parcelByRef.set(p.parcelId, { id: p.id, farmerId: p.farmerId });
      }
    }

    // Fetch existing (active) records for the involved farmers in one query.
    const farmerIds = [...new Set(validatedRecords.map((r) => r.farmerId))];
    const existing = await prisma.productionRecord.findMany({
      where: { farmerId: { in: farmerIds }, isActive: true },
      select: { farmerId: true, parcelId: true, period: true, harvestNumber: true },
    });
    const dupKey = (
      farmerId: string,
      parcelId: string | null,
      period: string,
      harvestNumber: number
    ) => `${farmerId}::${parcelId ?? ""}::${period}::${harvestNumber}`;
    const seen = new Set(
      existing.map((e) => dupKey(e.farmerId, e.parcelId, e.period, e.harvestNumber))
    );

    // Resolve parcels, validate ownership, and check duplicates in memory.
    const toInsert: any[] = [];
    for (const record of validatedRecords) {
      let mappedParcelId: string | null = null;

      if (record.parcelId) {
        const parcel = parcelByRef.get(record.parcelId);
        if (!parcel) {
          return {
            success: false,
            error: `ID Lahan "${record.parcelId}" tidak ditemukan atau tidak aktif`,
          };
        }
        if (parcel.farmerId !== record.farmerId) {
          return {
            success: false,
            error: `ID Lahan "${record.parcelId}" tidak dimiliki oleh petani terpilih`,
          };
        }
        mappedParcelId = parcel.id;
      }

      const key = dupKey(record.farmerId, mappedParcelId, record.period, record.harvestNumber);
      if (seen.has(key)) {
        return {
          success: false,
          error: `Data panen ke-${record.harvestNumber} periode ${record.period} untuk petani "${record.farmerId}" sudah terdaftar`,
        };
      }
      seen.add(key);

      toInsert.push({
        farmerId: record.farmerId,
        parcelId: mappedParcelId,
        period: record.period,
        harvestDate: record.harvestDate,
        harvestNumber: record.harvestNumber,
        yieldKg: record.yieldKg,
        notes: record.notes ?? null,
        createdBy: userId,
      });
    }

    // Single bulk insert — fast, atomic, and well within the transaction timeout.
    await prisma.productionRecord.createMany({ data: toInsert });

    return { success: true, count: toInsert.length };
  } catch (error: any) {
    console.error("Bulk save production error:", error);
    return { success: false, error: error.message || "Gagal menyimpan data ke database" };
  }
}
