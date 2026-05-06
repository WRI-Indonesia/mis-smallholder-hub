"use server";

import { prisma } from "@/lib/prisma";
import { farmerSchema, FarmerFormValues } from "@/validations/farmer.schema";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import { Prisma } from "@prisma/client";

const REVALIDATE_PATH = "/admin/master-data/farmers";

export interface FarmerRow {
  id: string;
  name: string;
  nik: string;
  gender: string;
  birthdate: Date;
  status: string | null;
  farmerGroupId: string;
  batchId: string | null;
  wriFarmerId: string | null;
  uiFarmerId: string | null;
  farmerGroup: {
    name: string;
    district: { name: string };
  };
  batch: { name: string } | null;
  _count: { parcels: number };
}

export interface PaginatedFarmers {
  data: FarmerRow[];
  total: number;
  page: number;
  totalPages: number;
}

export interface BatchDropdownItem {
  id: string;
  code: string;
  name: string;
}

export async function getFarmers(
  page: number = 1,
  limit: number = 10,
  search?: string,
  farmerGroupId?: string
): Promise<ActionResult<PaginatedFarmers>> {
  try {
    const where: Prisma.FarmerWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { nik: { contains: search } },
      ];
    }

    if (farmerGroupId) {
      where.farmerGroupId = farmerGroupId;
    }

    const total = await prisma.farmer.count({ where });
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const data = await prisma.farmer.findMany({
      where,
      orderBy: { name: "asc" },
      skip: offset,
      take: limit,
      include: {
        farmerGroup: {
          select: {
            name: true,
            district: { select: { name: true } },
          },
        },
        batch: { select: { name: true } },
        _count: { select: { parcels: true } },
      },
    });

    return {
      success: true,
      data: {
        data: data as unknown as FarmerRow[],
        total,
        page,
        totalPages,
      },
    };
  } catch (error) {
    console.error("Failed to fetch farmers:", error);
    return { success: false, error: "Gagal memuat data petani." };
  }
}

export async function getFarmerById(id: string): Promise<ActionResult<FarmerRow>> {
  try {
    const data = await prisma.farmer.findUnique({
      where: { id },
      include: {
        farmerGroup: {
          select: {
            name: true,
            district: { select: { name: true } },
          },
        },
        batch: { select: { name: true } },
        _count: { select: { parcels: true } },
      },
    });
    if (!data) return { success: false, error: "Petani tidak ditemukan." };
    return { success: true, data: data as unknown as FarmerRow };
  } catch (error) {
    console.error("Failed to fetch farmer:", error);
    return { success: false, error: "Gagal memuat data petani." };
  }
}

export async function createFarmer(data: FarmerFormValues): Promise<ActionResult> {
  try {
    const validated = farmerSchema.parse(data);

    const existingNik = await prisma.farmer.findUnique({ where: { nik: validated.nik } });
    if (existingNik) {
      return { success: false, error: "NIK sudah terdaftar" };
    }

    await prisma.farmer.create({
      data: {
        name: validated.name,
        nik: validated.nik,
        gender: validated.gender,
        birthdate: validated.birthdate,
        farmerGroupId: validated.farmerGroupId,
        batchId: validated.batchId || null,
        status: validated.status || null,
        wriFarmerId: validated.wriFarmerId || null,
        uiFarmerId: validated.uiFarmerId || null,
        // Audit trail — auth not yet implemented, will be filled with session.user.id in Fase 3
        createdBy: null,
        modifiedBy: null,
      },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to create farmer:", error);
    return { success: false, error: error.message || "Gagal membuat petani." };
  }
}

export async function updateFarmer(id: string, data: FarmerFormValues): Promise<ActionResult> {
  try {
    const validated = farmerSchema.parse(data);

    const existingNik = await prisma.farmer.findUnique({ where: { nik: validated.nik } });
    if (existingNik && existingNik.id !== id) {
      return { success: false, error: "NIK sudah terdaftar" };
    }

    await prisma.farmer.update({
      where: { id },
      data: {
        name: validated.name,
        nik: validated.nik,
        gender: validated.gender,
        birthdate: validated.birthdate,
        farmerGroupId: validated.farmerGroupId,
        batchId: validated.batchId || null,
        status: validated.status || null,
        wriFarmerId: validated.wriFarmerId || null,
        uiFarmerId: validated.uiFarmerId || null,
        // Audit trail — modifiedBy will be filled with session.user.id in Fase 3
        modifiedBy: null,
      },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to update farmer:", error);
    return { success: false, error: error.message || "Gagal mengupdate petani." };
  }
}

export async function deleteFarmer(id: string): Promise<ActionResult> {
  try {
    const parcelCount = await prisma.landParcel.count({
      where: { farmerId: id },
    });
    if (parcelCount > 0) {
      return {
        success: false,
        error: `Tidak dapat menghapus. Petani masih memiliki ${parcelCount} land parcel.`,
      };
    }
    
    await prisma.trainingParticipant.deleteMany({ where: { farmerId: id }});
    await prisma.hseWorker.deleteMany({ where: { farmerId: id }});

    await prisma.farmer.delete({ where: { id } });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete farmer:", error);
    return { success: false, error: "Gagal menghapus petani." };
  }
}

export async function getBatchesForDropdown(): Promise<ActionResult<BatchDropdownItem[]>> {
  try {
    const batches = await prisma.batch.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true },
    });
    return { success: true, data: batches };
  } catch (error) {
    console.error("Failed to fetch batches:", error);
    return { success: false, error: "Gagal memuat data batch." };
  }
}
