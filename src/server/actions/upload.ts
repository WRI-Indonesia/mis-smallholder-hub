"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, S3_BUCKET } from "@/lib/s3";
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
    const file = formData.get("file") as File | null;
    const activityId = formData.get("activityId") as string | null;

    if (!file) {
      return { success: false, error: "File tidak ditemukan." };
    }
    if (!activityId) {
      return { success: false, error: "Activity ID diperlukan." };
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
    const timestamp = Date.now();
    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();
    const key = `training/${activityId}/${timestamp}-${safeName}`;

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

/**
 * Upload a photo (JPG/PNG/PDF) for a staff activity.
 * Returns the S3 object key.
 */
export async function uploadActivityPhoto(
  formData: FormData
): Promise<ActionResult<{ key: string; filename: string }>> {
  try {
    const file = formData.get("file") as File | null;
    const activityId = formData.get("activityId") as string | null;

    if (!file) return { success: false, error: "File tidak ditemukan." };
    if (!activityId) return { success: false, error: "Activity ID diperlukan." };

    const ALLOWED = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!ALLOWED.includes(file.type)) {
      return { success: false, error: "Hanya JPG, PNG, atau PDF yang diizinkan." };
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      return { success: false, error: "Ukuran file maksimal 5 MB." };
    }

    const timestamp = Date.now();
    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();
    const key = `staff-activity/${activityId}/${timestamp}-${safeName}`;

    const buffer = Buffer.from(await file.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        ContentDisposition: `inline; filename="${file.name}"`,
      })
    );

    return { success: true, data: { key, filename: file.name } };
  } catch (error) {
    console.error("Failed to upload activity photo:", error);
    return { success: false, error: "Gagal mengupload foto. Coba lagi." };
  }
}
