"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, S3_BUCKET } from "@/lib/s3";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getAccessContext, farmerAccessFilter } from "@/lib/access-context";
import { SAFE_ID_SEGMENT, buildTrainingEvidenceKey } from "@/lib/training-evidence";
import type { ActionResult } from "@/types/action-result";

/**
 * Upload a PDF file to the S3-compatible bucket.
 * Returns the object KEY (not a public URL) — caller must generate
 * a presigned URL separately when the file needs to be accessed.
 *
 * @param formData - FormData containing:
 *   - "file"       : the PDF File object
 *   - "activityId" : the training activity ID (used in the key path)
 */
export async function uploadTrainingEvidence(
  formData: FormData
): Promise<ActionResult<{ key: string; filename: string }>> {
  try {
    // Evidence pelatihan hanya boleh diunggah oleh user yang dapat mengelola pelatihan
    // (menambah kegiatan baru = CREATE, atau melengkapi kegiatan yang ada = EDIT).
    if (
      !(await hasPermission("master-data-training", "CREATE")) &&
      !(await hasPermission("master-data-training", "EDIT"))
    ) {
      return { success: false, error: "Tidak memiliki izin untuk mengunggah bukti pelatihan." };
    }

    const file = formData.get("file") as File | null;
    const activityId = formData.get("activityId") as string | null;

    if (!file) {
      return { success: false, error: "File tidak ditemukan." };
    }
    if (!activityId) {
      return { success: false, error: "Activity ID diperlukan." };
    }
    // #385: activityId masuk path S3 — harus satu segmen aman (tanpa `/`, `..`)
    // DAN pelatihan aktif dalam scope user, sama dengan syarat `updateTrainingActivity`.
    if (!SAFE_ID_SEGMENT.test(activityId)) {
      return { success: false, error: "Activity ID tidak valid." };
    }
    const access = await getAccessContext();
    const activity = await prisma.trainingActivity.findFirst({
      where: { id: activityId, isActive: true, ...farmerAccessFilter(access) },
      select: { id: true },
    });
    if (!activity) {
      return { success: false, error: "Pelatihan tidak ditemukan atau tidak dalam akses Anda." };
    }

    // ─── Validate file type ───────────────────────────────────────────────
    if (file.type !== "application/pdf") {
      return { success: false, error: "Hanya file PDF yang diizinkan." };
    }

    // ─── Validate file size (max 10 MB) ──────────────────────────────────
    const MAX_SIZE_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return { success: false, error: "Ukuran file maksimal 10 MB." };
    }

    // ─── Build object key ─────────────────────────────────────────────────
    const key = buildTrainingEvidenceKey(activity.id, file.name, Date.now());

    // ─── Upload to bucket ─────────────────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: "application/pdf",
        ContentDisposition: `inline; filename="${file.name}"`,
      })
    );

    // Return the KEY — not a URL. Presigned URL is generated on read.
    return { success: true, data: { key, filename: file.name } };
  } catch (error) {
    console.error("Failed to upload training evidence:", error);
    return { success: false, error: "Gagal mengupload file. Coba lagi." };
  }
}
