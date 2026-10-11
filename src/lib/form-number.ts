/**
 * Angka opsional dari `FormData` (TD-008, #412): string kosong / hanya spasi →
 * `null`, bukan `NaN`. Teks yang bukan angka utuh ("20x24", "2024,5", "abc")
 * → `NaN` supaya validasi Zod di server menolaknya dengan pesan, bukan tersimpan
 * diam-diam — `Number()` dipakai, bukan `parseInt`, karena `parseInt("20x24")`
 * = 20 (review #412).
 */
export function formOptionalFloat(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t === "" ? null : Number(t);
}

export function formOptionalInt(value: FormDataEntryValue | null): number | null {
  const n = formOptionalFloat(value);
  return n == null ? null : Number.isInteger(n) ? n : Number.NaN;
}
