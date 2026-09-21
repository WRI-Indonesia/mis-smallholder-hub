// DA-02 — Pure computation logic for farmer-group data completeness & anomaly analysis.
// Kept free of Prisma/Next imports so it is directly unit-testable.
//
// #352: label, grain, jenis, dan rute perbaikan tiap anomali + bobot tier check
// persil + daftar modul cakupan dibaca dari registri `data-completeness-registry.ts`.
// Predikat check tetap eksplisit di sini. Putaran 2 (#352): checklist lengkap
// per domain (semua check tampil, termasuk yang lolos), check kualitas
// (konsistensi/plausibilitas — informatif), prioritas perbaikan berdampak ke
// Index, dan rincian per Kelompok Tani.

import type {
  AnomalyItem,
  CheckRow,
  CompletenessFarmerInput,
  CompletenessGroupInput,
  CompletenessParcelInput,
  DomainAnomaly,
  DomainResult,
  DataCompletenessResult,
  KelompokTaniRow,
  ModuleCoverage,
  PriorityItem,
  ProfileCheck,
} from "@/types/data-completeness";
import { isNktAffected } from "@/lib/land-parcel-satellite-format";
import {
  anomalyDef,
  BIRTH_DATE_DAY_ANCHOR_HOURS,
  FARMER_AGE_MAX,
  FARMER_AGE_MIN,
  FARMER_CHECK_COUNT,
  FARMER_FIELD_CHECKS,
  MODULE_CATALOG,
  PACKAGE_ANOMALY_PREFIX,
  PARCEL_AREA_MAX_HA,
  PARCEL_AREA_MIN_HA,
  PARCEL_AREA_MISMATCH_RATIO,
  PARCEL_CHECKS,
  PARCEL_CHECK_WEIGHT_TOTAL,
  PLANTING_YEAR_MIN,
  PRODUCTION_STALE_MONTHS,
  PROFILE_CHECKS,
  PROFILE_QUALITY_CHECKS,
  SYSTEMIC_MIN_ENTITIES,
  SYSTEMIC_THRESHOLD,
} from "@/lib/data-completeness-registry";

// Indonesian NIK: exactly 16 digits (mengikuti normalisasi bulk-upload, docs/standards/code-standards.md).
export const NIK_REGEX = /^\d{16}$/;

// Weighted contribution of each domain to the overall health score.
export const DOMAIN_WEIGHTS = {
  profil: 0.1,
  petani: 0.25,
  lahan: 0.25,
  pelatihan: 0.2,
  produksi: 0.2,
} as const;

export type CompletenessOptions = {
  /** Periode acuan kebaruan produksi (YYYY-MM); default bulan berjalan. */
  referencePeriod?: string;
};

/** Bulan berjalan sebagai YYYY-MM (zona waktu server). */
export function currentPeriod(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Selisih bulan `to − from` untuk dua periode YYYY-MM; NaN bila format tak dikenal. */
export function monthsBetween(from: string, to: string): number {
  const a = /^(\d{4})-(\d{2})$/.exec(from);
  const b = /^(\d{4})-(\d{2})$/.exec(to);
  if (!a || !b) return Number.NaN;
  return (Number(b[1]) - Number(a[1])) * 12 + (Number(b[2]) - Number(a[2]));
}

/**
 * Komponen tanggal lahir seperti yang DIMAKSUD pengguna. Kolom `birth_date`
 * tersimpan sebagai timestamp tanpa zona dengan beragam jam (00:00 UTC dari
 * impor; 17:00 / 16:30 / 16:00 / 15:00 UTC = tengah malam WIB / WIB historis /
 * WITA / WIT dari form browser). Menggeser +12 jam lalu membaca komponen UTC
 * = membulatkan ke hari terdekat — benar untuk semua bentuk itu.
 */
export function birthDateParts(d: Date): { day: number; month: number; year: number } {
  const shifted = new Date(d.getTime() + BIRTH_DATE_DAY_ANCHOR_HOURS * 3600 * 1000);
  return { day: shifted.getUTCDate(), month: shifted.getUTCMonth() + 1, year: shifted.getUTCFullYear() };
}

/** Peta jumlah NIK & ID Petani (trim) — pembeda "unik" untuk check NIK/ID. */
function identityCounts(farmers: CompletenessFarmerInput[]) {
  const nikCount = new Map<string, number>();
  const farmerIdCount = new Map<string, number>();
  for (const f of farmers) {
    const nik = f.nik?.trim();
    if (nik) nikCount.set(nik, (nikCount.get(nik) ?? 0) + 1);
    const fid = f.farmerId?.trim();
    if (fid) farmerIdCount.set(fid, (farmerIdCount.get(fid) ?? 0) + 1);
  }
  return { nikCount, farmerIdCount };
}

/**
 * Proporsi check petani yang lolos (0–1): NIK sahih & unik, ID Petani unik,
 * lalu FARMER_FIELD_CHECKS — satu sumber untuk skor domain Petani & rincian per KT.
 */
export function farmerCompleteness(
  f: CompletenessFarmerInput,
  counts: ReturnType<typeof identityCounts>
): number {
  const nik = f.nik?.trim();
  const nikOk = !!nik && NIK_REGEX.test(nik) && (counts.nikCount.get(nik) ?? 0) === 1;
  const fid = f.farmerId?.trim();
  const farmerIdOk = !!fid && (counts.farmerIdCount.get(fid) ?? 0) === 1;
  const passed =
    (nikOk ? 1 : 0) + (farmerIdOk ? 1 : 0) + FARMER_FIELD_CHECKS.reduce((s, c) => s + (c.complete(f) ? 1 : 0), 0);
  return passed / FARMER_CHECK_COUNT;
}

/**
 * Tanggal lahir & jenis kelamin yang tersirat di NIK: digit 7–12 = DDMMYY,
 * hari +40 untuk perempuan. Tahun dua digit tak bisa dipastikan abadnya —
 * pembanding memakai `year % 100`.
 */
export function nikBirthParts(nik: string): { day: number; month: number; yy: number; female: boolean } | null {
  if (!NIK_REGEX.test(nik)) return null;
  const dd = Number(nik.slice(6, 8));
  const mm = Number(nik.slice(8, 10));
  const yy = Number(nik.slice(10, 12));
  const female = dd > 40;
  const day = female ? dd - 40 : dd;
  if (day < 1 || day > 31 || mm < 1 || mm > 12) return null;
  return { day, month: mm, yy, female };
}

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

function toItem(f: CompletenessFarmerInput, detail?: string): AnomalyItem {
  return { farmerDbId: f.id, farmerId: f.farmerId, farmerName: f.name, detail };
}

/**
 * Bangun satu anomali dari registri. `total` = penyebut grain-nya (petani/persil
 * yang diperiksa). Pelipatan sistemik (#352 A3): bila check "kolom kosong"
 * (`foldable`) kosong pada ≥ SYSTEMIC_THRESHOLD entitas dan Lembaga cukup
 * besar, anomali dihitung sebagai SATU temuan agregat ("kolom belum pernah
 * diisi di Lembaga ini") — `count` = 1, daftar `items` tetap dibawa untuk Excel.
 */
function anomaly(key: string, items: AnomalyItem[], total: number, labelOverride?: string): DomainAnomaly {
  const def = anomalyDef(key);
  const entityCount = items.length;
  const systemic =
    def.foldable && total >= SYSTEMIC_MIN_ENTITIES && entityCount / total >= SYSTEMIC_THRESHOLD;
  return {
    key,
    label: labelOverride ?? def.label,
    kind: def.kind,
    count: systemic ? 1 : entityCount,
    entityCount,
    total,
    grain: def.grain,
    systemic,
    fix: def.fix,
    items,
  };
}

/** Baris checklist dari anomali (termasuk yang 0 temuan). */
function rowOf(a: DomainAnomaly, weight?: number, weightLabel?: string): CheckRow {
  return {
    key: a.key,
    label: a.label,
    kind: a.kind,
    grain: a.grain,
    flagged: a.entityCount,
    total: a.total,
    weight,
    weightLabel: weight == null ? undefined : weightLabel,
    systemic: a.systemic,
    applicable: true,
    fix: a.fix,
  };
}

/** Baris checklist dari cakupan modul domain tertentu. */
function moduleRows(modules: ModuleCoverage[], domain: ModuleCoverage["domain"]): CheckRow[] {
  return modules
    .filter((m) => m.domain === domain)
    .map((m) => ({
      key: m.key,
      label: m.label,
      kind: "modul" as const,
      grain: m.grain,
      flagged: m.total - m.covered,
      total: m.total,
      systemic: false,
      applicable: m.applicable,
      fix: m.fix,
    }));
}

function scorePercent(complete: number, total: number): number {
  return total > 0 ? (complete / total) * 100 : 0;
}

const withFindings = (all: DomainAnomaly[]) => all.filter((a) => a.entityCount > 0);
const sumCount = (anomalies: DomainAnomaly[]) => anomalies.reduce((s, a) => s + a.count, 0);

// ── Domain 1: Profil Lembaga Petani ──
// Check inti (skor) diikuti check kualitas (informatif). Check kualitas yang
// tak bisa dinilai (mis. tanpa boundary kabupaten) tidak dikeluarkan.
export function computeProfileChecks(group: CompletenessGroupInput): ProfileCheck[] {
  const core: ProfileCheck[] = PROFILE_CHECKS.map((c) => ({
    key: c.key,
    label: c.label,
    kind: "inti",
    complete: c.complete(group),
    value: c.value(group),
    fix: c.fix,
  }));
  const quality: ProfileCheck[] = PROFILE_QUALITY_CHECKS.flatMap((c) => {
    const complete = c.complete(group);
    if (complete == null) return [];
    const def = anomalyDef(c.key);
    return [{ key: c.key, label: def.label, kind: "kualitas" as const, complete, value: c.value(group), fix: def.fix }];
  });
  return [...core, ...quality];
}

// ── Domain 2: Petani ──
// Skor GRADED per field (#193, keputusan owner 2026-07-28): tiap petani dinilai
// dari proporsi check yang lolos (NIK sahih & unik, ID unik, alamat, tanggal
// lahir, tempat lahir, tahun bergabung), lalu dirata-rata. Sebelumnya
// all-or-nothing (petani dengan satu field kosong dihitung 0) sehingga skor
// kolaps ke 0% padahal sebagian besar field terisi. Daftar anomali tidak
// berubah — hanya skornya. Tempat lahir ditambahkan #352; check kualitas
// (NIK ↔ tanggal lahir/jenis kelamin, umur, kemungkinan ganda, Monev tanpa
// rincian) informatif — tidak masuk skor.
export function computePetaniDomain(farmers: CompletenessFarmerInput[], referenceYear?: number): DomainResult {
  const total = farmers.length;
  const refYear = referenceYear ?? Number(currentPeriod().slice(0, 4));

  const counts = identityCounts(farmers);
  const { nikCount, farmerIdCount } = counts;

  const noNik = farmers.filter((f) => isBlank(f.nik));
  const invalidNik = farmers.filter((f) => !isBlank(f.nik) && !NIK_REGEX.test(f.nik!.trim()));
  // Duplikat hanya dinilai pada NIK sahih — baris invalid & duplikat saling lepas
  // (satu petani satu baris NIK; Σ Δ prioritas tidak menghitung ganda).
  const dupNik = farmers.filter(
    (f) => !isBlank(f.nik) && NIK_REGEX.test(f.nik!.trim()) && (nikCount.get(f.nik!.trim()) ?? 0) > 1
  );
  const dupFarmerId = farmers.filter(
    (f) => !isBlank(f.farmerId) && (farmerIdCount.get(f.farmerId.trim()) ?? 0) > 1
  );

  // ── Kualitas: NIK ↔ tanggal lahir & jenis kelamin (hanya NIK 16 digit + tanggal lahir terisi) ──
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const nikChecked = farmers.filter((f) => !!f.nik && !!nikBirthParts(f.nik.trim()) && f.birthDate != null);
  const nikBirthMismatch: AnomalyItem[] = [];
  for (const f of nikChecked) {
    const n = nikBirthParts(f.nik!.trim())!;
    const b = birthDateParts(f.birthDate!);
    const ok = n.day === b.day && n.month === b.month && n.yy === b.year % 100;
    if (ok) continue;
    // Petunjuk paling umum di data: hari/bulan tertukar saat impor.
    const swapped = n.day === b.month && n.month === b.day && n.yy === b.year % 100;
    nikBirthMismatch.push(
      toItem(
        f,
        `NIK ${pad2(n.day)}-${pad2(n.month)}-${pad2(n.yy)} · tersimpan ${pad2(b.day)}-${pad2(b.month)}-${b.year}${swapped ? " (hari/bulan tertukar?)" : ""}`
      )
    );
  }
  const nikGenderChecked = farmers.filter((f) => !!f.nik && !!nikBirthParts(f.nik.trim()) && f.gender != null);
  const nikGenderMismatch = nikGenderChecked
    .filter((f) => nikBirthParts(f.nik!.trim())!.female !== (f.gender === "F"))
    .map((f) => toItem(f, `NIK → ${nikBirthParts(f.nik!.trim())!.female ? "perempuan" : "laki-laki"} · tersimpan ${f.gender === "F" ? "perempuan" : "laki-laki"}`));

  // ── Kualitas: umur wajar ──
  const withBirth = farmers.filter((f) => f.birthDate != null);
  const ageOf = (f: CompletenessFarmerInput) => refYear - birthDateParts(f.birthDate!).year;
  const implausibleAge = withBirth
    .filter((f) => ageOf(f) < FARMER_AGE_MIN || ageOf(f) > FARMER_AGE_MAX)
    .map((f) => toItem(f, `${ageOf(f)} tahun`));

  // ── Kualitas: kemungkinan petani ganda (nama + tanggal lahir sama) ──
  const dupKey = new Map<string, number>();
  const keyOf = (f: CompletenessFarmerInput) => {
    if (f.birthDate == null || isBlank(f.name)) return null;
    const b = birthDateParts(f.birthDate);
    return `${f.name.trim().toLowerCase().replace(/\s+/g, " ")}|${b.year}-${pad2(b.month)}-${pad2(b.day)}`;
  };
  for (const f of farmers) {
    const k = keyOf(f);
    if (k) dupKey.set(k, (dupKey.get(k) ?? 0) + 1);
  }
  const possibleDup = farmers
    .filter((f) => {
      const k = keyOf(f);
      return !!k && (dupKey.get(k) ?? 0) > 1;
    })
    .map((f) => toItem(f, `${dupKey.get(keyOf(f)!)} petani senama & setanggal lahir`));

  // ── Kualitas: Monev BMP rekap saja (tanpa rincian indikator) ──
  const monevChecked = farmers.filter((f) => f.modules?.bmpAssessmentNoDetails != null);
  const monevNoDetails = monevChecked.filter((f) => f.modules!.bmpAssessmentNoDetails).map((f) => toItem(f));

  const all: DomainAnomaly[] = [
    anomaly("no-nik", noNik.map((f) => toItem(f)), total),
    anomaly("invalid-nik", invalidNik.map((f) => toItem(f, f.nik ?? undefined)), total),
    anomaly("dup-nik", dupNik.map((f) => toItem(f, f.nik ?? undefined)), total),
    anomaly("dup-farmer-id", dupFarmerId.map((f) => toItem(f, f.farmerId)), total),
    ...FARMER_FIELD_CHECKS.map((c) =>
      anomaly(c.anomalyKey, farmers.filter((f) => !c.complete(f)).map((f) => toItem(f)), total)
    ),
    anomaly("nik-tanggal-lahir", nikBirthMismatch, nikChecked.length),
    anomaly("nik-jenis-kelamin", nikGenderMismatch, nikGenderChecked.length),
    anomaly("umur-tidak-wajar", implausibleAge, withBirth.length),
    anomaly("petani-kemungkinan-ganda", possibleDup, total),
    anomaly("monev-tanpa-rincian", monevNoDetails, monevChecked.length),
  ];
  const anomalies = withFindings(all);

  // A farmer counts as "complete" when none of the SCORED anomalies apply.
  const flagged = new Set<string>();
  for (const a of anomalies) if (a.kind !== "kualitas") for (const item of a.items) flagged.add(item.farmerDbId);
  const completeFarmers = total - flagged.size;

  // Skor graded: rata-rata proporsi check per petani.
  const score = total > 0 ? (farmers.reduce((s, f) => s + farmerCompleteness(f, counts), 0) / total) * 100 : 0;

  // Bobot per check inti/validitas = 1 dari FARMER_CHECK_COUNT (NIK: 3 baris berbagi satu check).
  const w = 1 / FARMER_CHECK_COUNT;
  const weightOf = (a: DomainAnomaly) => (a.kind === "kualitas" ? undefined : w);

  return {
    domain: "petani",
    label: "Petani",
    score,
    totalAnomalies: sumCount(anomalies),
    cards: [
      { label: "Total Petani", value: total },
      { label: "Petani Lengkap", value: completeFarmers },
      { label: "Petani dengan Anomali", value: flagged.size },
      { label: "% Kelengkapan Field", value: `${score.toFixed(1)}%` },
    ],
    anomalies,
    checks: all.map((a) => rowOf(a, weightOf(a), `1/${FARMER_CHECK_COUNT}`)),
  };
}

// ── Domain 3: Lahan ──
type ParcelWithOwner = { owner: CompletenessFarmerInput; parcel: CompletenessParcelInput };

function flattenParcels(farmers: CompletenessFarmerInput[]): ParcelWithOwner[] {
  const parcels: ParcelWithOwner[] = [];
  for (const f of farmers) for (const p of f.landParcels) parcels.push({ owner: f, parcel: p });
  return parcels;
}

const parcelItem = ({ owner, parcel }: ParcelWithOwner, detail?: string): AnomalyItem => ({
  ...toItem(owner, detail ?? parcel.parcelId),
  parcelDbId: parcel.id,
});

/** Proporsi berbobot atribut terisi satu persil (0–1) — dipakai skor domain & rincian per KT. */
export function parcelCompleteness(parcel: CompletenessParcelInput): number {
  return PARCEL_CHECKS.reduce((s, c) => s + (c.complete(parcel) ? c.weight : 0), 0) / PARCEL_CHECK_WEIGHT_TOTAL;
}

export function computeLahanDomain(farmers: CompletenessFarmerInput[], referenceYear?: number): DomainResult {
  const refYear = referenceYear ?? Number(currentPeriod().slice(0, 4));
  const noParcel = farmers.filter((f) => f.landParcels.length === 0);
  const parcels = flattenParcels(farmers);

  const totalParcels = parcels.length;
  const totalArea = parcels.reduce((s, { parcel }) => s + (parcel.area ?? 0), 0);

  // ── Kualitas ──
  const boundaryChecked = parcels.filter(({ parcel }) => parcel.modules?.outsideBoundary != null);
  const outsideBoundary = boundaryChecked.filter(({ parcel }) => parcel.modules!.outsideBoundary).map((p) => parcelItem(p));

  const areaChecked = parcels.filter(
    ({ parcel }) => parcel.geometryAreaHa != null && parcel.area != null && parcel.area > 0
  );
  const areaMismatch = areaChecked
    .filter(({ parcel }) => {
      const a = parcel.area!;
      const g = parcel.geometryAreaHa!;
      return Math.abs(a - g) / Math.max(a, g) > PARCEL_AREA_MISMATCH_RATIO;
    })
    .map((p) => parcelItem(p, `${p.parcel.parcelId} · kolom ${p.parcel.area!.toFixed(2)} ha vs poligon ${p.parcel.geometryAreaHa!.toFixed(2)} ha`));

  const withArea = parcels.filter(({ parcel }) => parcel.area != null);
  const implausibleArea = withArea
    .filter(({ parcel }) => parcel.area! < PARCEL_AREA_MIN_HA || parcel.area! > PARCEL_AREA_MAX_HA)
    .map((p) => parcelItem(p, `${p.parcel.parcelId} · ${p.parcel.area} ha`));

  const withPlanting = parcels.filter(({ parcel }) => parcel.plantingYear != null);
  const implausiblePlanting = withPlanting
    .filter(({ parcel }) => parcel.plantingYear! < PLANTING_YEAR_MIN || parcel.plantingYear! > refYear)
    .map((p) => parcelItem(p, `${p.parcel.parcelId} · ${p.parcel.plantingYear}`));

  const all: DomainAnomaly[] = [
    anomaly("petani-tanpa-lahan", noParcel.map((f) => toItem(f)), farmers.length),
    ...PARCEL_CHECKS.map((c) =>
      anomaly(c.anomalyKey, parcels.filter(({ parcel }) => !c.complete(parcel)).map((p) => parcelItem(p)), totalParcels)
    ),
    anomaly("persil-di-luar-boundary", outsideBoundary, boundaryChecked.length),
    anomaly("luas-beda-geometri", areaMismatch, areaChecked.length),
    anomaly("luas-tidak-wajar", implausibleArea, withArea.length),
    anomaly("tahun-tanam-tidak-wajar", implausiblePlanting, withPlanting.length),
  ];
  const anomalies = withFindings(all);

  // Parcel score: fraction of parcels with no SCORED anomaly (petani-tanpa-lahan is a relation metric, excluded here).
  const flaggedParcels = new Set<string>();
  for (const a of anomalies) {
    if (a.grain !== "persil" || a.kind === "kualitas") continue;
    for (const it of a.items) flaggedParcels.add(it.parcelDbId ?? `${it.farmerDbId}::${it.detail}`);
  }

  // Skor GRADED per field (#193, keputusan owner 2026-07-28): tiap persil dinilai
  // dari proporsi BERBOBOT atribut yang terisi (geometry, luas, jenis tanaman,
  // Kelompok Tani = 3; tahun tanam, status lahan, blok = 1 — keputusan owner
  // #352 P2), lalu dirata-rata — bukan all-or-nothing per persil.
  const score =
    totalParcels > 0 ? (parcels.reduce((s, p) => s + parcelCompleteness(p.parcel), 0) / totalParcels) * 100 : 0;

  const weightByKey = new Map(PARCEL_CHECKS.map((c) => [c.anomalyKey, c.weight / PARCEL_CHECK_WEIGHT_TOTAL]));
  const weightLabelByKey = new Map(PARCEL_CHECKS.map((c) => [c.anomalyKey, `${c.weight}/${PARCEL_CHECK_WEIGHT_TOTAL}`]));
  // Kena NKT = INCLUDED (legacy) + AFFECTED — satu definisi dengan KPI Detail
  // Lembaga, layer peta, dan laporan (review pra-rilis #352).
  const nktAffected = parcels.filter(({ parcel }) => isNktAffected(parcel.modules?.nktStatus)).length;

  return {
    domain: "lahan",
    label: "Lahan",
    score,
    totalAnomalies: sumCount(anomalies),
    cards: [
      { label: "Total Persil Aktif", value: totalParcels },
      { label: "Petani Tanpa Lahan", value: noParcel.length },
      { label: "Persil dengan Anomali", value: flaggedParcels.size },
      { label: "Total Luas (ha)", value: totalArea.toFixed(2) },
      { label: "Persil kena NKT", value: nktAffected },
      { label: "Di Luar Boundary ICS", value: boundaryChecked.length > 0 ? outsideBoundary.length : "—" },
    ],
    anomalies,
    checks: all.map((a) => rowOf(a, weightByKey.get(a.key), weightLabelByKey.get(a.key))),
  };
}

// ── Domain 4: Pelatihan (DA-02b — cakupan per paket) ──
// Aturan bisnis: setiap petani wajib mengikuti SELURUH paket wajib (isActive, exclude OTHER).
// "Ikut paket X" = ada ≥1 partisipasi aktif pada activity KT ini bertaut paket X (kehadiran cukup,
// nilai pre/post-test tidak diperhitungkan untuk cakupan). Skor domain = rata-rata % cakupan petani.
export function computePelatihanDomain(
  farmers: CompletenessFarmerInput[],
  requiredPackages: { code: string; name: string }[],
  activities: { packageCode: string; hasEvidence?: boolean }[]
): DomainResult {
  const total = farmers.length;
  const requiredCodes = requiredPackages.map((p) => p.code);
  const labelOf = new Map(requiredPackages.map((p) => [p.code, p.name]));

  // Per-farmer coverage terhadap paket wajib.
  const coverage = farmers.map((f) => {
    const done = new Set(
      f.trainingParticipants
        .map((tp) => tp.packageCode)
        .filter((code) => labelOf.has(code))
    );
    const doneCount = requiredCodes.filter((c) => done.has(c)).length;
    const totalPkg = requiredCodes.length;
    const complete = doneCount === totalPkg;
    // Tanpa paket wajib → tidak ada yang bisa "kurang" (100%).
    const coveragePct = totalPkg > 0 ? (doneCount / totalPkg) * 100 : 100;
    const missing = requiredCodes.filter((c) => !done.has(c));
    return { f, done, doneCount, totalPkg, complete, coveragePct, missing };
  });

  const completeFarmers = coverage.filter((c) => c.complete).length;
  const incompleteCount = total - completeFarmers;
  const coverageScore = total > 0 ? coverage.reduce((s, c) => s + c.coveragePct, 0) / total : 0;

  // 4a — ringkasan per paket + daftar petani belum ikut.
  const activityCountByCode = new Map<string, number>();
  for (const a of activities) {
    if (labelOf.has(a.packageCode)) {
      activityCountByCode.set(a.packageCode, (activityCountByCode.get(a.packageCode) ?? 0) + 1);
    }
  }
  const packageCoverage = requiredPackages.map((pkg) => {
    const notCoveredFarmers = coverage.filter((c) => !c.done.has(pkg.code)).map((c) => toItem(c.f));
    const covered = total - notCoveredFarmers.length;
    const activityCount = activityCountByCode.get(pkg.code) ?? 0;
    return {
      code: pkg.code,
      label: pkg.name,
      totalFarmers: total,
      covered,
      notCovered: notCoveredFarmers.length,
      coveragePct: scorePercent(covered, total),
      activityCount,
      hasActivity: activityCount > 0,
      notCoveredFarmers,
    };
  });

  // 4b — matriks petani × paket.
  const matrix = coverage.map((c) => ({
    farmerDbId: c.f.id,
    farmerId: c.f.farmerId,
    farmerName: c.f.name,
    cells: requiredCodes.map((code) => ({ code, done: c.done.has(code) })),
  }));

  // 4c — petani belum lengkap (urut cakupan terendah dulu).
  const incompleteFarmers = coverage
    .filter((c) => !c.complete)
    .sort((a, b) => a.coveragePct - b.coveragePct)
    .map((c) => ({
      farmerDbId: c.f.id,
      farmerId: c.f.farmerId,
      farmerName: c.f.name,
      doneCount: c.doneCount,
      total: c.totalPkg,
      coveragePct: Math.round(c.coveragePct),
      missing: c.missing.map((code) => labelOf.get(code) ?? code),
    }));

  // Anomali domain: belum-ikut per paket + kelengkapan & kualitas nilai (pre/post-test) + KT tanpa aktivitas.
  // Penyebut nilai = petani yang punya partisipasi (hanya mereka yang bisa ditandai).
  const participants = farmers.filter((f) => f.trainingParticipants.length > 0);
  const noPreTest = participants.filter((f) => f.trainingParticipants.some((p) => p.preTestScore == null));
  const noPostTest = participants.filter((f) => f.trainingParticipants.some((p) => p.postTestScore == null));
  const dropped = (p: { preTestScore: number | null; postTestScore: number | null }) =>
    p.preTestScore != null && p.postTestScore != null && p.postTestScore < p.preTestScore;
  const scoreDrop = participants
    .filter((f) => f.trainingParticipants.some(dropped))
    .map((f) => {
      const p = f.trainingParticipants.find(dropped)!;
      return toItem(f, `pre ${p.preTestScore} → post ${p.postTestScore}`);
    });
  const outOfRange = (v: number | null) => v != null && (v < 0 || v > 100);
  const scoreOutOfRange = participants
    .filter((f) => f.trainingParticipants.some((p) => outOfRange(p.preTestScore) || outOfRange(p.postTestScore)))
    .map((f) => toItem(f));

  const packageWeight = requiredCodes.length > 0 ? 1 / requiredCodes.length : undefined;
  // Anomali tingkat Lembaga (satu temuan tanpa daftar entitas): penyebut 1 Lembaga,
  // entityCount 1 bila tak ada aktivitas sama sekali — ikut checklist & Excel.
  const noActivityDef = anomalyDef("kt-tanpa-aktivitas");
  const noActivity: DomainAnomaly = {
    key: "kt-tanpa-aktivitas",
    label: noActivityDef.label,
    kind: noActivityDef.kind,
    count: activities.length === 0 ? 1 : 0,
    entityCount: activities.length === 0 ? 1 : 0,
    total: 1,
    grain: noActivityDef.grain,
    systemic: false,
    fix: noActivityDef.fix,
    items: [],
  };
  const all: DomainAnomaly[] = [
    noActivity,
    ...packageCoverage.map((p) =>
      anomaly(`${PACKAGE_ANOMALY_PREFIX}${p.code}`, p.notCoveredFarmers, total, `Belum ikut ${p.label}`)
    ),
    anomaly("peserta-tanpa-pretest", noPreTest.map((f) => toItem(f)), participants.length),
    anomaly("peserta-tanpa-posttest", noPostTest.map((f) => toItem(f)), participants.length),
    anomaly("nilai-turun", scoreDrop, participants.length),
    anomaly("nilai-di-luar-rentang", scoreOutOfRange, participants.length),
  ];
  const anomalies = withFindings(all);

  return {
    domain: "pelatihan",
    label: "Pelatihan",
    score: coverageScore,
    totalAnomalies: sumCount(anomalies),
    cards: [
      { label: "Total Petani", value: total },
      { label: "Petani Lengkap", value: completeFarmers },
      { label: "Belum Lengkap", value: incompleteCount },
      { label: "% Cakupan Paket", value: `${coverageScore.toFixed(1)}%` },
    ],
    anomalies,
    checks: all.map((a) =>
      rowOf(a, a.key.startsWith(PACKAGE_ANOMALY_PREFIX) ? packageWeight : undefined, `1/${requiredCodes.length} paket`)
    ),
    training: {
      packages: requiredPackages.map((p) => ({ code: p.code, label: p.name })),
      packageCoverage,
      matrix,
      incompleteFarmers,
      completeFarmers,
      incompleteCount,
      coverageScore,
    },
  };
}

// ── Domain 5: Produksi ──
// Skor tetap "% petani ber-produksi" (#352 P1: check baru informatif/anomali,
// tidak mengubah Index). Tambahan #352: kebaruan (produksi basi ≥ N bulan),
// grain lahan (lahan non-PSR tanpa produksi), isPsr dikecualikan dari
// "berlahan tanpa produksi", pangsa record "Estimasi" sebagai kartu, dan
// kualitas: record 0 kg, bulan bolong.
export function computeProduksiDomain(
  farmers: CompletenessFarmerInput[],
  referencePeriod: string = currentPeriod()
): DomainResult {
  const total = farmers.length;
  const withProduction = farmers.filter((f) => f.productionRecords.length > 0);
  const noProduction = farmers.filter((f) => f.productionRecords.length === 0);
  // PSR (replanting) → produksi 0 wajar; petani yang SEMUA lahannya PSR tidak dihitung.
  const landNoProduction = farmers.filter(
    (f) => f.landParcels.some((p) => !p.isPsr) && f.productionRecords.length === 0
  );
  const prodNoParcel = farmers.filter((f) => f.productionRecords.some((r) => r.parcelId == null));

  // Kebaruan: petani ber-produksi yang periode terakhirnya di luar N bulan terakhir.
  const latestPeriod = (f: CompletenessFarmerInput): string | null =>
    f.productionRecords.reduce<string | null>((m, r) => (m == null || r.period > m ? r.period : m), null);
  const stale = withProduction
    .map((f) => ({ f, latest: latestPeriod(f)! }))
    .filter(({ latest }) => {
      const gap = monthsBetween(latest, referencePeriod);
      return Number.isFinite(gap) && gap >= PRODUCTION_STALE_MONTHS;
    });

  // Grain lahan: lahan aktif non-PSR yang tak pernah ditautkan record produksi.
  const producingParcelIds = new Set<string>();
  for (const f of farmers) for (const r of f.productionRecords) if (r.parcelId) producingParcelIds.add(r.parcelId);
  const nonPsrParcels = flattenParcels(farmers).filter(({ parcel }) => !parcel.isPsr);
  const parcelsNoProduction = nonPsrParcels.filter(({ parcel }) => !producingParcelIds.has(parcel.id));

  // Kualitas: record 0 kg; bulan bolong di antara periode pertama & terakhir.
  const zeroYield = withProduction
    .filter((f) => f.productionRecords.some((r) => r.yieldKg === 0))
    .map((f) => toItem(f, `${f.productionRecords.filter((r) => r.yieldKg === 0).length} record 0 kg`));
  const gaps = withProduction
    .map((f) => {
      const sorted = [...new Set(f.productionRecords.map((r) => r.period))].sort();
      const span = monthsBetween(sorted[0], sorted[sorted.length - 1]);
      const missing = Number.isFinite(span) ? span + 1 - sorted.length : 0;
      return { f, missing, first: sorted[0], last: sorted[sorted.length - 1] };
    })
    .filter((x) => x.missing > 0)
    .map((x) => toItem(x.f, `${x.missing} bulan bolong (${x.first} … ${x.last})`));

  const totalRecords = farmers.reduce((s, f) => s + f.productionRecords.length, 0);
  const estimateRecords = farmers.reduce(
    (s, f) => s + f.productionRecords.filter((r) => r.isEstimate).length,
    0
  );

  const all: DomainAnomaly[] = [
    anomaly("petani-tanpa-produksi", noProduction.map((f) => toItem(f)), total),
    anomaly("berlahan-tanpa-produksi", landNoProduction.map((f) => toItem(f)), total),
    anomaly("produksi-tanpa-persil", prodNoParcel.map((f) => toItem(f)), withProduction.length),
    anomaly("produksi-basi", stale.map(({ f, latest }) => toItem(f, `terakhir ${latest}`)), withProduction.length),
    anomaly("lahan-tanpa-produksi", parcelsNoProduction.map((p) => parcelItem(p)), nonPsrParcels.length),
    anomaly("produksi-nol", zeroYield, withProduction.length),
    anomaly("produksi-bulan-bolong", gaps, withProduction.length),
  ];
  const anomalies = withFindings(all);

  const estimatePct = totalRecords > 0 ? (estimateRecords / totalRecords) * 100 : 0;

  return {
    domain: "produksi",
    label: "Produksi",
    score: scorePercent(withProduction.length, total),
    totalAnomalies: sumCount(anomalies),
    cards: [
      { label: "Total Petani", value: total },
      { label: "Petani dengan Produksi", value: withProduction.length },
      { label: "Petani Tanpa Produksi", value: noProduction.length },
      { label: "Berlahan Tanpa Produksi", value: landNoProduction.length },
      {
        label: "Lahan Berproduksi (non-PSR)",
        value: `${nonPsrParcels.length - parcelsNoProduction.length} / ${nonPsrParcels.length}`,
      },
      // Informatif (P1): bukan anomali, hanya pangsa angka sintetis dari impor rekap.
      { label: "Record Estimasi", value: `${estimateRecords} (${estimatePct.toFixed(1)}%)` },
    ],
    anomalies,
    // Satu-satunya check berskor: % petani ber-produksi (bobot 1).
    checks: all.map((a) => rowOf(a, a.key === "petani-tanpa-produksi" ? 1 : undefined, "1")),
  };
}

// ── Cakupan modul (#352 A1) — informatif, tidak masuk Index ──
// Dihitung hanya bila input memuat flag modul (`group.modules`), supaya konsumen
// yang cuma butuh skor (kartu KPI Detail Lembaga) tak perlu kueri satelit.
// `missing` = daftar kerja entitas yang belum mengisi modul (putaran 2).
export function computeModuleCoverage(group: CompletenessGroupInput): ModuleCoverage[] {
  if (!group.modules) return [];
  const farmers = group.farmers;
  const parcels = flattenParcels(farmers);

  return MODULE_CATALOG.map((m) => {
    let covered = 0;
    let total = 0;
    let missing: AnomalyItem[] = [];
    switch (m.grain) {
      case "lembaga":
        total = 1;
        covered = m.covered(group) ? 1 : 0;
        break;
      case "petani":
        total = farmers.length;
        missing = farmers.filter((f) => !m.covered(f)).map((f) => toItem(f));
        covered = total - missing.length;
        break;
      case "persil":
        total = parcels.length;
        missing = parcels.filter(({ parcel }) => !m.covered(parcel)).map((p) => parcelItem(p));
        covered = total - missing.length;
        break;
      case "aktivitas":
        total = group.activities.length;
        covered = group.activities.filter((a) => m.covered(a)).length;
        break;
    }
    // "Tidak berlaku": modul bergrain entitas yang belum dimulai sama sekali di
    // Lembaga ini (atau tak punya entitas) — keluar dari penyebut. Modul tingkat
    // Lembaga selalu berlaku (ada/tidak).
    const applicable = m.grain === "lembaga" || (total > 0 && covered > 0);
    return {
      key: m.key,
      label: m.label,
      domain: m.domain,
      grain: m.grain,
      covered,
      total,
      pct: applicable ? (total > 0 ? (covered / total) * 100 : 0) : null,
      applicable,
      fix: m.fix,
      missing: applicable ? missing : [],
    };
  });
}

// ── Prioritas perbaikan (#352 putaran 2) ──
// Kenaikan Index bila satu check berskor dilengkapi 100 %:
//   Δ = bobot domain × (bermasalah ÷ total) × bobot check dalam domain × 100.
// Hanya check berskor (inti/lapangan/validitas/paket) — check kualitas & modul
// tidak mengubah Index. Profil: tiap check gagal = 1/n check profil.
export function computePriorities(
  profileChecks: ProfileCheck[],
  domains: DomainResult[],
  limit = 8
): PriorityItem[] {
  const items: PriorityItem[] = [];
  const coreProfile = profileChecks.filter((c) => c.kind === "inti");
  for (const c of coreProfile) {
    if (c.complete) continue;
    items.push({
      key: `profil:${c.key}`,
      domain: "profil",
      label: `Lengkapi ${c.label}`,
      flagged: 1,
      total: 1,
      indexGain: DOMAIN_WEIGHTS.profil * (1 / coreProfile.length) * 100,
      fix: c.fix,
    });
  }
  for (const d of domains) {
    for (const row of d.checks) {
      if (row.weight == null || row.total === 0 || row.flagged === 0) continue;
      items.push({
        key: `${d.domain}:${row.key}`,
        domain: d.domain,
        label: row.label,
        flagged: row.flagged,
        total: row.total,
        indexGain: DOMAIN_WEIGHTS[d.domain] * (row.flagged / row.total) * row.weight * 100,
        fix: row.fix,
      });
    }
  }
  return items
    .sort((a, b) => b.indexGain - a.indexGain || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((i) => ({ ...i, indexGain: Math.round(i.indexGain * 10) / 10 }));
}

// ── Rincian per Kelompok Tani (#352 putaran 2) ──
// KT = `subGroupLv2` lahan (TD-014: denormalisasi per persil). Petani "milik"
// KT = pemilik lahan di KT itu (satu petani bisa muncul di beberapa KT).
export function computeByKelompokTani(farmers: CompletenessFarmerInput[]): KelompokTaniRow[] {
  const producingParcelIds = new Set<string>();
  for (const f of farmers) for (const r of f.productionRecords) if (r.parcelId) producingParcelIds.add(r.parcelId);

  const counts = identityCounts(farmers);
  const farmerScore = (f: CompletenessFarmerInput) => farmerCompleteness(f, counts);

  type Acc = { farmers: Set<string>; farmerScores: number[]; parcels: number; area: number; lahan: number; producing: number };
  const acc = new Map<string, Acc>();
  for (const f of farmers) {
    const seenKt = new Set<string>();
    for (const p of f.landParcels) {
      const name = isBlank(p.subGroupLv2) ? "(tanpa Kelompok Tani)" : p.subGroupLv2!.trim();
      const a = acc.get(name) ?? { farmers: new Set(), farmerScores: [], parcels: 0, area: 0, lahan: 0, producing: 0 };
      a.parcels += 1;
      a.area += p.area ?? 0;
      a.lahan += parcelCompleteness(p);
      // Persil berproduksi = persil (PSR atau bukan) yang punya record produksi — penyebutnya semua persil KT.
      if (producingParcelIds.has(p.id)) a.producing += 1;
      if (!seenKt.has(name)) {
        seenKt.add(name);
        a.farmers.add(f.id);
        a.farmerScores.push(farmerScore(f));
      }
      acc.set(name, a);
    }
  }
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return [...acc.entries()]
    .map(([name, a]) => ({
      name,
      farmers: a.farmers.size,
      parcels: a.parcels,
      areaHa: round1(a.area),
      lahanScore: round1((a.lahan / a.parcels) * 100),
      petaniScore: round1((a.farmerScores.reduce((s, x) => s + x, 0) / a.farmerScores.length) * 100),
      parcelsProducing: a.producing,
      parcelsProducingPct: round1((a.producing / a.parcels) * 100),
    }))
    .sort((x, y) => x.lahanScore - y.lahanScore || y.parcels - x.parcels || x.name.localeCompare(y.name));
}

// ── Orchestrator ──
export function computeCompleteness(
  group: CompletenessGroupInput,
  options: CompletenessOptions = {}
): DataCompletenessResult {
  const farmers = group.farmers;
  const referencePeriod = options.referencePeriod ?? currentPeriod();
  const referenceYear = Number(referencePeriod.slice(0, 4));

  const profileChecks = computeProfileChecks(group);
  const coreProfile = profileChecks.filter((c) => c.kind === "inti");
  const profileComplete = coreProfile.filter((c) => c.complete).length;
  const profileScore = scorePercent(profileComplete, coreProfile.length);
  // Temuan profil = check inti gagal + check kualitas gagal (masing-masing satu temuan).
  const profileFailed = profileChecks.filter((c) => !c.complete).length;

  const petani = computePetaniDomain(farmers, referenceYear);
  const lahan = computeLahanDomain(farmers, referenceYear);
  const pelatihan = computePelatihanDomain(farmers, group.trainingPackages, group.activities);
  const produksi = computeProduksiDomain(farmers, referencePeriod);

  const moduleCoverage = computeModuleCoverage(group);
  // Baris modul menempel ke checklist domain masing-masing (putaran 2).
  const domains: DomainResult[] = [petani, lahan, pelatihan, produksi].map((d) => ({
    ...d,
    checks: [...d.checks, ...moduleRows(moduleCoverage, d.domain)],
  }));

  const healthScore =
    DOMAIN_WEIGHTS.profil * profileScore +
    DOMAIN_WEIGHTS.petani * petani.score +
    DOMAIN_WEIGHTS.lahan * lahan.score +
    DOMAIN_WEIGHTS.pelatihan * pelatihan.score +
    DOMAIN_WEIGHTS.produksi * produksi.score;

  const totalAnomalies =
    profileFailed +
    petani.totalAnomalies +
    lahan.totalAnomalies +
    pelatihan.totalAnomalies +
    produksi.totalAnomalies;

  const round1 = (n: number) => Math.round(n * 10) / 10;

  return {
    group: {
      id: group.id,
      name: group.name,
      code: group.code,
      districtName: group.district.name,
    },
    healthScore: Math.round(healthScore),
    totalAnomalies,
    totalFarmers: farmers.length,
    profileScore: round1(profileScore),
    profileChecks,
    domains: domains.map((d) => ({ ...d, score: round1(d.score) })),
    moduleCoverage,
    priorities: computePriorities(profileChecks, domains),
    byKelompokTani: computeByKelompokTani(farmers),
    referencePeriod,
  };
}
