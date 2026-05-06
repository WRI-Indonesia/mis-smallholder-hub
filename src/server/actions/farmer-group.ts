"use server";

import { prisma } from "@/lib/prisma";
import {
  farmerGroupSchema,
  FarmerGroupFormValues,
} from "@/validations/farmer-group.schema";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";

const REVALIDATE_PATH = "/admin/master-data/groups";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FarmerGroupRow {
  id: string;
  name: string;
  code: string | null;
  abrv: string | null;
  abrv3id: string | null;
  districtId: string;
  locationLat: number | null;
  locationLong: number | null;
  district: {
    name: string;
    province: { name: string };
  };
  _count: { farmers: number };
}

export interface DistrictDropdownItem {
  id: string;
  code: string;
  name: string;
  province: { id: string; name: string };
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getFarmerGroups(
  districtId?: string
): Promise<ActionResult<FarmerGroupRow[]>> {
  try {
    const where = districtId ? { districtId } : {};
    const groups = await prisma.farmerGroup.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        district: {
          select: {
            name: true,
            province: { select: { name: true } },
          },
        },
        _count: { select: { farmers: true } },
      },
    });

    console.log(`SERVER DEBUG - Found ${groups.length} groups`);
    if (groups.length > 0) {
      const first = groups[0] as any;
      console.log("SERVER DEBUG - First group keys:", Object.keys(first));
      console.log("SERVER DEBUG - First group abrv3id:", first.abrv3id);
      console.log("SERVER DEBUG - First group abrv_3id:", first.abrv_3id);
    }

    return { success: true, data: groups as unknown as FarmerGroupRow[] };
  } catch (error) {
    console.error("Failed to fetch farmer groups:", error);
    return { success: false, error: "Gagal memuat data kelompok tani." };
  }
}

export async function getFarmerGroupById(
  id: string
): Promise<ActionResult<FarmerGroupRow>> {
  try {
    const group = await prisma.farmerGroup.findUnique({
      where: { id },
      include: {
        district: {
          select: {
            name: true,
            province: { select: { name: true } },
          },
        },
        _count: { select: { farmers: true } },
      },
    });

    if (!group) return { success: false, error: "Kelompok tani tidak ditemukan." };

    return { success: true, data: group as unknown as FarmerGroupRow };
  } catch (error) {
    console.error("Failed to fetch farmer group by id:", error);
    return { success: false, error: "Gagal memuat data kelompok tani." };
  }
}

export async function getDistrictsForDropdown(): Promise<
  ActionResult<DistrictDropdownItem[]>
> {
  try {
    const districts = await prisma.district.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        province: { select: { id: true, name: true } },
      },
    });
    return { success: true, data: districts };
  } catch (error) {
    console.error("Failed to fetch districts for dropdown:", error);
    return { success: false, error: "Gagal memuat data kabupaten." };
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createFarmerGroup(
  data: FarmerGroupFormValues
): Promise<ActionResult> {
  try {
    const validated = farmerGroupSchema.parse(data);

    await prisma.farmerGroup.create({
      data: {
        name: validated.name,
        code: validated.code || null,
        abrv: validated.abrv || null,
        abrv3id: validated.abrv3id || null,
        districtId: validated.districtId,
        locationLat: validated.locationLat ?? null,
        locationLong: validated.locationLong ?? null,
        // Audit trail — auth not yet implemented, will be filled with session.user.id in Fase 3
        createdBy: null,
        modifiedBy: null,
      },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to create farmer group:", error);
    const message =
      error instanceof Error ? error.message : "Gagal membuat kelompok tani.";
    return { success: false, error: message };
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateFarmerGroup(
  id: string,
  data: FarmerGroupFormValues
): Promise<ActionResult> {
  try {
    const validated = farmerGroupSchema.parse(data);

    await prisma.farmerGroup.update({
      where: { id },
      data: {
        name: validated.name,
        code: validated.code || null,
        abrv: validated.abrv || null,
        abrv3id: validated.abrv3id || null,
        districtId: validated.districtId,
        locationLat: validated.locationLat ?? null,
        locationLong: validated.locationLong ?? null,
        // Audit trail — modifiedBy will be filled with session.user.id in Fase 3
        modifiedBy: null,
      },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to update farmer group:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengupdate kelompok tani.";
    return { success: false, error: message };
  }
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteFarmerGroup(id: string): Promise<ActionResult> {
  try {
    // Check for related farmers — reject if any exist
    const farmerCount = await prisma.farmer.count({
      where: { farmerGroupId: id },
    });
    if (farmerCount > 0) {
      return {
        success: false,
        error: `Tidak dapat menghapus. Masih ada ${farmerCount} petani terkait.`,
      };
    }

    // Delete related details first (cascade not automatic)
    await prisma.farmerGroupDetail.deleteMany({
      where: { farmerGroupId: id },
    });

    await prisma.farmerGroup.delete({ where: { id } });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete farmer group:", error);
    return { success: false, error: "Gagal menghapus kelompok tani." };
  }
}
