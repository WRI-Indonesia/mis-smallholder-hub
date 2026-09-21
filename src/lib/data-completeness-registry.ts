// DA-02/DA-03 (#352) — registri deklaratif skoring Ketersediaan Data.
// Satu tempat untuk: label & rute perbaikan tiap anomali, bobot tier check
// persil, ambang konstanta, dan daftar modul cakupan. Tabel/kolom baru cukup
// menambah satu entri di sini — computeCompleteness, DA-02, DA-03, dan kartu
// KPI Detail Lembaga mengikuti tanpa disentuh. Bebas Prisma/Next.

import type {
  CompletenessDomainKey,
  CompletenessFarmerInput,
  CompletenessFix,
  CompletenessGrain,
  CompletenessGroupInput,
  CompletenessParcelInput,
} from "@/types/data-completeness";

// ── Konstanta (keputusan owner #352, P2 & P7) ──

/**
 * Bobot check persil per tier (P2): inti = 3, "atribut lapangan" = 1 → tier
 * lapangan bernilai 1/3 check inti. Ditulis sebagai bilangan bulat supaya
 * rasio 1/3 tidak meninggalkan sisa floating point di skor.
 * Tahun tanam & status lahan kosong di 94 %/98 % persil prod dan tak punya
 * alur pengisian rutin (hanya DBF shapefile/form) — dengan bobot penuh, skor
 * Lahan 28/30 Lembaga terkunci di 60. Blok (89,5 % kosong) diperlakukan sama.
 */
export const CORE_WEIGHT = 3;
export const FIELD_TIER_WEIGHT = 1;

/** Bila satu check kosong pada ≥ 95 % entitas Lembaga → dilipat jadi satu temuan agregat (A3). */
export const SYSTEMIC_THRESHOLD = 0.95;
/** Lembaga kecil (< 10 entitas) tidak dilipat — daftar per baris masih terbaca. */
export const SYSTEMIC_MIN_ENTITIES = 10;

/** Kebaruan produksi: tanpa record dalam N bulan terakhir → "produksi basi" (P7). */
export const PRODUCTION_STALE_MONTHS = 3;

// ── Rute perbaikan (menu tujuan + kolom) ──

const FIX = {
  groupForm: (field: string): CompletenessFix => ({
    menu: "Master Data › Lembaga Petani (Edit)",
    field,
    href: "/admin/master-data/groups",
  }),
  farmerForm: (field: string): CompletenessFix => ({
    menu: "Master Data › Petani (Edit) · Bulk Upload › Upload Petani",
    field,
    href: "/admin/master-data/farmers",
  }),
  parcelShapefile: (field: string): CompletenessFix => ({
    menu: "Bulk Upload › Lahan (shapefile) · Master Data › Lahan (Edit)",
    field,
    href: "/admin/bulk-upload/parcels",
  }),
  parcelDetail: (field: string): CompletenessFix => ({
    menu: "Bulk Upload › Lahan › Detail Lahan (Excel) · Master Data › Lahan (Edit)",
    field,
    href: "/admin/bulk-upload/parcels",
  }),
  parcelMarker: (): CompletenessFix => ({
    menu: "Bulk Upload › Lahan › Patok · Master Data › Lahan › Patok",
    href: "/admin/bulk-upload/parcels",
  }),
  trees: (): CompletenessFix => ({
    menu: "Bulk Upload › Pohon Sawit",
    href: "/admin/bulk-upload/trees",
  }),
  parcelProgram: (): CompletenessFix => ({
    menu: "Master Data › Lahan › Program",
    href: "/admin/master-data/parcels",
  }),
  training: (field?: string): CompletenessFix => ({
    menu: "Master Data › Pelatihan (aktivitas + peserta)",
    field,
    href: "/admin/master-data/training",
  }),
  production: (field?: string): CompletenessFix => ({
    menu: "Bulk Upload › Upload Produksi · Master Data › Produksi",
    field,
    href: "/admin/bulk-upload/production",
  }),
  bmp: (): CompletenessFix => ({
    menu: "Master Data › Monev BMP (import rekap / form survei)",
    href: "/admin/master-data/bmp-monev",
  }),
  benchmark: (): CompletenessFix => ({
    menu: "Data Analyst › Komparasi Data Acuan (entry acuan)",
    href: "/admin/data-analyst/benchmark-comparison",
  }),
  boundary: (): CompletenessFix => ({
    menu: "Skrip seed boundary Lembaga (admin sistem, #266)",
  }),
} as const;

// ── Katalog anomali (check inti) ──

export type AnomalyDef = {
  label: string;
  domain: CompletenessDomainKey;
  grain: CompletenessGrain;
  fix: CompletenessFix;
  /**
   * Boleh dilipat jadi temuan sistemik "kolom belum pernah diisi" (A3) —
   * hanya check "kolom kosong". Check validitas/kebaruan (NIK tidak sahih,
   * duplikat, produksi basi, belum ikut paket) TIDAK dilipat: sinyalnya justru
   * makin penting saat menyentuh seluruh Lembaga (review #352).
   */
  foldable: boolean;
};

const blank = (
  label: string,
  domain: CompletenessDomainKey,
  grain: CompletenessGrain,
  fix: CompletenessFix,
): AnomalyDef => ({ label, domain, grain, fix, foldable: true });
const strict = (
  label: string,
  domain: CompletenessDomainKey,
  grain: CompletenessGrain,
  fix: CompletenessFix,
): AnomalyDef => ({ label, domain, grain, fix, foldable: false });

/**
 * Metadata tiap kunci anomali. Predikatnya tetap eksplisit di
 * `data-completeness.ts` (NIK sahih+unik, kebaruan produksi, dsb. bukan sekadar
 * "kolom kosong") — registri memegang label, grain, rute perbaikan, dan
 * kelayakan dilipat.
 */
export const ANOMALY_CATALOG: Record<string, AnomalyDef> = {
  // Profil Lembaga (disintesis DA-03 dari check profil yang gagal)
  "profil-tidak-lengkap": strict("Profil Lembaga belum lengkap", "profil", "lembaga", FIX.groupForm("kolom profil yang kosong")),
  // Petani
  "no-nik": blank("Petani tanpa NIK", "petani", "petani", FIX.farmerForm("NIK")),
  "invalid-nik": strict("NIK tidak valid (bukan 16 digit)", "petani", "petani", FIX.farmerForm("NIK")),
  "dup-nik": strict("NIK duplikat dalam Lembaga Petani", "petani", "petani", FIX.farmerForm("NIK")),
  "dup-farmer-id": strict("ID Petani duplikat dalam Lembaga Petani", "petani", "petani", FIX.farmerForm("ID Petani")),
  "no-address": blank("Petani tanpa alamat", "petani", "petani", FIX.farmerForm("Alamat")),
  "no-birth-date": blank("Petani tanpa tanggal lahir", "petani", "petani", FIX.farmerForm("Tanggal Lahir")),
  "no-birth-place": blank("Petani tanpa tempat lahir", "petani", "petani", FIX.farmerForm("Tempat Lahir")),
  "no-joined-year": blank("Petani tanpa tahun bergabung", "petani", "petani", FIX.farmerForm("Tahun Bergabung")),
  // Lahan
  "petani-tanpa-lahan": blank("Petani tanpa lahan aktif", "lahan", "petani", FIX.parcelShapefile("poligon lahan")),
  "persil-tanpa-geometry": blank("Persil tanpa geometry", "lahan", "persil", FIX.parcelShapefile("geometry")),
  "persil-tanpa-luas": blank("Persil tanpa luas", "lahan", "persil", FIX.parcelShapefile("area")),
  "persil-tanpa-jenis-tanaman": blank("Persil tanpa jenis tanaman", "lahan", "persil", FIX.parcelShapefile("crop_type")),
  "persil-tanpa-kelompok-tani": blank("Persil tanpa Kelompok Tani", "lahan", "persil", FIX.parcelDetail("Nama Kelompok Tani")),
  "persil-tanpa-tahun-tanam": blank("Persil tanpa tahun tanam", "lahan", "persil", FIX.parcelShapefile("planting_year")),
  "persil-tanpa-status": blank("Persil tanpa status lahan", "lahan", "persil", FIX.parcelShapefile("land_status")),
  "persil-tanpa-blok": blank("Persil tanpa blok", "lahan", "persil", FIX.parcelDetail("Blok")),
  // Pelatihan
  "kt-tanpa-aktivitas": strict("Lembaga Petani belum memiliki aktivitas pelatihan", "pelatihan", "lembaga", FIX.training()),
  "peserta-tanpa-pretest": strict("Peserta tanpa nilai pre-test", "pelatihan", "petani", FIX.training("Nilai Pre-test")),
  "peserta-tanpa-posttest": strict("Peserta tanpa nilai post-test", "pelatihan", "petani", FIX.training("Nilai Post-test")),
  // Produksi
  "petani-tanpa-produksi": blank("Petani tanpa data produksi", "produksi", "petani", FIX.production()),
  "berlahan-tanpa-produksi": blank("Petani punya lahan (non-PSR) tapi tanpa produksi", "produksi", "petani", FIX.production()),
  // Kolom ID Lahan pada baris produksi kosong → "kolom kosong", boleh dilipat.
  "produksi-tanpa-persil": blank("Produksi tidak terhubung ke persil", "produksi", "petani", FIX.production("ID Lahan pada baris produksi")),
  "produksi-basi": strict(
    `Produksi tidak diperbarui ≥ ${PRODUCTION_STALE_MONTHS} bulan terakhir`,
    "produksi",
    "petani",
    FIX.production("periode bulan berjalan"),
  ),
  "lahan-tanpa-produksi": blank("Lahan aktif (non-PSR) tanpa produksi", "produksi", "persil", FIX.production("ID Lahan pada baris produksi")),
};

/** Prefix kunci anomali dinamis "belum ikut paket X" (satu per paket wajib). */
export const PACKAGE_ANOMALY_PREFIX = "belum-paket-";

/** Metadata anomali per kunci — kunci dinamis paket dipetakan ke satu entri. */
export function anomalyDef(key: string): AnomalyDef {
  if (key.startsWith(PACKAGE_ANOMALY_PREFIX)) {
    return strict(key, "pelatihan", "petani", FIX.training("peserta aktivitas paket ini"));
  }
  const def = ANOMALY_CATALOG[key];
  if (!def) throw new Error(`Anomali "${key}" belum terdaftar di ANOMALY_CATALOG`);
  return def;
}

// ── Check profil Lembaga (Domain 1) ──

export type ProfileCheckDef = {
  key: string;
  label: string;
  fix: CompletenessFix;
  complete: (g: CompletenessGroupInput) => boolean;
  value: (g: CompletenessGroupInput) => string | null;
};

const isBlank = (v: string | null | undefined) => !v || v.trim().length === 0;

export const PROFILE_CHECKS: ProfileCheckDef[] = [
  { key: "code", label: "Kode Lembaga Petani", fix: FIX.groupForm("Kode"), complete: (g) => !isBlank(g.code), value: (g) => g.code },
  {
    key: "coordinates",
    label: "Koordinat Lokasi",
    fix: FIX.groupForm("Latitude/Longitude"),
    complete: (g) => g.locationLat != null && g.locationLong != null,
    value: (g) => (g.locationLat != null && g.locationLong != null ? `${g.locationLat}, ${g.locationLong}` : null),
  },
  { key: "join-year", label: "Tahun Bergabung", fix: FIX.groupForm("Tahun Bergabung Program"), complete: (g) => g.joinYear != null, value: (g) => (g.joinYear != null ? String(g.joinYear) : null) },
  { key: "abrv", label: "Singkatan (Abrv)", fix: FIX.groupForm("Singkatan"), complete: (g) => !isBlank(g.abrv), value: (g) => g.abrv },
  { key: "group-type", label: "Tipe Grup", fix: FIX.groupForm("Tipe Grup"), complete: (g) => !isBlank(g.groupType), value: (g) => g.groupType },
  {
    key: "established-year",
    label: "Tahun Berdiri",
    fix: FIX.groupForm("Tahun Berdiri Lembaga"),
    complete: (g) => g.establishedYear != null,
    value: (g) => (g.establishedYear != null ? String(g.establishedYear) : null),
  },
];

// ── Check persil (Domain Lahan) — berbobot per tier (P2) ──

export type ParcelCheckDef = {
  anomalyKey: string;
  weight: number;
  complete: (p: CompletenessParcelInput) => boolean;
};

export const PARCEL_CHECKS: ParcelCheckDef[] = [
  { anomalyKey: "persil-tanpa-geometry", weight: CORE_WEIGHT, complete: (p) => p.geometry != null },
  { anomalyKey: "persil-tanpa-luas", weight: CORE_WEIGHT, complete: (p) => p.area != null && p.area > 0 },
  { anomalyKey: "persil-tanpa-jenis-tanaman", weight: CORE_WEIGHT, complete: (p) => !isBlank(p.cropType) },
  { anomalyKey: "persil-tanpa-kelompok-tani", weight: CORE_WEIGHT, complete: (p) => !isBlank(p.subGroupLv2) },
  // Tier "atribut lapangan" — bobot 1/3 check inti (keputusan owner #352 P2).
  { anomalyKey: "persil-tanpa-tahun-tanam", weight: FIELD_TIER_WEIGHT, complete: (p) => p.plantingYear != null },
  { anomalyKey: "persil-tanpa-status", weight: FIELD_TIER_WEIGHT, complete: (p) => !isBlank(p.landStatus) },
  { anomalyKey: "persil-tanpa-blok", weight: FIELD_TIER_WEIGHT, complete: (p) => !isBlank(p.blok) },
];

export const PARCEL_CHECK_WEIGHT_TOTAL = PARCEL_CHECKS.reduce((s, c) => s + c.weight, 0);

// ── Check petani (Domain Petani) — field kosong; NIK & ID unik dihitung di lib ──

export type FarmerFieldCheckDef = {
  anomalyKey: string;
  complete: (f: CompletenessFarmerInput) => boolean;
};

/** Check field per petani. NIK (sahih & unik) dan ID Petani unik butuh konteks lintas petani → di lib. */
export const FARMER_FIELD_CHECKS: FarmerFieldCheckDef[] = [
  { anomalyKey: "no-address", complete: (f) => !isBlank(f.address) },
  { anomalyKey: "no-birth-date", complete: (f) => f.birthDate != null },
  { anomalyKey: "no-birth-place", complete: (f) => !isBlank(f.birthPlace) },
  { anomalyKey: "no-joined-year", complete: (f) => f.joinedYear != null },
];

/** Total check per petani = 2 (NIK, ID unik) + field di atas. */
export const FARMER_CHECK_COUNT = 2 + FARMER_FIELD_CHECKS.length;

// ── Cakupan modul (A1) — informatif, di luar Index ──

export type ModuleDef = {
  key: string;
  label: string;
  /** Label pendek untuk judul kolom matriks DA-03. */
  short: string;
  domain: CompletenessDomainKey;
  fix: CompletenessFix;
} & (
  | { grain: "lembaga"; covered: (g: CompletenessGroupInput) => boolean }
  | { grain: "petani"; covered: (f: CompletenessFarmerInput) => boolean }
  | { grain: "persil"; covered: (p: CompletenessParcelInput) => boolean }
  | { grain: "aktivitas"; covered: (a: CompletenessGroupInput["activities"][number]) => boolean }
);

/**
 * Sertifikasi: enum hanya CERTIFIED | PLANNED — null berarti "belum diisi"
 * ATAU "tidak bersertifikat" (keputusan owner #352 P3: informatif saja,
 * bukan anomali; nilai NONE ditunda ke issue terpisah).
 */
const certStatusFilled = (g: CompletenessGroupInput): number =>
  [g.modules?.rspoCertStatus, g.modules?.ispoCertStatus, g.modules?.sapMapAssuranceStatus].filter(
    (s) => !isBlank(s ?? null),
  ).length;

export const MODULE_CATALOG: ModuleDef[] = [
  // Profil Lembaga
  { key: "boundary-ics", label: "Boundary ICS", short: "Boundary", domain: "profil", grain: "lembaga", fix: FIX.boundary(), covered: (g) => !!g.modules?.boundary },
  { key: "acuan-md", label: "Acuan MD 1st SOW", short: "Acuan MD", domain: "profil", grain: "lembaga", fix: FIX.benchmark(), covered: (g) => !!g.modules?.benchmark },
  { key: "monev-lembaga", label: "Penilaian Lembaga Monev BMP", short: "Monev Lembaga", domain: "profil", grain: "lembaga", fix: FIX.bmp(), covered: (g) => !!g.modules?.bmpGroupAssessment },
  {
    key: "sertifikasi",
    label: "Status sertifikasi terisi (RSPO/ISPO/SAP-MAP)",
    short: "Sertifikasi",
    domain: "profil",
    grain: "lembaga",
    fix: FIX.groupForm("Status RSPO / ISPO / SAP-MAP"),
    covered: (g) => certStatusFilled(g) === 3,
  },
  // Petani
  { key: "stdb-petani", label: "STDB (≥1 berkas aktif)", short: "STDB", domain: "petani", grain: "petani", fix: FIX.parcelDetail("STDB"), covered: (f) => !!f.modules?.stdb },
  { key: "monev-petani", label: "Monev BMP tahun berjalan", short: "Monev BMP", domain: "petani", grain: "petani", fix: FIX.bmp(), covered: (f) => !!f.modules?.bmpAssessment },
  // Lahan
  { key: "surat-tanah", label: "Surat tanah", short: "Surat", domain: "lahan", grain: "persil", fix: FIX.parcelDetail("Surat tanah"), covered: (p) => !!p.modules?.document },
  { key: "stdb-terbit", label: "STDB terbit", short: "STDB terbit", domain: "lahan", grain: "persil", fix: FIX.parcelDetail("STDB (tahap TERBIT)"), covered: (p) => !!p.modules?.stdbIssued },
  { key: "kode-eksternal", label: "Kode eksternal vendor (UL Parcel Code)", short: "Kode vendor", domain: "lahan", grain: "persil", fix: FIX.parcelDetail("UL Parcel Code"), covered: (p) => !!p.modules?.externalId },
  { key: "nkt", label: "Status NKT dinilai", short: "NKT", domain: "lahan", grain: "persil", fix: FIX.parcelDetail("Status NKT"), covered: (p) => !!p.modules?.nkt },
  { key: "sepadan", label: "Sepadan U/T/S/B lengkap", short: "Sepadan", domain: "lahan", grain: "persil", fix: FIX.parcelDetail("Sepadan Utara/Timur/Selatan/Barat"), covered: (p) => !!p.modules?.border },
  { key: "patok", label: "Patok batas", short: "Patok", domain: "lahan", grain: "persil", fix: FIX.parcelMarker(), covered: (p) => !!p.modules?.marker },
  { key: "pohon", label: "Titik pohon", short: "Pohon", domain: "lahan", grain: "persil", fix: FIX.trees(), covered: (p) => !!p.modules?.tree },
  { key: "program", label: "Program / demplot", short: "Program", domain: "lahan", grain: "persil", fix: FIX.parcelProgram(), covered: (p) => !!p.modules?.program },
  // Pelatihan
  { key: "bukti-aktivitas", label: "Aktivitas ber-bukti (dokumentasi)", short: "Bukti", domain: "pelatihan", grain: "aktivitas", fix: FIX.training("Bukti kegiatan"), covered: (a) => a.hasEvidence },
];

export const MODULE_DOMAIN_LABELS: Record<CompletenessDomainKey, string> = {
  profil: "Profil Lembaga",
  petani: "Petani",
  lahan: "Lahan",
  pelatihan: "Pelatihan",
  produksi: "Produksi",
};
