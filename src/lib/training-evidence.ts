/**
 * Kunci objek S3 bukti pelatihan (#385) — satu sumber untuk pembentuk
 * (`uploadTrainingEvidence`) dan pemeriksa (`updateTrainingActivity`), agar
 * kunci yang boleh disimpan tepat sama dengan yang pernah dibuat server:
 * `training/<activityId>/<timestamp>-<nama-tersanitasi>`.
 *
 * Tanpa pemeriksa, klien bisa menyimpan kunci objek lain di bucket (foto patok,
 * berkas Lembaga lain) lalu mendapat presigned URL-nya dari halaman detail.
 */

/** Id aktivitas yang aman menjadi SATU segmen path (tanpa `/`, `.`, `..`). */
export const SAFE_ID_SEGMENT = /^[A-Za-z0-9_-]{1,64}$/;

const SAFE_NAME = /^[a-z0-9._-]+$/;

export function sanitizeEvidenceFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/\.{2,}/g, ".") // ".." tak pernah muncul di kunci (lihat pemeriksa)
    .toLowerCase();
}

export function buildTrainingEvidenceKey(activityId: string, fileName: string, timestamp: number): string {
  if (!SAFE_ID_SEGMENT.test(activityId)) throw new Error("activityId tidak valid untuk kunci berkas");
  return `training/${activityId}/${timestamp}-${sanitizeEvidenceFileName(fileName)}`;
}

/**
 * Kunci ini milik aktivitas `activityId`: format sekarang (`buildTrainingEvidenceKey`)
 * atau format lama #45 `training/evidence/<yyyy>/<mm>/<activityId>/<berkas>`
 * (skrip `pdf-manager.js`). Audit mis-prod 2026-09-29: 0 kunci berkas asli.
 */
export function isTrainingEvidenceKeyFor(key: string, activityId: string): boolean {
  if (!SAFE_ID_SEGMENT.test(activityId)) return false;
  const legacy = key.match(/^training\/evidence\/\d{4}\/\d{2}\/([^/]+)\/([^/]+)$/);
  if (legacy) return legacy[1] === activityId && !legacy[2].includes("..");
  const prefix = `training/${activityId}/`;
  if (!key.startsWith(prefix)) return false;
  const rest = key.slice(prefix.length);
  const dash = rest.indexOf("-");
  if (dash <= 0) return false;
  const ts = rest.slice(0, dash);
  const name = rest.slice(dash + 1);
  return /^\d+$/.test(ts) && name.length > 0 && SAFE_NAME.test(name) && !name.includes("..");
}
