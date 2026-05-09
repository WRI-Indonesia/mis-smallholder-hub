import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Singleton S3-compatible client for is3.cloudhost.id.
 * Credentials are read from environment variables — never hardcoded.
 */
export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT!,
  region: process.env.S3_REGION ?? "id-jkt-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  // Required for path-style URLs on non-AWS S3-compatible providers
  forcePathStyle: true,
});

export const S3_BUCKET = process.env.S3_BUCKET_NAME ?? "mis-dev";

/**
 * Generate a presigned GET URL for a private object.
 * Default expiry: 7 days (604800 seconds).
 */
export async function getPresignedUrl(
  key: string,
  expiresInSeconds = 60 * 60 * 24 * 7
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

/**
 * Check whether a stored URI is an S3 object key (not a full URL).
 * Keys start with "training/" — full URLs start with "http".
 */
export function isS3Key(uri: string): boolean {
  return !uri.startsWith("http");
}
