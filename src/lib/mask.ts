// Sensor data pribadi petani pada TAMPILAN layar (keputusan owner 2026-07-16).
// Excel export & PDF Farm Passport sengaja tetap nilai penuh: hasil export bisa
// diedit lalu di-upload ulang (bulk) — nilai ter-sensor akan merusak data.

/** NIK: tampil 4 digit depan + 2 belakang, sisanya bintang. Null → "—". */
export function maskNik(nik: string | null | undefined): string {
  if (!nik) return "—";
  if (nik.length <= 6) return nik;
  return `${nik.slice(0, 4)}${"*".repeat(nik.length - 6)}${nik.slice(-2)}`;
}

/** String NIK-like (10–16 digit) di-mask; selain itu apa adanya (mis. kode lahan). */
export function maskIfNik(value: string | null | undefined): string {
  if (!value) return "—";
  return /^\d{10,16}$/.test(value) ? maskNik(value) : value;
}

/** Tanggal lahir: tanggal & bulan disensor, tahun tampil — "** *** 1980". Null → "—". */
export function maskBirthDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const year = new Date(d).getFullYear();
  if (Number.isNaN(year)) return "—";
  return `** *** ${year}`;
}
