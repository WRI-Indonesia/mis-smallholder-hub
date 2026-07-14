"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { trainingActivitySchema, updateTrainingActivitySchema } from "@/validations/training-activity.schema";
import type { TrainingActivityInput, UpdateTrainingActivityInput } from "@/validations/training-activity.schema";
import { trainingParticipantScoreSchema, addParticipantsSchema } from "@/validations/training-participant.schema";
import type { TrainingParticipantScoreInput } from "@/validations/training-participant.schema";
import { hasPermission, isSuperAdmin } from "@/lib/rbac";
import { getPresignedUrl } from "@/lib/s3";

import {
  getAccessContext,
  farmerAccessFilter,
  farmerGroupAccessFilter,
} from "@/lib/access-context";

export async function getTrainingActivities(search?: string, farmerGroupId?: string) {
  if (!(await hasPermission("master-data-training", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  const access = await getAccessContext();

  // Soft-delete: hanya SUPERADMIN yang boleh melihat record nonaktif (badge +
  // filter Status di UI, untuk restore). User lain dibatasi ke record aktif.
  const where = {
    ...farmerAccessFilter(access),
    ...((await isSuperAdmin()) ? {} : { isActive: true }),
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
      participants: {
        where: { isActive: true },
        select: {
          farmerId: true,
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

  const access = await getAccessContext();

  // Scope enforced (cegah akses pelatihan lintas wilayah via id). Hanya SUPERADMIN
  // yang boleh membuka detail pelatihan nonaktif; user lain dibatasi ke aktif.
  const activity = await prisma.trainingActivity.findFirst({
    where: { id, ...farmerAccessFilter(access), ...((await isSuperAdmin()) ? {} : { isActive: true }) },
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

  // Pastikan lembaga tani target berada dalam scope data-access user.
  // `AND` (bukan spread) agar filter scope `{ id: { in } }` (mode
  // BY_FARMER_GROUP) tidak menimpa literal `id` di atas.
  const access = await getAccessContext();
  const targetGroup = await prisma.farmerGroup.findFirst({
    where: { id: parsed.data.farmerGroupId, isActive: true, AND: farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!targetGroup) {
    return { success: false, error: "Tidak memiliki izin untuk menambah pelatihan pada lembaga tani ini" };
  }

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

  const access = await getAccessContext();

  // Verify activity exists, is active, and is within the user's scope before updating
  const existing = await prisma.trainingActivity.findFirst({
    where: { id, isActive: true, ...farmerAccessFilter(access) },
    select: { id: true },
  });
  if (!existing) return { success: false, error: "Pelatihan tidak ditemukan atau tidak dalam akses Anda" };

  // Cegah pemindahan pelatihan ke lembaga tani di luar scope user.
  const targetGroup = await prisma.farmerGroup.findFirst({
    where: { id: data.farmerGroupId, isActive: true, AND: farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!targetGroup) {
    return { success: false, error: "Tidak memiliki izin untuk memindahkan pelatihan ke lembaga tani ini" };
  }

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

  const access = await getAccessContext();

  const activity = await prisma.trainingActivity.findFirst({
    where: { id, ...farmerAccessFilter(access) },
    select: { isActive: true },
  });
  if (!activity) return { success: false, error: "Pelatihan tidak ditemukan" };

  const session = await auth();

  await prisma.trainingActivity.update({
    where: { id },
    data: { isActive: !activity.isActive, modifiedBy: session?.user?.id ?? null },
  });

  return { success: true };
}

export async function getTrainingPackagesForSelect() {
  if (!(await hasPermission("master-data-training", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  return prisma.trainingPackage.findMany({
    where: { isActive: true },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
}

export async function getFarmersByGroup(farmerGroupId: string) {
  if (!(await hasPermission("master-data-training", "VIEW"))) {
    throw new Error("Tidak memiliki izin untuk mengakses data ini");
  }

  // Pastikan lembaga tani berada dalam scope data-access user sebelum
  // mengembalikan daftar petaninya.
  const access = await getAccessContext();
  const group = await prisma.farmerGroup.findFirst({
    where: { id: farmerGroupId, AND: farmerGroupAccessFilter(access) },
    select: { id: true },
  });
  if (!group) {
    throw new Error("Lembaga Tani tidak ditemukan atau tidak dalam akses Anda");
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

export async function addParticipants(
  activityId: string,
  participants: {
    farmerId: string;
    preTestScore?: number | null;
    postTestScore?: number | null;
  }[]
) {
  if (!(await hasPermission("master-data-training", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah peserta pelatihan" };
  }

  const parsed = addParticipantsSchema.safeParse({ activityId, participants });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Data peserta tidak valid" };
  }
  ({ activityId, participants } = parsed.data);

  const session = await auth();
  const farmerIds = participants.map((p) => p.farmerId);

  // Pastikan activity dalam scope user, lalu batasi peserta ke petani aktif
  // milik lembaga tani activity tersebut (cegah injeksi farmerId sembarang).
  const access = await getAccessContext();
  const activity = await prisma.trainingActivity.findFirst({
    where: { id: activityId, isActive: true, ...farmerAccessFilter(access) },
    select: { farmerGroupId: true },
  });
  if (!activity) {
    return { success: false, error: "Pelatihan tidak ditemukan atau tidak dalam akses Anda" };
  }

  const validFarmers = await prisma.farmer.findMany({
    where: { id: { in: farmerIds }, isActive: true, farmerGroupId: activity.farmerGroupId },
    select: { id: true },
  });
  if (validFarmers.length !== farmerIds.length) {
    return { success: false, error: "Terdapat petani yang tidak valid untuk lembaga tani pelatihan ini" };
  }

  // We do bulk upsert or find and create to avoid duplicate active relations
  const existing = await prisma.trainingParticipant.findMany({
    where: {
      activityId,
      farmerId: { in: farmerIds },
    },
  });

  const existingMap = new Map(existing.map((p) => [p.farmerId, p]));

  await prisma.$transaction(
    participants.map((p) => {
      const exist = existingMap.get(p.farmerId);
      if (exist) {
        return prisma.trainingParticipant.update({
          where: { id: exist.id },
          data: {
            isActive: true,
            preTestScore: p.preTestScore ?? null,
            postTestScore: p.postTestScore ?? null,
            modifiedBy: session?.user?.id ?? null,
          },
        });
      } else {
        return prisma.trainingParticipant.create({
          data: {
            activityId,
            farmerId: p.farmerId,
            preTestScore: p.preTestScore ?? null,
            postTestScore: p.postTestScore ?? null,
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
  const access = await getAccessContext();

  // Scope: peserta hanya bisa diubah bila activity-nya dalam akses user.
  const participant = await prisma.trainingParticipant.findFirst({
    where: { id: participantId, activity: farmerAccessFilter(access) },
    select: { isActive: true },
  });

  if (!participant) return { success: false, error: "Peserta tidak ditemukan atau tidak dalam akses Anda" };

  await prisma.trainingParticipant.update({
    where: { id: participantId },
    data: { isActive: false, modifiedBy: session?.user?.id ?? null },
  });

  return { success: true };
}

export async function removeParticipants(participantIds: string[]) {
  if (!(await hasPermission("master-data-training", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk menghapus peserta pelatihan" };
  }

  const session = await auth();
  const access = await getAccessContext();

  // Scope: hanya peserta yang activity-nya dalam akses user yang dinonaktifkan.
  await prisma.trainingParticipant.updateMany({
    where: { id: { in: participantIds }, isActive: true, activity: farmerAccessFilter(access) },
    data: { isActive: false, modifiedBy: session?.user?.id ?? null },
  });

  return { success: true };
}

export async function updateParticipantScores(
  participantId: string,
  input: TrainingParticipantScoreInput
) {
  if (!(await hasPermission("master-data-training", "EDIT"))) {
    return { success: false, error: "Tidak memiliki izin untuk mengubah nilai peserta" };
  }

  const parsed = trainingParticipantScoreSchema.safeParse(input);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const firstError = Object.values(errors)[0]?.[0] || "Validasi gagal";
    return { success: false, error: firstError };
  }

  const session = await auth();
  const access = await getAccessContext();

  // Scope: nilai peserta hanya bisa diubah bila activity-nya dalam akses user.
  const participant = await prisma.trainingParticipant.findFirst({
    where: { id: participantId, activity: farmerAccessFilter(access) },
    select: { isActive: true },
  });

  if (!participant || !participant.isActive) {
    return { success: false, error: "Peserta tidak ditemukan atau sudah tidak aktif" };
  }

  await prisma.trainingParticipant.update({
    where: { id: participantId },
    data: {
      preTestScore: parsed.data.preTestScore ?? null,
      postTestScore: parsed.data.postTestScore ?? null,
      modifiedBy: session?.user?.id ?? null,
    },
  });

  return { success: true };
}
