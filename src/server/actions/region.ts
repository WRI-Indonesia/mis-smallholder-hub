"use server";

import { prisma } from "@/lib/prisma";
import {
  provinceSchema,
  districtSchema,
  ProvinceFormValues,
  DistrictFormValues,
  subdistrictSchema,
  villageSchema,
  SubdistrictFormValues,
  VillageFormValues,
} from "@/validations/region.schema";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";

const REVALIDATE_PATH = "/admin/master-data/regions";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProvinceRow {
  id: string;
  code: string;
  name: string;
  _count: { districts: number };
}

export interface DistrictRow {
  id: string;
  code: string;
  name: string;
  provinceId: string;
  province: { name: string };
  _count: { subdistricts: number; farmerGroups: number };
}

export interface SubdistrictRow {
  id: string;
  code: string;
  name: string;
  districtId: string;
  _count: { villages: number };
}

export interface VillageRow {
  id: string;
  code: string;
  name: string;
  subdistrictId: string;
}

export type RegionType = "province" | "district" | "subdistrict" | "village";

export interface RegionSearchResult {
  id: string;
  type: RegionType;
  code: string;
  name: string;
  path: string;
  data: any; // Raw data for editing
}

// ─── Province Actions ────────────────────────────────────────────────────────

export async function getProvinces(): Promise<ActionResult<ProvinceRow[]>> {
  try {
    const provinces = await prisma.province.findMany({
      orderBy: { code: "asc" },
      include: {
        _count: { select: { districts: true } },
      },
    });
    return { success: true, data: provinces };
  } catch (error) {
    console.error("Failed to fetch provinces:", error);
    return { success: false, error: "Gagal memuat data provinsi." };
  }
}

export async function createProvince(
  data: ProvinceFormValues
): Promise<ActionResult> {
  try {
    const validated = provinceSchema.parse(data);

    const existing = await prisma.province.findUnique({
      where: { code: validated.code },
    });
    if (existing) {
      return { success: false, error: `Kode provinsi "${validated.code}" sudah digunakan.` };
    }

    await prisma.province.create({
      data: { code: validated.code, name: validated.name },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to create province:", error);
    const message = error instanceof Error ? error.message : "Gagal membuat provinsi.";
    return { success: false, error: message };
  }
}

export async function updateProvince(
  id: string,
  data: ProvinceFormValues
): Promise<ActionResult> {
  try {
    const validated = provinceSchema.parse(data);

    // Check unique code (exclude self)
    const existing = await prisma.province.findFirst({
      where: { code: validated.code, NOT: { id } },
    });
    if (existing) {
      return { success: false, error: `Kode provinsi "${validated.code}" sudah digunakan.` };
    }

    await prisma.province.update({
      where: { id },
      data: { code: validated.code, name: validated.name },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to update province:", error);
    const message = error instanceof Error ? error.message : "Gagal mengupdate provinsi.";
    return { success: false, error: message };
  }
}

export async function deleteProvince(id: string): Promise<ActionResult> {
  try {
    // Check for child districts
    const districtCount = await prisma.district.count({
      where: { provinceId: id },
    });
    if (districtCount > 0) {
      return {
        success: false,
        error: `Tidak dapat menghapus. Masih ada ${districtCount} kabupaten terkait.`,
      };
    }

    await prisma.province.delete({ where: { id } });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete province:", error);
    return { success: false, error: "Gagal menghapus provinsi." };
  }
}

// ─── District Actions ────────────────────────────────────────────────────────

export async function getDistricts(
  provinceId?: string
): Promise<ActionResult<DistrictRow[]>> {
  try {
    const where = provinceId ? { provinceId } : {};
    const districts = await prisma.district.findMany({
      where,
      orderBy: { code: "asc" },
      include: {
        province: { select: { name: true } },
        _count: { select: { subdistricts: true, farmerGroups: true } },
      },
    });
    return { success: true, data: districts };
  } catch (error) {
    console.error("Failed to fetch districts:", error);
    return { success: false, error: "Gagal memuat data kabupaten." };
  }
}

export async function createDistrict(
  data: DistrictFormValues
): Promise<ActionResult> {
  try {
    const validated = districtSchema.parse(data);

    const existing = await prisma.district.findUnique({
      where: { code: validated.code },
    });
    if (existing) {
      return { success: false, error: `Kode kabupaten "${validated.code}" sudah digunakan.` };
    }

    await prisma.district.create({
      data: {
        code: validated.code,
        name: validated.name,
        provinceId: validated.provinceId,
      },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to create district:", error);
    const message = error instanceof Error ? error.message : "Gagal membuat kabupaten.";
    return { success: false, error: message };
  }
}

export async function updateDistrict(
  id: string,
  data: DistrictFormValues
): Promise<ActionResult> {
  try {
    const validated = districtSchema.parse(data);

    // Check unique code (exclude self)
    const existing = await prisma.district.findFirst({
      where: { code: validated.code, NOT: { id } },
    });
    if (existing) {
      return { success: false, error: `Kode kabupaten "${validated.code}" sudah digunakan.` };
    }

    await prisma.district.update({
      where: { id },
      data: {
        code: validated.code,
        name: validated.name,
        provinceId: validated.provinceId,
      },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to update district:", error);
    const message = error instanceof Error ? error.message : "Gagal mengupdate kabupaten.";
    return { success: false, error: message };
  }
}

export async function deleteDistrict(id: string): Promise<ActionResult> {
  try {
    // Check for child subdistricts
    const subdistrictCount = await prisma.subdistrict.count({
      where: { districtId: id },
    });
    if (subdistrictCount > 0) {
      return {
        success: false,
        error: `Tidak dapat menghapus. Masih ada ${subdistrictCount} kecamatan terkait.`,
      };
    }

    // Check for child farmer groups
    const groupCount = await prisma.farmerGroup.count({
      where: { districtId: id },
    });
    if (groupCount > 0) {
      return {
        success: false,
        error: `Tidak dapat menghapus. Masih ada ${groupCount} kelompok tani terkait.`,
      };
    }

    await prisma.district.delete({ where: { id } });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete district:", error);
    return { success: false, error: "Gagal menghapus kabupaten." };
  }
}

// ─── Subdistrict Actions ─────────────────────────────────────────────────────

export async function getSubdistricts(
  districtId: string
): Promise<ActionResult<SubdistrictRow[]>> {
  try {
    const subdistricts = await prisma.subdistrict.findMany({
      where: { districtId },
      orderBy: { code: "asc" },
      include: {
        _count: { select: { villages: true } },
      },
    });
    return { success: true, data: subdistricts };
  } catch (error) {
    console.error("Failed to fetch subdistricts:", error);
    return { success: false, error: "Gagal memuat data kecamatan." };
  }
}

export async function createSubdistrict(
  data: SubdistrictFormValues
): Promise<ActionResult> {
  try {
    const validated = subdistrictSchema.parse(data);

    const existing = await prisma.subdistrict.findUnique({
      where: { code: validated.code },
    });
    if (existing) {
      return { success: false, error: `Kode kecamatan "${validated.code}" sudah digunakan.` };
    }

    await prisma.subdistrict.create({
      data: {
        code: validated.code,
        name: validated.name,
        districtId: validated.districtId,
      },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to create subdistrict:", error);
    const message = error instanceof Error ? error.message : "Gagal membuat kecamatan.";
    return { success: false, error: message };
  }
}

export async function updateSubdistrict(
  id: string,
  data: SubdistrictFormValues
): Promise<ActionResult> {
  try {
    const validated = subdistrictSchema.parse(data);

    const existing = await prisma.subdistrict.findFirst({
      where: { code: validated.code, NOT: { id } },
    });
    if (existing) {
      return { success: false, error: `Kode kecamatan "${validated.code}" sudah digunakan.` };
    }

    await prisma.subdistrict.update({
      where: { id },
      data: {
        code: validated.code,
        name: validated.name,
        districtId: validated.districtId,
      },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to update subdistrict:", error);
    const message = error instanceof Error ? error.message : "Gagal mengupdate kecamatan.";
    return { success: false, error: message };
  }
}

export async function deleteSubdistrict(id: string): Promise<ActionResult> {
  try {
    const villageCount = await prisma.village.count({
      where: { subdistrictId: id },
    });
    if (villageCount > 0) {
      return {
        success: false,
        error: `Tidak dapat menghapus. Masih ada ${villageCount} desa terkait.`,
      };
    }

    await prisma.subdistrict.delete({ where: { id } });
    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete subdistrict:", error);
    return { success: false, error: "Gagal menghapus kecamatan." };
  }
}

// ─── Village Actions ─────────────────────────────────────────────────────────

export async function getVillages(
  subdistrictId: string
): Promise<ActionResult<VillageRow[]>> {
  try {
    const villages = await prisma.village.findMany({
      where: { subdistrictId },
      orderBy: { code: "asc" },
    });
    return { success: true, data: villages };
  } catch (error) {
    console.error("Failed to fetch villages:", error);
    return { success: false, error: "Gagal memuat data desa." };
  }
}

export async function createVillage(
  data: VillageFormValues
): Promise<ActionResult> {
  try {
    const validated = villageSchema.parse(data);

    const existing = await prisma.village.findUnique({
      where: { code: validated.code },
    });
    if (existing) {
      return { success: false, error: `Kode desa "${validated.code}" sudah digunakan.` };
    }

    await prisma.village.create({
      data: {
        code: validated.code,
        name: validated.name,
        subdistrictId: validated.subdistrictId,
      },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to create village:", error);
    const message = error instanceof Error ? error.message : "Gagal membuat desa.";
    return { success: false, error: message };
  }
}

export async function updateVillage(
  id: string,
  data: VillageFormValues
): Promise<ActionResult> {
  try {
    const validated = villageSchema.parse(data);

    const existing = await prisma.village.findFirst({
      where: { code: validated.code, NOT: { id } },
    });
    if (existing) {
      return { success: false, error: `Kode desa "${validated.code}" sudah digunakan.` };
    }

    await prisma.village.update({
      where: { id },
      data: {
        code: validated.code,
        name: validated.name,
        subdistrictId: validated.subdistrictId,
      },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to update village:", error);
    const message = error instanceof Error ? error.message : "Gagal mengupdate desa.";
    return { success: false, error: message };
  }
}

export async function deleteVillage(id: string): Promise<ActionResult> {
  try {
    await prisma.village.delete({ where: { id } });
    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete village:", error);
    return { success: false, error: "Gagal menghapus desa." };
  }
}

// ─── Global Search ───────────────────────────────────────────────────────────

export async function searchRegions(
  query: string
): Promise<ActionResult<RegionSearchResult[]>> {
  if (!query || query.length < 3) return { success: true, data: [] };

  try {
    const [provinces, districts, subdistricts, villages] = await Promise.all([
      prisma.province.findMany({
        where: { name: { contains: query, mode: "insensitive" } },
        take: 10,
      }),
      prisma.district.findMany({
        where: { name: { contains: query, mode: "insensitive" } },
        include: { province: { select: { name: true } } },
        take: 15,
      }),
      prisma.subdistrict.findMany({
        where: { name: { contains: query, mode: "insensitive" } },
        include: { district: { include: { province: { select: { name: true } } } } },
        take: 20,
      }),
      prisma.village.findMany({
        where: { name: { contains: query, mode: "insensitive" } },
        include: {
          subdistrict: {
            include: { district: { include: { province: { select: { name: true } } } } },
          },
        },
        take: 50,
      }),
    ]);

    const results: RegionSearchResult[] = [];

    for (const p of provinces) {
      results.push({ id: p.id, type: "province", code: p.code, name: p.name, path: "Provinsi", data: p });
    }
    for (const d of districts) {
      results.push({ id: d.id, type: "district", code: d.code, name: d.name, path: `Prov. ${d.province.name}`, data: d });
    }
    for (const s of subdistricts) {
      results.push({ id: s.id, type: "subdistrict", code: s.code, name: s.name, path: `Kab. ${s.district.name}, Prov. ${s.district.province.name}`, data: s });
    }
    for (const v of villages) {
      results.push({
        id: v.id,
        type: "village",
        code: v.code,
        name: v.name,
        path: `Kec. ${v.subdistrict.name}, Kab. ${v.subdistrict.district.name}, Prov. ${v.subdistrict.district.province.name}`,
        data: v,
      });
    }

    return { success: true, data: results };
  } catch (error) {
    console.error("Failed to search regions:", error);
    return { success: false, error: "Pencarian gagal." };
  }
}
