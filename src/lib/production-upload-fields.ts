/**
 * Field target + alias auto-match Upload Produksi (dipindah dari komponen
 * client, #419) agar template Excel dan parser berbagi satu sumber dan teruji.
 * Pencocokan: header di-lowercase + trim lalu dicocokkan PERSIS ke alias.
 *
 * Alias bertanda "template lama" = tajuk template sebelum #419 — dulu TIDAK
 * dikenali sehingga 6 dari 7 kolom (4 wajib) harus dipetakan manual; berkas
 * lama yang beredar di lapangan kini ikut terpetakan otomatis.
 */
export const PRODUCTION_UPLOAD_FIELDS = [
  { key: "farmerId", label: "ID Petani", required: true, desc: "ID Petani terdaftar (contoh: CTH.14.01.10.2012.0001)" },
  { key: "period", label: "Periode", required: true, desc: "Format YYYY-MM (contoh: 2026-06)" },
  { key: "harvestDate", label: "Tanggal Panen", required: true, desc: "Format tanggal (harus sesuai bulan periode)" },
  { key: "harvestNumber", label: "Panen Ke-", required: true, desc: "Angka bulat 1 s/d 4" },
  { key: "yieldKg", label: "Hasil Panen (kg)", required: true, desc: "Angka desimal/bulat lebih dari 0" },
  { key: "parcelId", label: "ID Lahan", required: false, desc: "ID Lahan terdaftar (opsional, contoh: CTH.0001.A.14.01.10.2012)" },
  { key: "notes", label: "Catatan", required: false, desc: "Catatan tambahan (maks 500 karakter)" },
] as const;

export const PRODUCTION_AUTO_MATCH_RULES: Record<string, string[]> = {
  farmerId: ["farmer_id", "farmerid", "petani_id", "id petani", "id_petani", "farmer_code", "kode_petani", "wri_id", "farmer", "kode petani"],
  period: ["period", "periode", "bulan", "month", "period_id", "periode (yyyy-mm)" /* template lama */],
  harvestDate: [
    "harvest_date", "harvestdate", "tanggal_panen", "tgl_panen", "tanggal panen", "tgl panen", "tanggal", "date",
    "tanggal panen (dd/mm/yyyy)" /* template lama */,
  ],
  harvestNumber: [
    "harvest_number", "harvestnumber", "panen_ke", "panen ke", "no_panen", "panen ke-", "panen ke_",
    "panen ke- (1-4)" /* template lama */,
  ],
  yieldKg: ["yield_kg", "yieldkg", "yield", "hasil", "hasil_panen", "hasil panen", "kg", "berat", "hasil panen (kg)"],
  parcelId: ["parcel_id", "parcelid", "lahan_id", "id lahan", "id_lahan", "kode_lahan", "kode lahan", "parcel", "id lahan (opsional)" /* template lama */],
  notes: ["notes", "note", "keterangan", "ket", "catatan", "notes_info", "catatan (opsional)" /* template lama */],
};
