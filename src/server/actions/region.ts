"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import {
  provinceSchema, updateProvinceSchema,
  districtSchema, updateDistrictSchema,
  subdistrictSchema, updateSubdistrictSchema,
  villageSchema, updateVillageSchema,
} from "@/validations/region.schema";
import type {
  ProvinceInput, UpdateProvinceInput,
  DistrictInput, UpdateDistrictInput,
  SubdistrictInput, UpdateSubdistrictInput,
  VillageInput, UpdateVillageInput,
} from "@/validations/region.schema";

// ─── Region Tree ──────────────────────────────────────────────────────────────

export async function getRegionTree() {
  if (!(await hasPermission("settings-regions", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  // Select ramping per level (id/code/name/isActive) — tree view tidak butuh
  // full row + audit fields untuk seluruh hierarki wilayah (#163).
  const levelSelect = { id: true, code: true, name: true, isActive: true } as const;

  return prisma.province.findMany({
    orderBy: { name: "asc" },
    select: {
      ...levelSelect,
      districts: {
        orderBy: { name: "asc" },
        select: {
          ...levelSelect,
          subdistricts: {
            orderBy: { name: "asc" },
            select: {
              ...levelSelect,
              villages: { orderBy: { name: "asc" }, select: levelSelect },
            },
          },
        },
      },
    },
  });
}

// ─── Province ─────────────────────────────────────────────────────────────────

export async function createProvince(input: ProvinceInput) {
  if (!(await hasPermission("settings-regions", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menambah provinsi" };
  }
  const parsed = provinceSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const existing = await prisma.province.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { success: false, error: { code: ["Kode sudah digunakan"] } };

  const session = await auth();
  await prisma.province.create({ data: { ...parsed.data, createdBy: session?.user?.id ?? null } });
  return { success: true };
}

export async function updateProvince(input: UpdateProvinceInput) {
  if (!(await hasPermission("settings-regions", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah provinsi" };
  }
  const parsed = updateProvinceSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const { id, ...data } = parsed.data;
  const existing = await prisma.province.findFirst({ where: { code: data.code, NOT: { id } } });
  if (existing) return { success: false, error: { code: ["Kode sudah digunakan"] } };

  const session = await auth();
  await prisma.province.update({ where: { id }, data: { ...data, modifiedBy: session?.user?.id ?? null } });
  return { success: true };
}

export async function toggleProvinceActive(id: string) {
  if (!(await hasPermission("settings-regions", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah status provinsi" };
  }
  const item = await prisma.province.findUnique({ where: { id }, select: { isActive: true } });
  if (!item) return { success: false, error: "Provinsi tidak ditemukan" };

  const session = await auth();
  await prisma.province.update({ where: { id }, data: { isActive: !item.isActive, modifiedBy: session?.user?.id ?? null } });
  return { success: true };
}

// ─── District ─────────────────────────────────────────────────────────────────

export async function createDistrict(input: DistrictInput) {
  if (!(await hasPermission("settings-regions", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menambah distrik" };
  }
  const parsed = districtSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const existing = await prisma.district.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { success: false, error: { code: ["Kode sudah digunakan"] } };

  const session = await auth();
  await prisma.district.create({ data: { ...parsed.data, createdBy: session?.user?.id ?? null } });
  return { success: true };
}

export async function updateDistrict(input: UpdateDistrictInput) {
  if (!(await hasPermission("settings-regions", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah distrik" };
  }
  const parsed = updateDistrictSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const { id, ...data } = parsed.data;
  const existing = await prisma.district.findFirst({ where: { code: data.code, NOT: { id } } });
  if (existing) return { success: false, error: { code: ["Kode sudah digunakan"] } };

  const session = await auth();
  await prisma.district.update({ where: { id }, data: { ...data, modifiedBy: session?.user?.id ?? null } });
  return { success: true };
}

export async function toggleDistrictActive(id: string) {
  if (!(await hasPermission("settings-regions", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah status distrik" };
  }
  const item = await prisma.district.findUnique({ where: { id }, select: { isActive: true } });
  if (!item) return { success: false, error: "Distrik tidak ditemukan" };

  const session = await auth();
  await prisma.district.update({ where: { id }, data: { isActive: !item.isActive, modifiedBy: session?.user?.id ?? null } });
  return { success: true };
}

// ─── Subdistrict ──────────────────────────────────────────────────────────────

export async function createSubdistrict(input: SubdistrictInput) {
  if (!(await hasPermission("settings-regions", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menambah kecamatan" };
  }
  const parsed = subdistrictSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const existing = await prisma.subdistrict.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { success: false, error: { code: ["Kode sudah digunakan"] } };

  const session = await auth();
  await prisma.subdistrict.create({ data: { ...parsed.data, createdBy: session?.user?.id ?? null } });
  return { success: true };
}

export async function updateSubdistrict(input: UpdateSubdistrictInput) {
  if (!(await hasPermission("settings-regions", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah kecamatan" };
  }
  const parsed = updateSubdistrictSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const { id, ...data } = parsed.data;
  const existing = await prisma.subdistrict.findFirst({ where: { code: data.code, NOT: { id } } });
  if (existing) return { success: false, error: { code: ["Kode sudah digunakan"] } };

  const session = await auth();
  await prisma.subdistrict.update({ where: { id }, data: { ...data, modifiedBy: session?.user?.id ?? null } });
  return { success: true };
}

export async function toggleSubdistrictActive(id: string) {
  if (!(await hasPermission("settings-regions", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah status kecamatan" };
  }
  const item = await prisma.subdistrict.findUnique({ where: { id }, select: { isActive: true } });
  if (!item) return { success: false, error: "Kecamatan tidak ditemukan" };

  const session = await auth();
  await prisma.subdistrict.update({ where: { id }, data: { isActive: !item.isActive, modifiedBy: session?.user?.id ?? null } });
  return { success: true };
}

// ─── Village ──────────────────────────────────────────────────────────────────

export async function createVillage(input: VillageInput) {
  if (!(await hasPermission("settings-regions", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menambah desa" };
  }
  const parsed = villageSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const existing = await prisma.village.findUnique({ where: { code: parsed.data.code } });
  if (existing) return { success: false, error: { code: ["Kode sudah digunakan"] } };

  const session = await auth();
  await prisma.village.create({ data: { ...parsed.data, createdBy: session?.user?.id ?? null } });
  return { success: true };
}

export async function updateVillage(input: UpdateVillageInput) {
  if (!(await hasPermission("settings-regions", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah desa" };
  }
  const parsed = updateVillageSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const { id, ...data } = parsed.data;
  const existing = await prisma.village.findFirst({ where: { code: data.code, NOT: { id } } });
  if (existing) return { success: false, error: { code: ["Kode sudah digunakan"] } };

  const session = await auth();
  await prisma.village.update({ where: { id }, data: { ...data, modifiedBy: session?.user?.id ?? null } });
  return { success: true };
}

export async function toggleVillageActive(id: string) {
  if (!(await hasPermission("settings-regions", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah status desa" };
  }
  const item = await prisma.village.findUnique({ where: { id }, select: { isActive: true } });
  if (!item) return { success: false, error: "Desa tidak ditemukan" };

  const session = await auth();
  await prisma.village.update({ where: { id }, data: { isActive: !item.isActive, modifiedBy: session?.user?.id ?? null } });
  return { success: true };
}
