"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getPresignedUrl, isS3Key } from "@/lib/s3";
import type { ActionResult } from "@/types/action-result";

const REVALIDATE_PATH = "/admin/master-data/training";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TrainingActivityRow {
  id: string;
  packageId: string;
  package: {
    code: string;
    name: string;
  };
  farmerGroupId: string | null;
  farmerGroup: {
    id: string;
    name: string;
    code: string | null;
    district: {
      name: string;
    };
  } | null;
  location: string | null;
  trainingDate: Date;
  totalParticipant: number;
  evidences: {
    id: string;
    name: string;
    uri: string;          // S3 object key stored in DB
    presignedUrl: string; // resolved presigned URL for display
  }[];
  _count: {
    participants: number;
  };
}

export interface TrainingActivityDetail extends TrainingActivityRow {
  participants: {
    id: string;
    farmer: {
      id: string;
      name: string;
      nik: string;
      wriFarmerId: string | null;
      gender: string | null;
    };
  }[];
}

export interface TrainingPackageDropdownItem {
  id: string;
  code: string;
  name: string;
}

export interface FarmerGroupDropdownItem {
  id: string;
  name: string;
  code: string | null;
  district: { name: string };
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getTrainingActivities(): Promise<
  ActionResult<TrainingActivityRow[]>
> {
  try {
    const activities = await prisma.trainingActivity.findMany({
      orderBy: { trainingDate: "desc" },
      include: {
        package: { select: { code: true, name: true } },
        farmerGroup: {
          select: {
            id: true, name: true, code: true,
            district: { select: { name: true } },
          },
        },
        evidences: { select: { id: true, name: true, uri: true } },
        _count: { select: { participants: true } },
      },
    });

    // Resolve presigned URLs for all evidences in parallel
    const resolved = await Promise.all(
      activities.map(async (a) => ({
        ...a,
        evidences: await Promise.all(
          a.evidences.map(async (e) => ({
            ...e,
            presignedUrl: isS3Key(e.uri)
              ? await getPresignedUrl(e.uri)
              : e.uri,
          }))
        ),
      }))
    );

    return { success: true, data: resolved as unknown as TrainingActivityRow[] };
  } catch (error) {
    console.error("Failed to fetch training activities:", error);
    return { success: false, error: "Gagal memuat data training." };
  }
}

export async function getTrainingActivityById(
  id: string
): Promise<ActionResult<TrainingActivityDetail>> {
  try {
    const activity = await prisma.trainingActivity.findUnique({
      where: { id },
      include: {
        package: {
          select: { code: true, name: true },
        },
        farmerGroup: {
          select: {
            id: true,
            name: true,
            code: true,
            district: { select: { name: true } },
          },
        },
        evidences: {
          select: { id: true, name: true, uri: true },
        },
        participants: {
          include: {
            farmer: {
              select: {
                id: true,
                name: true,
                nik: true,
                wriFarmerId: true,
                gender: true,
              },
            },
          },
          orderBy: { farmer: { name: "asc" } },
        },
        _count: { select: { participants: true } },
      },
    });

    if (!activity) {
      return { success: false, error: "Data training tidak ditemukan." };
    }

    // Resolve presigned URLs for evidences
    const resolved = {
      ...activity,
      evidences: await Promise.all(
        activity.evidences.map(async (e) => ({
          ...e,
          presignedUrl: isS3Key(e.uri)
            ? await getPresignedUrl(e.uri)
            : e.uri,
        }))
      ),
    };

    return { success: true, data: resolved as unknown as TrainingActivityDetail };
  } catch (error) {
    console.error("Failed to fetch training activity by id:", error);
    return { success: false, error: "Gagal memuat detail training." };
  }
}

export async function getTrainingPackagesForDropdown(): Promise<
  ActionResult<TrainingPackageDropdownItem[]>
> {
  try {
    const packages = await prisma.trainingPackage.findMany({
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    });
    return { success: true, data: packages };
  } catch (error) {
    console.error("Failed to fetch training packages for dropdown:", error);
    return { success: false, error: "Gagal memuat data paket training." };
  }
}

export async function getFarmerGroupsForDropdown(): Promise<
  ActionResult<FarmerGroupDropdownItem[]>
> {
  try {
    const groups = await prisma.farmerGroup.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        district: { select: { name: true } },
      },
    });
    return { success: true, data: groups };
  } catch (error) {
    console.error("Failed to fetch farmer groups for dropdown:", error);
    return { success: false, error: "Gagal memuat data kelompok tani." };
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

export async function createTrainingActivity(
  data: import("@/validations/training-activity.schema").TrainingActivityFormValues,
  evidenceUrl?: string,
  evidenceFilename?: string
): Promise<ActionResult<{ id: string }>> {
  try {
    const { trainingActivitySchema } = await import(
      "@/validations/training-activity.schema"
    );
    const validated = trainingActivitySchema.parse(data);

    const activity = await prisma.trainingActivity.create({
      data: {
        packageId: validated.packageId,
        farmerGroupId: validated.farmerGroupId,
        location: validated.location || null,
        trainingDate: new Date(validated.trainingDate),
        totalParticipant: 0,
        createdBy: null,
        modifiedBy: null,
      },
    });

    // Save evidence if URL provided
    if (evidenceUrl) {
      await prisma.trainingEvidence.create({
        data: {
          name: evidenceFilename ?? "Evidence",
          uri: evidenceUrl,
          type: "pdf",
          activities: { connect: { id: activity.id } },
          createdBy: null,
          modifiedBy: null,
        },
      });
    }

    revalidatePath(REVALIDATE_PATH);
    return { success: true, data: { id: activity.id } };
  } catch (error) {
    console.error("Failed to create training activity:", error);
    const message =
      error instanceof Error ? error.message : "Gagal membuat data training.";
    return { success: false, error: message };
  }
}

// ─── Update ──────────────────────────────────────────────────────────────────

export async function updateTrainingActivity(
  id: string,
  data: import("@/validations/training-activity.schema").TrainingActivityFormValues,
  evidenceUrl?: string,
  evidenceFilename?: string
): Promise<ActionResult> {
  try {
    const { trainingActivitySchema } = await import(
      "@/validations/training-activity.schema"
    );
    const validated = trainingActivitySchema.parse(data);

    await prisma.trainingActivity.update({
      where: { id },
      data: {
        packageId: validated.packageId,
        farmerGroupId: validated.farmerGroupId,
        location: validated.location || null,
        trainingDate: new Date(validated.trainingDate),
        modifiedBy: null,
      },
    });

    // Replace evidence if a new URL is provided
    if (evidenceUrl) {
      // Disconnect all existing evidences from this activity
      await prisma.trainingActivity.update({
        where: { id },
        data: { evidences: { set: [] } },
      });

      // Save new evidence record
      await prisma.trainingEvidence.create({
        data: {
          name: evidenceFilename ?? "Evidence",
          uri: evidenceUrl,
          type: "pdf",
          activities: { connect: { id } },
          createdBy: null,
          modifiedBy: null,
        },
      });
    }

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error) {
    console.error("Failed to update training activity:", error);
    const message =
      error instanceof Error ? error.message : "Gagal mengupdate data training.";
    return { success: false, error: message };
  }
}

// ─── Participants ─────────────────────────────────────────────────────────────

export interface FarmerForParticipant {
  id: string;
  name: string;
  wriFarmerId: string | null;
  nik: string;
  gender: string | null;
}

export async function getFarmersByGroup(
  farmerGroupId: string
): Promise<ActionResult<FarmerForParticipant[]>> {
  try {
    const farmers = await prisma.farmer.findMany({
      where: { farmerGroupId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        wriFarmerId: true,
        nik: true,
        gender: true,
      },
    });
    return { success: true, data: farmers };
  } catch (error) {
    console.error("Failed to fetch farmers by group:", error);
    return { success: false, error: "Gagal memuat data petani." };
  }
}

export async function addParticipants(
  activityId: string,
  farmerIds: string[]
): Promise<ActionResult<{ added: number }>> {
  try {
    if (farmerIds.length === 0) {
      return { success: true, data: { added: 0 } };
    }

    // Get existing participant farmerIds to avoid duplicates
    const existing = await prisma.trainingParticipant.findMany({
      where: { activityId },
      select: { farmerId: true },
    });
    const existingIds = new Set(existing.map((p) => p.farmerId));
    const newIds = farmerIds.filter((id) => !existingIds.has(id));

    if (newIds.length === 0) {
      return { success: true, data: { added: 0 } };
    }

    await prisma.trainingParticipant.createMany({
      data: newIds.map((farmerId) => ({
        activityId,
        farmerId,
        createdBy: null,
        modifiedBy: null,
      })),
    });

    // Update totalParticipant count
    const total = await prisma.trainingParticipant.count({
      where: { activityId },
    });
    await prisma.trainingActivity.update({
      where: { id: activityId },
      data: { totalParticipant: total },
    });

    revalidatePath(`${REVALIDATE_PATH}/${activityId}`);
    return { success: true, data: { added: newIds.length } };
  } catch (error) {
    console.error("Failed to add participants:", error);
    return { success: false, error: "Gagal menambahkan peserta." };
  }
}

export async function removeParticipant(
  participantId: string,
  activityId: string
): Promise<ActionResult> {
  try {
    await prisma.trainingParticipant.delete({ where: { id: participantId } });

    // Update totalParticipant count
    const total = await prisma.trainingParticipant.count({
      where: { activityId },
    });
    await prisma.trainingActivity.update({
      where: { id: activityId },
      data: { totalParticipant: total },
    });

    revalidatePath(`${REVALIDATE_PATH}/${activityId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to remove participant:", error);
    return { success: false, error: "Gagal menghapus peserta." };
  }
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteTrainingActivity(id: string): Promise<ActionResult> {
  try {
    // Delete participants first (no cascade)
    await prisma.trainingParticipant.deleteMany({
      where: { activityId: id },
    });

    await prisma.trainingActivity.delete({ where: { id } });

    revalidatePath(REVALIDATE_PATH);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete training activity:", error);
    return { success: false, error: "Gagal menghapus data training." };
  }
}
