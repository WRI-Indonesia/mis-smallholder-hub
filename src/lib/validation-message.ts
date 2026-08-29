/**
 * Ubah `fieldErrors` Zod menjadi satu kalimat Bahasa Indonesia (#301).
 *
 * Empat action bulk upload sebelumnya mengembalikan
 * `` `Validasi gagal: ${JSON.stringify(fieldErrors)}` `` — JSON mentah berisi
 * nama field berbahasa Inggris tampil apa adanya di toast pengguna, melanggar
 * aturan pesan Bahasa Indonesia. Pesan Zod-nya sendiri sudah Indonesia
 * (`src/validations/*.schema.ts`), jadi yang dibutuhkan hanya mengambil pesan
 * itu dan membuang bungkus JSON-nya; nama field sengaja TIDAK ikut ditampilkan
 * karena itulah identifier Inggris yang jadi keluhan.
 */

const MAX_MESSAGES = 3;

/** Pesan-pesan pertama dari `error.flatten().fieldErrors`, tanpa duplikat. */
export function collectFieldErrorMessages(
  fieldErrors: Record<string, string[] | undefined>,
): string[] {
  const seen = new Set<string>();
  for (const messages of Object.values(fieldErrors)) {
    for (const message of messages ?? []) {
      const trimmed = message?.trim();
      if (trimmed) seen.add(trimmed);
    }
  }
  return [...seen];
}

/**
 * Kalimat siap-toast. `prefix` menerangkan cakupannya — mis. "Ada baris yang
 * tidak lolos validasi" untuk pemeriksaan per baris, "Data tidak lolos
 * validasi" untuk satu payload.
 */
export function formatFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
  prefix: string,
): string {
  const messages = collectFieldErrorMessages(fieldErrors);
  if (messages.length === 0) return `${prefix}. Periksa kembali isi berkas Anda.`;
  const shown = messages.slice(0, MAX_MESSAGES).join("; ");
  const rest = messages.length - MAX_MESSAGES;
  return rest > 0 ? `${prefix}: ${shown} (dan ${rest} kesalahan lain)` : `${prefix}: ${shown}`;
}
