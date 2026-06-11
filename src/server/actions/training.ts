"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { trainingActivitySchema, updateTrainingActivitySchema } from "@/validations/training-activity.schema";
import type { TrainingActivityInput, UpdateTrainingActivityInput } from "@/validations/training-activity.schema";
import { hasPermission } from "@/lib/rbac";
import { getPresignedUrl } from "@/lib/s3";

type AccessContext =
  | { mode: "ALL" }
  | { mode: "BY_FARMER_GROUP"; ids: string[] }
  | { mode: "BY_DISTRICT"; ids: string[] };

async function getAccessContext(): Promise<AccessContext> {
  const session = await auth();
  if (!session?.user) return { mode: "BY_DISTRICT", ids: [] };
  if (session.user.role === "SUPERADMIN") return { mode: "ALL" };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      provinces: { include: { province: { include: { districts: true } } } },
      districts: true,
      farmerGroups: true,
    },
  });

  if (!user) return { mode: "BY_DISTRICT", ids: [] };

  // No assignments at all → unrestricted (show all)
  if (user.provinces.length === 0 && user.districts.length === 0 && user.farmerGroups.length === 0) {
    return { mode: "ALL" };
  }

  // FarmerGroup-only assignment → filter by specific KT IDs
  if (user.farmerGroups.length > 0 && user.provinces.length === 0 && user.districts.length === 0) {
    return { mode: "BY_FARMER_GROUP", ids: user.farmerGroups.map((f) => f.farmerGroupId) };
  }

  // Province/District assignment → resolve to district IDs
  const ids = new Set<string>();
  for (const up of user.provinces) {
    for (const d of up.province.districts) ids.add(d.id);
  }
  for (const ud of user.districts) ids.add(ud.districtId);

  return { mode: "BY_DISTRICT", ids: [...ids] };
}

export async function getTrainingActivities(search?: string, farmerGroupId?: string) {
  if (!(await hasPermission("master-data-training", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { farmerGroupId: { in: access.ids } } :
    access.mode === "BY_DISTRICT" ? { farmerGroup: { districtId: { in: access.ids } } } :
    {};

  const where = {
    ...accessFilter,
    isActive: true,
    ...(farmerGroupId ? { farmerGroupId } : {}),
    ...(search
      ? {
          OR: [
            { location: { contains: search, mode: "insensitive" as const } },
            { package: { name: { contains: search, mode: "insensitive" as const } } },
            { farmerGroup: { name: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  return prisma.trainingActivity.findMany({
    where,
    include: {
      package: true,
      farmerGroup: {
        include: {
          district: true,
        },
      },
      _count: {
        select: {
          participants: {
            where: { isActive: true }
          }
        }
      }
    },
    orderBy: { trainingDate: "desc" },
  });
}

export async function getTrainingActivityById(id: string) {
  if (!(await hasPermission("master-data-training", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const activity = await prisma.trainingActivity.findUnique({
    where: { id, isActive: true },
    include: {
      package: true,
      farmerGroup: {
        include: {
          district: true,
        },
      },
      participants: {
        where: { isActive: true },
        include: {
          farmer: true,
        },
        orderBy: {
          farmer: {
            name: "asc"
          }
        }
      },
    },
  });

  if (!activity) return null;

  let evidenceUrl: string | null = null;
  if (activity.evidenceKey) {
    try {
      evidenceUrl = await getPresignedUrl(activity.evidenceKey);
    } catch (err) {
      console.error("Gagal mendapatkan presigned URL:", err);
    }
  }

  return {
    ...activity,
    evidenceUrl,
  };
}

export async function createTrainingActivity(input: TrainingActivityInput) {
  if (!(await hasPermission("master-data-training", "CREATE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menambah pelatihan" };
  }

  const parsed = trainingActivitySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const session = await auth();

  const created = await prisma.trainingActivity.create({
    data: {
      ...parsed.data,
      createdBy: session?.user?.id ?? null,
    },
  });

  return { success: true, id: created.id };
}

export async function updateTrainingActivity(input: UpdateTrainingActivityInput) {
  if (!(await hasPermission("master-data-training", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah pelatihan" };
  }

  const parsed = updateTrainingActivitySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.flatten().fieldErrors };

  const session = await auth();
  const { id, ...data } = parsed.data;

  const existing = await prisma.trainingActivity.findUnique({ where: { id, isActive: true } });
  if (!existing) return { success: false, error: "Pelatihan tidak ditemukan atau sudah tidak aktif" };

  await prisma.trainingActivity.update({
    where: { id },
    data: { ...data, modifiedBy: session?.user?.id ?? null },
  });

  return { success: true };
}

export async function toggleTrainingActivityActive(id: string) {
  if (!(await hasPermission("master-data-training", "DELETE"))) {
    return { success: false, error: "Tidak memiliki izin untuk menonaktifkan/mengaktifkan pelatihan" };
  }

  const activity = await prisma.trainingActivity.findUnique({ where: { id }, select: { isActive: true } });
  if (!activity) return { success: false, error: "Pelatihan tidak ditemukan" };

  await prisma.trainingActivity.update({
    where: { id },
    data: { isActive: !activity.isActive },
  });

  return { success: true };
}

export async function getTrainingPackagesForSelect() {
  return prisma.trainingPackage.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}

export async function getFarmerGroupsForSelect() {
  const access = await getAccessContext();

  const accessFilter =
    access.mode === "BY_FARMER_GROUP" ? { id: { in: access.ids } } :
    access.mode === "BY_DISTRICT" ? { districtId: { in: access.ids } } :
    {};

  return prisma.farmerGroup.findMany({
    where: {
      ...accessFilter,
      isActive: true,
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function getFarmersByGroup(farmerGroupId: string) {
  if (!(await hasPermission("master-data-training", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  return prisma.farmer.findMany({
    where: {
      farmerGroupId,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      farmerId: true,
      nik: true,
      gender: true,
      trainingParticipants: {
        where: { isActive: true, activity: { isActive: true } },
        select: {
          activity: {
            select: {
              id: true,
              packageId: true,
              trainingDate: true,
              package: {
                select: {
                  name: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: { name: "asc" },
  });
}

export async function addParticipants(activityId: string, farmerIds: string[]) {
  if (!(await hasPermission("master-data-training", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah peserta pelatihan" };
  }

  const session = await auth();

  // We do bulk upsert or find and create to avoid duplicate active relations
  const existing = await prisma.trainingParticipant.findMany({
    where: {
      activityId,
      farmerId: { in: farmerIds },
    },
  });

  const existingMap = new Map(existing.map((p) => [p.farmerId, p]));

  await prisma.$transaction(
    farmerIds.map((farmerId) => {
      const exist = existingMap.get(farmerId);
      if (exist) {
        return prisma.trainingParticipant.update({
          where: { id: exist.id },
          data: { isActive: true, modifiedBy: session?.user?.id ?? null },
        });
      } else {
        return prisma.trainingParticipant.create({
          data: {
            activityId,
            farmerId,
            createdBy: session?.user?.id ?? null,
          },
        });
      }
    })
  );

  return { success: true };
}

export async function removeParticipant(participantId: string) {
  if (!(await hasPermission("master-data-training", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk menghapus peserta pelatihan" };
  }

  const session = await auth();

  const participant = await prisma.trainingParticipant.findUnique({
    where: { id: participantId },
    select: { isActive: true },
  });

  if (!participant) return { success: false, error: "Peserta tidak ditemukan" };

  await prisma.trainingParticipant.update({
    where: { id: participantId },
    data: { isActive: false, modifiedBy: session?.user?.id ?? null },
  });

  return { success: true };
}
