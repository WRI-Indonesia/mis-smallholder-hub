/**
 * Angka opsional dari `FormData` (TD-008, #412): string kosong / hanya spasi →
 * `null`, bukan `NaN`. Teks yang benar-benar bukan angka tetap menghasilkan
 * `NaN` supaya validasi Zod di server menolaknya dengan pesan, bukan tersimpan
 * diam-diam sebagai kosong.
 */
export function formOptionalInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t === "" ? null : parseInt(t, 10);
}

export function formOptionalFloat(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t === "" ? null : parseFloat(t);
}
