/**
 * Status validasi 3 tingkat untuk bulk upload petani (#197).
 *
 * "Tidak lengkap" = lolos validasi (layak simpan) tetapi ada field opsional
 * yang kosong. Dibedakan dari "valid" karena bulk upload hanya MENAMBAH,
 * tidak memperbarui: baris bolong yang telanjur disimpan hanya bisa
 * dilengkapi lewat edit satu per satu di Master Data — pengguna perlu tahu
 * sebelum memutuskan menyimpannya.
 */

export interface FarmerOptionalFieldValues {
  nik: string | null;
  birthPlace: string | null;
  birthDate: Date | null;
  address: string | null;
  joinedYear?: number | null;
}

export const OPTIONAL_FARMER_FIELDS: { key: keyof FarmerOptionalFieldValues; label: string }[] = [
  { key: "nik", label: "NIK" },
  { key: "birthPlace", label: "Tempat Lahir" },
  { key: "birthDate", label: "Tanggal Lahir" },
  { key: "address", label: "Alamat" },
  { key: "joinedYear", label: "Tahun Bergabung" },
];

/** Label field opsional yang kosong pada satu baris ternormalisasi. */
export function missingOptionalFields(row: FarmerOptionalFieldValues): string[] {
  return OPTIONAL_FARMER_FIELDS.filter(({ key }) => {
    const value = row[key];
    return value === null || value === undefined || value === "";
  }).map((f) => f.label);
}

export type FarmerRowStatus = "valid" | "incomplete" | "error";

export function farmerRowStatus(row: {
  _isValid: boolean;
  _missingFields: string[];
}): FarmerRowStatus {
  if (!row._isValid) return "error";
  return row._missingFields.length > 0 ? "incomplete" : "valid";
}
