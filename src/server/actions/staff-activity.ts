"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getPresignedUrl } from "@/lib/s3";
import type { ActionResult } from "@/types/action-result";
import type { StaffActivityFormValues } from "@/validations/staff-activity.schema";
import { ActivityStatus } from "@prisma/client";

// ─── Types ───────────────────────────────────────────────────────────────────

export type { ActivityStatus };

export interface StaffActivityPhoto {
  id: string;
  s3Key: string;
  filename: string;
  presignedUrl: string;
}

export interface StaffActivityRow {
  id: string;
  staffId: string;
  activityDate: Date;
  planning: string;
  realization: string | null;
  comment: string | null;
  status: ActivityStatus;
  approvedById: string | null;
  approvedBy: { id: string; name: string; staffCode: string } | null;
  approvedAt: Date | null;
  rejectionNote: string | null;
  photos: StaffActivityPhoto[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function resolvePhotos(
  photos: { id: string; s3Key: string; filename: string }[]
): Promise<StaffActivityPhoto[]> {
  return Promise.all(
    photos.map(async (p) => ({
      ...p,
      presignedUrl: await getPresignedUrl(p.s3Key),
    }))
  );
}

function revalidate(staffId: string) {
  revalidatePath(`/admin/master-data/staff/${staffId}`);
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getStaffActivities(
  staffId: string,
  year: number,
  month: number // 1-based
): Promise<ActionResult<StaffActivityRow[]>> {
  try {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0); // last day of month

    const activities = await prisma.staffActivity.findMany({
      where: {
        staffId,
        activityDate: { gte: start, lte: end },
      },
      orderBy: { activityDate: "asc" },
      include: {
        approvedBy: { select: { id: true, name: true, staffCode: true } },
        photos: { select: { id: true, s3Key: true, filename: true } },
      },
    });

    const resolved = await Promise.all(
      activities.map(async (a) => ({
        ...a,
        photos: await resolvePhotos(a.photos),
      }))
    );

    return { success: true, data: resolved as unknown as StaffActivityRow[] };
  } catch (error) {
    console.error("Failed to fetch staff activities:", error);
    return { success: false, error: "Gagal memuat data aktivitas." };
  }
}

export async function getStaffActivityById(
  id: string
): Promise<ActionResult<StaffActivityRow>> {
  try {
    const activity = await prisma.staffActivity.findUnique({
      where: { id },
      include: {
        approvedBy: { select: { id: true, name: true, staffCode: true } },
        photos: { select: { id: true, s3Key: true, filename: true } },
      },
    });

    if (!activity) {
      return { success: false, error: "Aktivitas tidak ditemukan." };
    }

    const resolved = {
      ...activity,
      photos: await resolvePhotos(activity.photos),
    };

    return { success: true, data: resolved as unknown as StaffActivityRow };
  } catch (error) {
    console.error("Failed to fetch staff activity:", error);
    return { success: false, error: "Gagal memuat detail aktivitas." };
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createStaffActivity(
  staffId: string,
  data: StaffActivityFormValues
): Promise<ActionResult<{ id: string }>> {
  try {
    const activity = await prisma.staffActivity.create({
      data: {
        staffId,
        activityDate: new Date(data.activityDate),
        planning: data.planning,
        realization: data.realization || null,
        comment: data.comment || null,
        status: "DRAFT",
        createdBy: null,
        modifiedBy: null,
      },
    });

    revalidate(staffId);
    return { success: true, data: { id: activity.id } };
  } catch (error: unknown) {
    console.error("Failed to create staff activity:", error);
    // Unique constraint violation — already has activity for this date
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return {
        success: false,
        error: "Sudah ada aktivitas untuk tanggal ini.",
      };
    }
    return { success: false, error: "Gagal membuat aktivitas." };
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateStaffActivity(
  id: string,
  staffId: string,
  data: StaffActivityFormValues
): Promise<ActionResult> {
  try {
    // Only DRAFT or REJECTED can be edited
    const existing = await prisma.staffActivity.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!existing) {
      return { success: false, error: "Aktivitas tidak ditemukan." };
    }
    if (
      existing.status !== "DRAFT" &&
      existing.status !== "REJECTED"
    ) {
      return {
        success: false,
        error: "Hanya aktivitas berstatus Draft atau Ditolak yang dapat diedit.",
      };
    }

    await prisma.staffActivity.update({
      where: { id },
      data: {
        activityDate: new Date(data.activityDate),
        planning: data.planning,
        realization: data.realization || null,
        comment: data.comment || null,
        modifiedBy: null,
      },
    });

    revalidate(staffId);
    return { success: true };
  } catch (error) {
    console.error("Failed to update staff activity:", error);
    return { success: false, error: "Gagal mengupdate aktivitas." };
  }
}

// ─── Submit for approval ──────────────────────────────────────────────────────

export async function submitStaffActivity(
  id: string,
  staffId: string
): Promise<ActionResult> {
  try {
    const existing = await prisma.staffActivity.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!existing) {
      return { success: false, error: "Aktivitas tidak ditemukan." };
    }
    if (
      existing.status !== "DRAFT" &&
      existing.status !== "REJECTED"
    ) {
      return {
        success: false,
        error: "Hanya aktivitas berstatus Draft atau Ditolak yang dapat disubmit.",
      };
    }

    await prisma.staffActivity.update({
      where: { id },
      data: {
        status: "PENDING_APPROVAL",
        rejectionNote: null,
        modifiedBy: null,
      },
    });

    revalidate(staffId);
    return { success: true };
  } catch (error) {
    console.error("Failed to submit staff activity:", error);
    return { success: false, error: "Gagal mengsubmit aktivitas." };
  }
}

// ─── Approve ─────────────────────────────────────────────────────────────────

export async function approveStaffActivity(
  id: string,
  staffId: string,
  approvedById: string
): Promise<ActionResult> {
  try {
    await prisma.staffActivity.update({
      where: { id },
      data: {
        status: "APPROVED",
        approvedById,
        approvedAt: new Date(),
        rejectionNote: null,
        modifiedBy: null,
      },
    });

    revalidate(staffId);
    return { success: true };
  } catch (error) {
    console.error("Failed to approve staff activity:", error);
    return { success: false, error: "Gagal menyetujui aktivitas." };
  }
}

// ─── Reject ───────────────────────────────────────────────────────────────────

export async function rejectStaffActivity(
  id: string,
  staffId: string,
  rejectionNote: string
): Promise<ActionResult> {
  try {
    await prisma.staffActivity.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectionNote,
        approvedById: null,
        approvedAt: null,
        modifiedBy: null,
      },
    });

    revalidate(staffId);
    return { success: true };
  } catch (error) {
    console.error("Failed to reject staff activity:", error);
    return { success: false, error: "Gagal menolak aktivitas." };
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteStaffActivity(
  id: string,
  staffId: string
): Promise<ActionResult> {
  try {
    const existing = await prisma.staffActivity.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!existing) {
      return { success: false, error: "Aktivitas tidak ditemukan." };
    }
    if (existing.status === "APPROVED") {
      return {
        success: false,
        error: "Aktivitas yang sudah disetujui tidak dapat dihapus.",
      };
    }

    // Photos cascade via DB
    await prisma.staffActivity.delete({ where: { id } });

    revalidate(staffId);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete staff activity:", error);
    return { success: false, error: "Gagal menghapus aktivitas." };
  }
}

// ─── Photo management ─────────────────────────────────────────────────────────

export async function addActivityPhoto(
  activityId: string,
  staffId: string,
  s3Key: string,
  filename: string
): Promise<ActionResult<{ id: string }>> {
  try {
    // Max 10 photos per activity
    const count = await prisma.staffActivityPhoto.count({
      where: { activityId },
    });
    if (count >= 10) {
      return {
        success: false,
        error: "Maksimal 10 foto per aktivitas.",
      };
    }

    const photo = await prisma.staffActivityPhoto.create({
      data: { activityId, s3Key, filename },
    });

    revalidate(staffId);
    return { success: true, data: { id: photo.id } };
  } catch (error) {
    console.error("Failed to add activity photo:", error);
    return { success: false, error: "Gagal menambahkan foto." };
  }
}

export async function deleteActivityPhoto(
  photoId: string,
  staffId: string
): Promise<ActionResult> {
  try {
    await prisma.staffActivityPhoto.delete({ where: { id: photoId } });
    revalidate(staffId);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete activity photo:", error);
    return { success: false, error: "Gagal menghapus foto." };
  }
}

// ─── Export data ──────────────────────────────────────────────────────────────

export interface ActivityExportRow {
  no: number;
  day: string;
  date: string;
  planning: string;
  realization: string;
  comment: string;
  photos: { presignedUrl: string; filename: string }[];
  validationStatus: string;
  validatedBy: string;
}

export async function getActivitiesForExport(
  staffId: string,
  year: number,
  month: number
): Promise<ActionResult<ActivityExportRow[]>> {
  try {
    const start = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();

    const activities = await prisma.staffActivity.findMany({
      where: {
        staffId,
        activityDate: {
          gte: start,
          lte: new Date(year, month - 1, daysInMonth),
        },
      },
      include: {
        approvedBy: { select: { name: true } },
        photos: { select: { s3Key: true, filename: true } },
      },
      orderBy: { activityDate: "asc" },
    });

    // Resolve presigned URLs for all photos in parallel
    const activitiesWithUrls = await Promise.all(
      activities.map(async (a) => ({
        ...a,
        photos: await Promise.all(
          a.photos.map(async (p) => ({
            filename: p.filename,
            presignedUrl: await getPresignedUrl(p.s3Key),
          }))
        ),
      }))
    );

    const activityMap = new Map(
      activitiesWithUrls.map((a) => [a.activityDate.getDate(), a])
    );

    const DAYS_ID = [
      "Sunday", "Monday", "Tuesday", "Wednesday",
      "Thursday", "Friday", "Saturday",
    ];

    const rows: ActivityExportRow[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const a = activityMap.get(day);

      const statusLabel: Record<ActivityStatus, string> = {
        DRAFT: "Draft",
        PENDING_APPROVAL: "Menunggu Approval",
        APPROVED: "Disetujui",
        REJECTED: "Ditolak",
      };

      rows.push({
        no: day,
        day: DAYS_ID[date.getDay()],
        date: date.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        planning: a?.planning ?? "",
        realization: a?.realization ?? "",
        comment: a?.comment ?? "",
        photos: a?.photos ?? [],
        validationStatus: a ? statusLabel[a.status] : "",
        validatedBy: a?.approvedBy?.name ?? "",
      });
    }

    return { success: true, data: rows };
  } catch (error) {
    console.error("Failed to get activities for export:", error);
    return { success: false, error: "Gagal memuat data untuk export." };
  }
}
