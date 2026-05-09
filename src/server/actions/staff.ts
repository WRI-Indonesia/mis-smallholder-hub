"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";
import type { StaffFormValues } from "@/validations/staff.schema";

const REVALIDATE_PATH = "/admin/master-data/staff";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StaffRow {
  id: string;
  staffCode: string;
  name: string;
  emailWri: string | null;
  jobDeskId: string;
  jobDesk: { id: string; code: string; name: string };
  lineManagerId: string | null;
  lineManager: { id: string; name: string; staffCode: string } | null;
  _count: {
    districts: number;
    farmerGroups: number;
  };
}

export interface StaffDetail extends StaffRow {
  districts: {
    id: string;
    district: {
      id: string;
      name: string;
      province: { name: string };
    };
  }[];
  farmerGroups: {
    id: string;
    farmerGroup: {
      id: string;
      name: string;
      code: string | null;
      district: { name: string };
    };
  }[];
  directReports: { id: string; name: string; staffCode: string; jobDesk: { name: string } }[];
}

export interface JobDeskDropdownItem {
  id: string;
  code: string;
  name: string;
}

export interface StaffDropdownItem {
  id: string;
  staffCode: string;
  name: string;
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getStaff(): Promise<ActionResult<StaffRow[]>> {
  try {
    const staff = await prisma.staff.findMany({
      orderBy: { name: "asc" },
      include: {
        jobDesk: { select: { id: true, code: true, name: true } },
        lineManager: { select: { id: true, name: true, staffCode: true } },
        _count: { select: { districts: true, farmerGroups: true } },
      },
    });
    return { success: true, data: staff as unknown as StaffRow[] };
  } catch (error) {
    console.error("Failed to fetch staff:", error);
    return { success: false, error: "Gagal memuat data staff." };
  }
}

export async function getStaffById(
  id: string
): Promise<ActionResult<StaffDetail>> {
  try {
    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        jobDesk: { select: { id: true, code: true, name: true } },
        lineManager: { select: { id: true, name: true, staffCode: true } },
        districts: {
          include: {
            district: {
              select: {
                id: true,
                name: true,
                province: { select: { name: true } },
              },
            },
          },
          orderBy: { district: { name: "asc" } },
        },
        farmerGroups: {
          include: {
            farmerGroup: {
              select: {
                id: true,
                name: true,
                code: true,
                district: { select: { name: true } },
              },
            },
          },
          orderBy: { farmerGroup: { name: "asc" } },
        },
        directReports: {
          select: {
            id: true,
            name: true,
            staffCode: true,
            jobDesk: { select: { name: true } },
          },
          orderBy: { name: "asc" },
        },
        _count: { select: { districts: true, farmerGroups: true } },
      },
    });

    if (!staff) {
      return { success: false, error: "Staff tidak ditemukan." };
    }

    return { success: true, data: staff as unknown as StaffDetail };
  } catch (error) {
    console.error("Failed to fetch staff by id:", error);
    return { success: false, error: "Gagal memuat detail staff." };
  }
}

export async function getJobDesksForDropdown(): Promise<
  ActionResult<JobDeskDropdownItem[]>
> {
  try {
    const jobDesks = await prisma.jobDesk.findMany({
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    });
    return { success: true, data: jobDesks };
  } catch (error) {
    console.error("Failed to fetch job desks:", error);
    return { success: false, error: "Gagal memuat data job desk." };
  }
}

export async function getStaffForDropdown(): Promise<
  ActionResult<StaffDropdownItem[]>
> {
  try {
    const staff = await prisma.staff.findMany({
      orderBy: { name: "asc" },
      select: { id: true, staffCode: true, name: true },
    });
    return { success: true, data: staff };
  } catch (error) {
    console.error("Failed to fetch staff for dropdown:", error);
    return { success: false, error: "Gagal memuat data staff." };
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createStaff(data: StaffFormValues): Promise<ActionResult> {
  try {
    const { staffSchema } = await import("@/validations/staff.schema");
    const validated = staffSchema.parse(data);

    // Check unique staffCode
    const existing = await prisma.staff.findUnique({
      where: { staffCode: validated.staffCode },
    });
    if (existing) {
      return { success: false, error: "Kode staff sudah digunakan." };
    }

    await prisma.staff.create({
      data: {
        staffCode: validated.staffCode,
        name: validated.name,
        jobDeskId: validated.jobDeskId,
        emailWri: validated.emailWri || null,
        lineManagerId: validated.lineManagerId || null,
        createdBy: null,
        modifiedBy: null,
        districts: {
          create: validated.districtIds.map((districtId) => ({ districtId })),
        },
        farmerGroups: {
          create: validated.farmerGroupIds.map((farmerGroupId) => ({
            farmerGroupId,
          })),
        },
      },
    });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error) {
    console.error("Failed to create staff:", error);
    const message =
      error instanceof Error ? error.message : "Gagal membuat data staff.";
    return { success: false, error: message };
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateStaff(
  id: string,
  data: StaffFormValues
): Promise<ActionResult> {
  try {
    const { staffSchema } = await import("@/validations/staff.schema");
    const validated = staffSchema.parse(data);

    // Check unique staffCode (exclude self)
    const existing = await prisma.staff.findUnique({
      where: { staffCode: validated.staffCode },
    });
    if (existing && existing.id !== id) {
      return { success: false, error: "Kode staff sudah digunakan." };
    }

    // Prevent self-referential line manager
    if (validated.lineManagerId === id) {
      return {
        success: false,
        error: "Staff tidak bisa menjadi line manager dirinya sendiri.",
      };
    }

    await prisma.$transaction([
      // Delete existing assignments
      prisma.staffDistrict.deleteMany({ where: { staffId: id } }),
      prisma.staffFarmerGroup.deleteMany({ where: { staffId: id } }),
      // Update staff + re-create assignments
      prisma.staff.update({
        where: { id },
        data: {
          staffCode: validated.staffCode,
          name: validated.name,
          jobDeskId: validated.jobDeskId,
          emailWri: validated.emailWri || null,
          lineManagerId: validated.lineManagerId || null,
          modifiedBy: null,
          districts: {
            create: validated.districtIds.map((districtId) => ({ districtId })),
          },
          farmerGroups: {
            create: validated.farmerGroupIds.map((farmerGroupId) => ({
              farmerGroupId,
            })),
          },
        },
      }),
    ]);

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error) {
    console.error("Failed to update staff:", error);
    const message =
      error instanceof Error ? error.message : "Gagal mengupdate data staff.";
    return { success: false, error: message };
  }
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteStaff(id: string): Promise<ActionResult> {
  try {
    // Check if staff has direct reports
    const directReportCount = await prisma.staff.count({
      where: { lineManagerId: id },
    });
    if (directReportCount > 0) {
      return {
        success: false,
        error: `Tidak dapat menghapus. Staff ini masih menjadi line manager dari ${directReportCount} staff lain.`,
      };
    }

    // Cascade delete assignments (no DB cascade for these)
    await prisma.staffDistrict.deleteMany({ where: { staffId: id } });
    await prisma.staffFarmerGroup.deleteMany({ where: { staffId: id } });
    await prisma.staff.delete({ where: { id } });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete staff:", error);
    return { success: false, error: "Gagal menghapus data staff." };
  }
}
