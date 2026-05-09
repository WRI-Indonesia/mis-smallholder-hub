"use server";

import { PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, S3_BUCKET, getPresignedUrl } from "@/lib/s3";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types/action-result";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TrainingPDFInfo {
  id: string;
  name: string;
  uri: string; // S3 key
  type: string;
  size?: number;
  uploadedAt: Date;
  presignedUrl: string;
  downloadUrl: string;
}

export interface PDFUploadResult {
  evidenceId: string;
  key: string;
  filename: string;
  presignedUrl: string;
}

// ─── PDF Upload with Enhanced Management ─────────────────────────────────────

/**
 * Upload PDF evidence with better file management and metadata tracking
 */
export async function uploadTrainingPDF(
  formData: FormData
): Promise<ActionResult<PDFUploadResult>> {
  try {
    const file = formData.get("file") as File | null;
    const activityId = formData.get("activityId") as string | null;
    const description = formData.get("description") as string | null;

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

    // ─── Validate file size (max 15 MB) ──────────────────────────────────
    const MAX_SIZE_BYTES = 15 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return { success: false, error: "Ukuran file maksimal 15 MB." };
    }

    // ─── Check if activity exists ────────────────────────────────────────
    const activity = await prisma.trainingActivity.findUnique({
      where: { id: activityId },
      select: { id: true, trainingDate: true },
    });

    if (!activity) {
      return { success: false, error: "Training activity tidak ditemukan." };
    }

    // ─── Build enhanced object key with date structure ───────────────────
    const date = new Date(activity.trainingDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const timestamp = Date.now();
    
    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();
    
    const key = `training/evidence/${year}/${month}/${activityId}/${timestamp}-${safeName}`;

    // ─── Upload to S3 with enhanced metadata ─────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer());

    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: "application/pdf",
        ContentDisposition: `inline; filename="${file.name}"`,
        Metadata: {
          "activity-id": activityId,
          "original-filename": file.name,
          "upload-timestamp": timestamp.toString(),
          "file-size": file.size.toString(),
        },
      })
    );

    // ─── Save evidence record to database ────────────────────────────────
    const evidence = await prisma.trainingEvidence.create({
      data: {
        name: description || file.name,
        uri: key,
        type: "pdf",
        activities: { connect: { id: activityId } },
        createdBy: null,
        modifiedBy: null,
      },
    });

    // ─── Generate presigned URL for immediate access ─────────────────────
    const presignedUrl = await getPresignedUrl(key, 3600); // 1 hour

    revalidatePath("/admin/master-data/training");
    revalidatePath(`/admin/master-data/training/${activityId}`);

    return {
      success: true,
      data: {
        evidenceId: evidence.id,
        key,
        filename: file.name,
        presignedUrl,
      },
    };
  } catch (error) {
    console.error("Failed to upload training PDF:", error);
    return { success: false, error: "Gagal mengupload PDF. Coba lagi." };
  }
}

// ─── PDF Management Functions ────────────────────────────────────────────────

/**
 * Get all PDF evidences for a training activity with presigned URLs
 */
export async function getTrainingPDFs(
  activityId: string
): Promise<ActionResult<TrainingPDFInfo[]>> {
  try {
    const evidences = await prisma.trainingEvidence.findMany({
      where: {
        activities: { some: { id: activityId } },
        type: "pdf",
      },
      orderBy: { createdAt: "desc" },
    });

    const pdfs = await Promise.all(
      evidences.map(async (evidence) => {
        const presignedUrl = await getPresignedUrl(evidence.uri, 3600);
        const downloadUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: evidence.uri,
            ResponseContentDisposition: `attachment; filename="${evidence.name}"`,
          }),
          { expiresIn: 3600 }
        );

        return {
          id: evidence.id,
          name: evidence.name,
          uri: evidence.uri,
          type: evidence.type || "pdf",
          uploadedAt: evidence.createdAt,
          presignedUrl,
          downloadUrl,
        };
      })
    );

    return { success: true, data: pdfs };
  } catch (error) {
    console.error("Failed to get training PDFs:", error);
    return { success: false, error: "Gagal memuat daftar PDF." };
  }
}

/**
 * Generate fresh presigned URL for a specific PDF
 */
export async function generatePDFLink(
  evidenceId: string,
  expiresInHours = 1
): Promise<ActionResult<{ presignedUrl: string; downloadUrl: string; expiresAt: Date }>> {
  try {
    const evidence = await prisma.trainingEvidence.findUnique({
      where: { id: evidenceId },
      select: { uri: true, name: true },
    });

    if (!evidence) {
      return { success: false, error: "Evidence tidak ditemukan." };
    }

    const expiresIn = expiresInHours * 3600;
    const presignedUrl = await getPresignedUrl(evidence.uri, expiresIn);
    
    const downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: evidence.uri,
        ResponseContentDisposition: `attachment; filename="${evidence.name}"`,
      }),
      { expiresIn }
    );

    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    return {
      success: true,
      data: { presignedUrl, downloadUrl, expiresAt },
    };
  } catch (error) {
    console.error("Failed to generate PDF link:", error);
    return { success: false, error: "Gagal generate link PDF." };
  }
}

/**
 * Delete PDF evidence from both S3 and database
 */
export async function deleteTrainingPDF(
  evidenceId: string
): Promise<ActionResult> {
  try {
    const evidence = await prisma.trainingEvidence.findUnique({
      where: { id: evidenceId },
      select: { uri: true, activities: { select: { id: true } } },
    });

    if (!evidence) {
      return { success: false, error: "Evidence tidak ditemukan." };
    }

    // ─── Delete from S3 ──────────────────────────────────────────────────
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: S3_BUCKET,
          Key: evidence.uri,
        })
      );
    } catch (s3Error) {
      console.warn("Failed to delete from S3, continuing with DB cleanup:", s3Error);
    }

    // ─── Delete from database ────────────────────────────────────────────
    await prisma.trainingEvidence.delete({
      where: { id: evidenceId },
    });

    // ─── Revalidate related pages ────────────────────────────────────────
    revalidatePath("/admin/master-data/training");
    evidence.activities.forEach((activity) => {
      revalidatePath(`/admin/master-data/training/${activity.id}`);
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete training PDF:", error);
    return { success: false, error: "Gagal menghapus PDF." };
  }
}

/**
 * List all training PDFs with storage info (for admin/cleanup purposes)
 */
export async function listAllTrainingPDFs(): Promise<
  ActionResult<{
    totalFiles: number;
    totalSize: number;
    files: Array<{
      key: string;
      size: number;
      lastModified: Date;
      hasDbRecord: boolean;
    }>;
  }>
> {
  try {
    // ─── List all training PDF files from S3 ─────────────────────────────
    const listCommand = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: "training/evidence/",
    });

    const s3Response = await s3.send(listCommand);
    const s3Files = s3Response.Contents || [];

    // ─── Get all evidence records from database ──────────────────────────
    const dbEvidences = await prisma.trainingEvidence.findMany({
      where: { type: "pdf" },
      select: { uri: true },
    });
    const dbKeys = new Set(dbEvidences.map((e) => e.uri));

    // ─── Cross-reference S3 files with database records ─────────────────
    const files = s3Files.map((file) => ({
      key: file.Key!,
      size: file.Size || 0,
      lastModified: file.LastModified || new Date(),
      hasDbRecord: dbKeys.has(file.Key!),
    }));

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    return {
      success: true,
      data: {
        totalFiles: files.length,
        totalSize,
        files,
      },
    };
  } catch (error) {
    console.error("Failed to list training PDFs:", error);
    return { success: false, error: "Gagal memuat daftar file PDF." };
  }
}

/**
 * Cleanup orphaned files (S3 files without database records)
 */
export async function cleanupOrphanedPDFs(): Promise<
  ActionResult<{ deletedCount: number; freedSpace: number }>
> {
  try {
    const listResult = await listAllTrainingPDFs();
    if (!listResult.success) {
      return { success: false, error: listResult.error };
    }

    const orphanedFiles = listResult.data!.files.filter((file) => !file.hasDbRecord);
    
    if (orphanedFiles.length === 0) {
      return { success: true, data: { deletedCount: 0, freedSpace: 0 } };
    }

    // ─── Delete orphaned files from S3 ───────────────────────────────────
    let deletedCount = 0;
    let freedSpace = 0;

    for (const file of orphanedFiles) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: S3_BUCKET,
            Key: file.key,
          })
        );
        deletedCount++;
        freedSpace += file.size;
      } catch (deleteError) {
        console.warn(`Failed to delete orphaned file ${file.key}:`, deleteError);
      }
    }

    return { success: true, data: { deletedCount, freedSpace } };
  } catch (error) {
    console.error("Failed to cleanup orphaned PDFs:", error);
    return { success: false, error: "Gagal cleanup file orphaned." };
  }
}