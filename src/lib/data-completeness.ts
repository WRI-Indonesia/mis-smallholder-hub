// DA-02 — Pure computation logic for farmer-group data completeness & anomaly analysis.
// Kept free of Prisma/Next imports so it is directly unit-testable.
//
// #352: label, grain, dan rute perbaikan tiap anomali + bobot tier check persil
// + daftar modul cakupan dibaca dari registri `data-completeness-registry.ts`.
// Predikat check tetap eksplisit di sini.

import type {
  AnomalyItem,
  CompletenessFarmerInput,
  CompletenessGroupInput,
  CompletenessParcelInput,
  DomainAnomaly,
  DomainResult,
  DataCompletenessResult,
  ModuleCoverage,
  ProfileCheck,
} from "@/types/data-completeness";
import {
  anomalyDef,
  FARMER_CHECK_COUNT,
  FARMER_FIELD_CHECKS,
  MODULE_CATALOG,
  PACKAGE_ANOMALY_PREFIX,
  PARCEL_CHECKS,
  PARCEL_CHECK_WEIGHT_TOTAL,
  PRODUCTION_STALE_MONTHS,
  PROFILE_CHECKS,
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

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

function toItem(f: CompletenessFarmerInput, detail?: string): AnomalyItem {
  return { farmerDbId: f.id, farmerId: f.farmerId, farmerName: f.name, detail };
}

/**
 * Bangun satu anomali dari registri. `total` = penyebut grain-nya (petani/persil
 * yang diperiksa). Pelipatan sistemik (#352 A3): bila ≥ SYSTEMIC_THRESHOLD
 * entitas kosong dan Lembaga cukup besar, anomali dihitung sebagai SATU temuan
 * agregat ("kolom belum pernah diisi di Lembaga ini") — `count` = 1, daftar
 * `items` tetap dibawa untuk Excel.
 */
function anomaly(key: string, items: AnomalyItem[], total: number, labelOverride?: string): DomainAnomaly {
  const def = anomalyDef(key);
  const entityCount = items.length;
  const systemic =
    def.foldable && total >= SYSTEMIC_MIN_ENTITIES && entityCount / total >= SYSTEMIC_THRESHOLD;
  return {
    key,
    label: labelOverride ?? def.label,
    count: systemic ? 1 : entityCount,
    entityCount,
    total,
    grain: def.grain,
    systemic,
    fix: def.fix,
    items,
  };
}

function scorePercent(complete: number, total: number): number {
  return total > 0 ? (complete / total) * 100 : 0;
}

const sumCount = (anomalies: DomainAnomaly[]) => anomalies.reduce((s, a) => s + a.count, 0);

// ── Domain 1: Profil Lembaga Petani ──
export function computeProfileChecks(group: CompletenessGroupInput): ProfileCheck[] {
  return PROFILE_CHECKS.map((c) => ({
    key: c.key,
    label: c.label,
    complete: c.complete(group),
    value: c.value(group),
    fix: c.fix,
  }));
}

// ── Domain 2: Petani ──
// Skor GRADED per field (#193, keputusan owner 2026-07-28): tiap petani dinilai
// dari proporsi check yang lolos (NIK sahih & unik, ID unik, alamat, tanggal
// lahir, tempat lahir, tahun bergabung), lalu dirata-rata. Sebelumnya
// all-or-nothing (petani dengan satu field kosong dihitung 0) sehingga skor
// kolaps ke 0% padahal sebagian besar field terisi. Daftar anomali tidak
// berubah — hanya skornya. Tempat lahir ditambahkan #352.
export function computePetaniDomain(farmers: CompletenessFarmerInput[]): DomainResult {
  const total = farmers.length;

  const nikCount = new Map<string, number>();
  const farmerIdCount = new Map<string, number>();
  for (const f of farmers) {
    const nik = f.nik?.trim();
    if (nik) nikCount.set(nik, (nikCount.get(nik) ?? 0) + 1);
    const fid = f.farmerId?.trim();
    if (fid) farmerIdCount.set(fid, (farmerIdCount.get(fid) ?? 0) + 1);
  }

  const noNik = farmers.filter((f) => isBlank(f.nik));
  const invalidNik = farmers.filter((f) => !isBlank(f.nik) && !NIK_REGEX.test(f.nik!.trim()));
  const dupNik = farmers.filter((f) => !isBlank(f.nik) && (nikCount.get(f.nik!.trim()) ?? 0) > 1);
  const dupFarmerId = farmers.filter(
    (f) => !isBlank(f.farmerId) && (farmerIdCount.get(f.farmerId.trim()) ?? 0) > 1
  );

  const anomalies: DomainAnomaly[] = [
    anomaly("no-nik", noNik.map((f) => toItem(f)), total),
    anomaly("invalid-nik", invalidNik.map((f) => toItem(f, f.nik ?? undefined)), total),
    anomaly("dup-nik", dupNik.map((f) => toItem(f, f.nik ?? undefined)), total),
    anomaly("dup-farmer-id", dupFarmerId.map((f) => toItem(f, f.farmerId)), total),
    ...FARMER_FIELD_CHECKS.map((c) =>
      anomaly(c.anomalyKey, farmers.filter((f) => !c.complete(f)).map((f) => toItem(f)), total)
    ),
  ].filter((a) => a.entityCount > 0);

  // A farmer counts as "complete" when none of the anomalies above apply.
  const flagged = new Set<string>();
  for (const a of anomalies) for (const item of a.items) flagged.add(item.farmerDbId);
  const completeFarmers = total - flagged.size;

  // Skor graded: rata-rata proporsi check per petani.
  const checksPassed = (f: CompletenessFarmerInput): number => {
    const nik = f.nik?.trim();
    const nikOk = !!nik && NIK_REGEX.test(nik) && (nikCount.get(nik) ?? 0) === 1;
    const fid = f.farmerId?.trim();
    const farmerIdOk = !!fid && (farmerIdCount.get(fid) ?? 0) === 1;
    return (
      (nikOk ? 1 : 0) +
      (farmerIdOk ? 1 : 0) +
      FARMER_FIELD_CHECKS.reduce((s, c) => s + (c.complete(f) ? 1 : 0), 0)
    );
  };
  const score =
    total > 0
      ? (farmers.reduce((s, f) => s + checksPassed(f) / FARMER_CHECK_COUNT, 0) / total) * 100
      : 0;

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
  };
}

// ── Domain 3: Lahan ──
type ParcelWithOwner = { owner: CompletenessFarmerInput; parcel: CompletenessParcelInput };

function flattenParcels(farmers: CompletenessFarmerInput[]): ParcelWithOwner[] {
  const parcels: ParcelWithOwner[] = [];
  for (const f of farmers) for (const p of f.landParcels) parcels.push({ owner: f, parcel: p });
  return parcels;
}

const parcelItem = ({ owner, parcel }: ParcelWithOwner): AnomalyItem => ({
  ...toItem(owner, parcel.parcelId),
  parcelDbId: parcel.id,
});

export function computeLahanDomain(farmers: CompletenessFarmerInput[]): DomainResult {
  const noParcel = farmers.filter((f) => f.landParcels.length === 0);
  const parcels = flattenParcels(farmers);

  const totalParcels = parcels.length;
  const totalArea = parcels.reduce((s, { parcel }) => s + (parcel.area ?? 0), 0);

  const anomalies: DomainAnomaly[] = [
    anomaly("petani-tanpa-lahan", noParcel.map((f) => toItem(f)), farmers.length),
    ...PARCEL_CHECKS.map((c) =>
      anomaly(c.anomalyKey, parcels.filter(({ parcel }) => !c.complete(parcel)).map(parcelItem), totalParcels)
    ),
  ].filter((a) => a.entityCount > 0);

  // Parcel score: fraction of parcels with no anomaly (petani-tanpa-lahan is a relation metric, excluded here).
  const flaggedParcels = new Set<string>();
  for (const a of anomalies) {
    if (a.grain !== "persil") continue;
    for (const it of a.items) flaggedParcels.add(it.parcelDbId ?? `${it.farmerDbId}::${it.detail}`);
  }

  // Skor GRADED per field (#193, keputusan owner 2026-07-28): tiap persil dinilai
  // dari proporsi BERBOBOT atribut yang terisi (geometry, luas, jenis tanaman,
  // Kelompok Tani = 1; tahun tanam, status lahan, blok = FIELD_TIER_WEIGHT —
  // keputusan owner #352 P2), lalu dirata-rata — bukan all-or-nothing per persil.
  const parcelScore = ({ parcel }: ParcelWithOwner): number =>
    PARCEL_CHECKS.reduce((s, c) => s + (c.complete(parcel) ? c.weight : 0), 0) / PARCEL_CHECK_WEIGHT_TOTAL;
  const score =
    totalParcels > 0 ? (parcels.reduce((s, p) => s + parcelScore(p), 0) / totalParcels) * 100 : 0;

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
    ],
    anomalies,
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

  // Anomali domain: belum-ikut per paket + kelengkapan nilai (pre/post-test) + KT tanpa aktivitas.
  // Penyebut nilai pre/post-test = petani yang punya partisipasi (hanya mereka yang bisa ditandai).
  const participants = farmers.filter((f) => f.trainingParticipants.length > 0);
  const noPreTest = participants.filter((f) => f.trainingParticipants.some((p) => p.preTestScore == null));
  const noPostTest = participants.filter((f) => f.trainingParticipants.some((p) => p.postTestScore == null));

  const anomalies: DomainAnomaly[] = [
    ...packageCoverage
      .filter((p) => p.notCovered > 0)
      .map((p) => anomaly(`${PACKAGE_ANOMALY_PREFIX}${p.code}`, p.notCoveredFarmers, total, `Belum ikut ${p.label}`)),
    anomaly("peserta-tanpa-pretest", noPreTest.map((f) => toItem(f)), participants.length),
    anomaly("peserta-tanpa-posttest", noPostTest.map((f) => toItem(f)), participants.length),
  ].filter((a) => a.entityCount > 0);

  if (activities.length === 0) {
    // Anomali tingkat Lembaga — satu temuan tanpa daftar entitas (penyebut 0 → tak pernah "sistemik").
    const def = anomalyDef("kt-tanpa-aktivitas");
    anomalies.unshift({
      key: "kt-tanpa-aktivitas",
      label: def.label,
      count: 1,
      entityCount: 1,
      total: 0,
      grain: def.grain,
      systemic: false,
      fix: def.fix,
      items: [],
    });
  }

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
// "berlahan tanpa produksi", dan pangsa record "Estimasi" sebagai kartu.
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

  const totalRecords = farmers.reduce((s, f) => s + f.productionRecords.length, 0);
  const estimateRecords = farmers.reduce(
    (s, f) => s + f.productionRecords.filter((r) => r.isEstimate).length,
    0
  );

  const anomalies: DomainAnomaly[] = [
    anomaly("petani-tanpa-produksi", noProduction.map((f) => toItem(f)), total),
    anomaly("berlahan-tanpa-produksi", landNoProduction.map((f) => toItem(f)), total),
    anomaly("produksi-tanpa-persil", prodNoParcel.map((f) => toItem(f)), total),
    anomaly("produksi-basi", stale.map(({ f, latest }) => toItem(f, `terakhir ${latest}`)), withProduction.length),
    anomaly("lahan-tanpa-produksi", parcelsNoProduction.map(parcelItem), nonPsrParcels.length),
  ].filter((a) => a.entityCount > 0);

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
  };
}

// ── Cakupan modul (#352 A1) — informatif, tidak masuk Index ──
// Dihitung hanya bila input memuat flag modul (`group.modules`), supaya konsumen
// yang cuma butuh skor (kartu KPI Detail Lembaga) tak perlu kueri satelit.
export function computeModuleCoverage(group: CompletenessGroupInput): ModuleCoverage[] {
  if (!group.modules) return [];
  const farmers = group.farmers;
  const parcels = farmers.flatMap((f) => f.landParcels);

  return MODULE_CATALOG.map((m) => {
    let covered = 0;
    let total = 0;
    switch (m.grain) {
      case "lembaga":
        total = 1;
        covered = m.covered(group) ? 1 : 0;
        break;
      case "petani":
        total = farmers.length;
        covered = farmers.filter((f) => m.covered(f)).length;
        break;
      case "persil":
        total = parcels.length;
        covered = parcels.filter((p) => m.covered(p)).length;
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
    };
  });
}

// ── Orchestrator ──
export function computeCompleteness(
  group: CompletenessGroupInput,
  options: CompletenessOptions = {}
): DataCompletenessResult {
  const farmers = group.farmers;
  const referencePeriod = options.referencePeriod ?? currentPeriod();

  const profileChecks = computeProfileChecks(group);
  const profileComplete = profileChecks.filter((c) => c.complete).length;
  const profileScore = scorePercent(profileComplete, profileChecks.length);
  const profileFailed = profileChecks.length - profileComplete;

  const petani = computePetaniDomain(farmers);
  const lahan = computeLahanDomain(farmers);
  const pelatihan = computePelatihanDomain(farmers, group.trainingPackages, group.activities);
  const produksi = computeProduksiDomain(farmers, referencePeriod);

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
    domains: [
      { ...petani, score: round1(petani.score) },
      { ...lahan, score: round1(lahan.score) },
      { ...pelatihan, score: round1(pelatihan.score) },
      { ...produksi, score: round1(produksi.score) },
    ],
    moduleCoverage: computeModuleCoverage(group),
    referencePeriod,
  };
}
