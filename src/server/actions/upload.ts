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
    // Menempelkan bukti = `updateTrainingActivity` (EDIT) — form membuat pelatihan
    // dulu lalu mengunggah & meng-update. Dulu CREATE saja cukup untuk unggah ke
    // pelatihan mana pun dalam scope, walau tak bisa menempelkannya (#385).
    if (!(await hasPermission("master-data-training", "EDIT"))) {
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

    // ─── Validate file type & size (murah — sebelum DB) ──────────────────
    if (file.type !== "application/pdf") {
      return { success: false, error: "Hanya file PDF yang diizinkan." };
    }
    const MAX_SIZE_BYTES = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return { success: false, error: "Ukuran file maksimal 10 MB." };
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

    const key = buildTrainingEvidenceKey(activity.id, file.name, Date.now());
    // Nama tampilan disimpan di `evidenceName` (Zod max 255 unit UTF-16). Potong per
    // KARAKTER — `slice` bisa memutus pasangan surrogate (emoji) → encodeURIComponent melempar.
    const chars = Array.from(file.name);
    let filename = file.name;
    while (filename.length > 255) {
      chars.pop();
      filename = chars.join("");
    }

    // ─── Upload to bucket ─────────────────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: "application/pdf",
        // Header HTTP hanya ASCII: nama asli lewat `filename*` (RFC 5987), cadangan
        // ASCII tersanitasi — nama ber-en dash/emoji/kutip dulu menggagalkan unggah.
        ContentDisposition: `inline; filename="${key.slice(key.lastIndexOf("/") + 1)}"; filename*=UTF-8''${encodeURIComponent(filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`,
      })
    );

    // Return the KEY — not a URL. Presigned URL is generated on read.
    return { success: true, data: { key, filename } };
  } catch (error) {
    console.error("Failed to upload training evidence:", error);
    return { success: false, error: "Gagal mengupload file. Coba lagi." };
  }
}
