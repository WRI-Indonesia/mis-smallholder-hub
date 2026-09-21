import { z } from "zod";
import { LAND_MARKER_CONDITIONS, LAND_MARKER_TYPES, MARKER_CODE_RE } from "@/lib/land-marker";
import { optText, optDate } from "@/validations/land-parcel-satellite.schema";

/**
 * Patok batas lahan (#329). Koordinat: lintang −90..90, bujur −180..180 — guard
 * "≤ 100 m dari batas lahan" (lat/long tertukar, desimal salah tempel) butuh
 * geometri lahan, jadi ditegakkan di action lewat `distancesToParcelBoundary`,
 * bukan di sini.
 */
const coord = (min: number, max: number, label: string) =>
  z.preprocess((v) => {
    if (v === "" || v === undefined || v === null) return NaN;
    const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", "."));
    return Number.isNaN(n) ? NaN : n;
  }, z.number({ message: `${label} harus angka` }).min(min, `${label} di luar rentang`).max(max, `${label} di luar rentang`));

const markerFields = {
  longitude: coord(-180, 180, "Bujur"),
  latitude: coord(-90, 90, "Lintang"),
  condition: z.enum(LAND_MARKER_CONDITIONS, { message: "Kondisi tidak dikenal" }).default("NOT_INSTALLED"),
  type: z.preprocess((v) => (v === "" ? null : v), z.enum(LAND_MARKER_TYPES, { message: "Jenis tidak dikenal" }).nullable().optional()),
  installedAt: optDate,
  installedBy: optText(200),
  notes: optText(500),
};

function refineMarker(d: { installedAt?: Date | null }, ctx: z.RefinementCtx) {
  if (d.installedAt && d.installedAt.getTime() > Date.now() + 24 * 3600 * 1000) {
    ctx.addIssue({ code: "custom", path: ["installedAt"], message: "Tanggal pemasangan tidak boleh di masa depan" });
  }
}

/** Tambah patok manual ke satu lahan (nomor urut = berikutnya). */
export const createLandMarkerSchema = z
  .object({ landParcelId: z.string().min(1, "Lahan tidak valid"), ...markerFields })
  .superRefine(refineMarker);

/** Ubah patok (berlaku untuk SEMUA lahan yang memakainya — satu patok fisik). */
export const updateLandMarkerSchema = z
  .object({ landParcelId: z.string().min(1, "Lahan tidak valid"), markerId: z.string().min(1), ...markerFields })
  .superRefine(refineMarker);

/** Simpan hasil pratinjau "Buat patok dari poligon": nomor urut yang dicentang. */
export const createMarkersFromPolygonSchema = z.object({
  landParcelId: z.string().min(1, "Lahan tidak valid"),
  keepSequenceNos: z.array(z.number().int().positive()).min(1, "Pilih minimal satu vertex"),
});

/** Urutkan ulang: daftar markerId aktif lahan itu dalam urutan baru (harus lengkap). */
export const renumberLandMarkersSchema = z.object({
  landParcelId: z.string().min(1, "Lahan tidak valid"),
  order: z.array(z.string().min(1)).min(1),
});

/**
 * Baris unggahan titik GPS (Excel/CSV atau shapefile point) — sudah divalidasi
 * klien, dikirim per lahan. `sequenceNo` null = patok baru tanpa nomor (nomor
 * berikutnya); terisi = perbarui patok bernomor itu bila ada.
 */
export const landMarkerUploadRowSchema = z.object({
  landParcelId: z.string().min(1),
  /** Kode patok fisik (HJP-PTK-000123) — bila terisi, patok itulah yang diperbarui/ditautkan. */
  code: z.string().regex(MARKER_CODE_RE, "Kode patok tidak valid").nullable(),
  sequenceNo: z.number().int().positive().nullable(),
  longitude: z.number().min(-180).max(180),
  latitude: z.number().min(-90).max(90),
  condition: z.enum(LAND_MARKER_CONDITIONS).nullable(),
  type: z.enum(LAND_MARKER_TYPES).nullable(),
  installedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  installedBy: z.string().trim().max(200).nullable(),
  notes: z.string().trim().max(500).nullable(),
});
export const landMarkerUploadBatchSchema = z.array(landMarkerUploadRowSchema).min(1).max(20000);

export type LandMarkerUploadRow = z.infer<typeof landMarkerUploadRowSchema>;
