import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

/**
 * Generate presigned URL using the get-link.js script
 * This provides an alternative method to generate links via CLI script
 */
export async function generateLinkViaScript(
  s3Key: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const scriptPath = path.join(process.cwd(), "scripts", "get-link.js");
    const command = `node "${scriptPath}" "${s3Key}"`;
    
    const { stdout, stderr } = await execAsync(command, {
      env: {
        ...process.env,
        S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
        S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
        S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || "mis-dev",
      },
    });

    if (stderr) {
      console.error("Script stderr:", stderr);
      return { success: false, error: stderr };
    }

    // Extract URL from script output
    const lines = stdout.split("\n");
    const urlLine = lines.find((line) => line.startsWith("https://"));
    
    if (!urlLine) {
      return { success: false, error: "No URL found in script output" };
    }

    return { success: true, url: urlLine.trim() };
  } catch (error) {
    console.error("Failed to generate link via script:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Validate PDF file before upload
 */
export function validatePDFFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  if (file.type !== "application/pdf") {
    return { valid: false, error: "Hanya file PDF yang diizinkan." };
  }

  // Check file size (max 15 MB)
  const MAX_SIZE = 15 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { valid: false, error: "Ukuran file maksimal 15 MB." };
  }

  // Check file name
  if (file.name.length > 255) {
    return { valid: false, error: "Nama file terlalu panjang (max 255 karakter)." };
  }

  // Check for potentially dangerous characters
  const dangerousChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (dangerousChars.test(file.name)) {
    return { valid: false, error: "Nama file mengandung karakter yang tidak diizinkan." };
  }

  return { valid: true };
}

/**
 * Generate safe filename for S3 storage
 */
export function generateSafeFilename(originalName: string): string {
  return originalName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
    .substring(0, 200); // Limit length
}

/**
 * Parse S3 key to extract metadata
 */
export function parseS3Key(key: string): {
  type: "training" | "staff-activity" | "other";
  year?: string;
  month?: string;
  activityId?: string;
  filename?: string;
} {
  const parts = key.split("/");
  
  if (parts[0] === "training" && parts[1] === "evidence") {
    return {
      type: "training",
      year: parts[2],
      month: parts[3],
      activityId: parts[4],
      filename: parts[5]?.split("-").slice(1).join("-"), // Remove timestamp prefix
    };
  }
  
  if (parts[0] === "staff-activity") {
    return {
      type: "staff-activity",
      activityId: parts[1],
      filename: parts[2]?.split("-").slice(1).join("-"), // Remove timestamp prefix
    };
  }
  
  return { type: "other" };
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Check if URL is expired (for presigned URLs)
 */
export function isURLExpired(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const expires = urlObj.searchParams.get("X-Amz-Expires");
    const date = urlObj.searchParams.get("X-Amz-Date");
    
    if (!expires || !date) return false;
    
    const expiresSeconds = parseInt(expires);
    const startTime = new Date(
      date.substring(0, 4) + "-" +
      date.substring(4, 6) + "-" +
      date.substring(6, 8) + "T" +
      date.substring(9, 11) + ":" +
      date.substring(11, 13) + ":" +
      date.substring(13, 15) + "Z"
    );
    
    const expiryTime = new Date(startTime.getTime() + expiresSeconds * 1000);
    return new Date() > expiryTime;
  } catch {
    return false;
  }
}

/**
 * Generate training evidence filename with metadata
 */
export function generateEvidenceFilename(
  originalName: string,
  activityId: string,
  trainingDate: Date
): string {
  const date = trainingDate.toISOString().split("T")[0]; // YYYY-MM-DD
  const safeName = generateSafeFilename(originalName);
  const nameWithoutExt = safeName.replace(/\.pdf$/, "");
  
  return `${date}_${activityId}_${nameWithoutExt}.pdf`;
}