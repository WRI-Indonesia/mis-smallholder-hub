// DA-02 — Pure computation logic for farmer-group data completeness & anomaly analysis.
// Kept free of Prisma/Next imports so it is directly unit-testable.

import type {
  AnomalyItem,
  CompletenessFarmerInput,
  CompletenessGroupInput,
  DomainAnomaly,
  DomainResult,
  DataCompletenessResult,
  ProfileCheck,
} from "@/types/data-completeness";

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

function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

function toItem(f: CompletenessFarmerInput, detail?: string): AnomalyItem {
  return { farmerDbId: f.id, farmerId: f.farmerId, farmerName: f.name, detail };
}

function anomaly(key: string, label: string, items: AnomalyItem[]): DomainAnomaly {
  return { key, label, count: items.length, items };
}

function scorePercent(complete: number, total: number): number {
  return total > 0 ? (complete / total) * 100 : 0;
}

// ── Domain 1: Profil Lembaga Petani ──
export function computeProfileChecks(group: CompletenessGroupInput): ProfileCheck[] {
  const hasCoords = group.locationLat != null && group.locationLong != null;
  return [
    { key: "code", label: "Kode Lembaga Petani", complete: !isBlank(group.code), value: group.code },
    {
      key: "coordinates",
      label: "Koordinat Lokasi",
      complete: hasCoords,
      value: hasCoords ? `${group.locationLat}, ${group.locationLong}` : null,
    },
    {
      key: "join-year",
      label: "Tahun Bergabung",
      complete: group.joinYear != null,
      value: group.joinYear != null ? String(group.joinYear) : null,
    },
    { key: "abrv", label: "Singkatan (Abrv)", complete: !isBlank(group.abrv), value: group.abrv },
  ];
}

// ── Domain 2: Petani ──
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
  const noAddress = farmers.filter((f) => isBlank(f.address));
  const noBirthDate = farmers.filter((f) => f.birthDate == null);
  const noJoinedYear = farmers.filter((f) => f.joinedYear == null);

  const anomalies: DomainAnomaly[] = [
    anomaly("no-nik", "Petani tanpa NIK", noNik.map((f) => toItem(f))),
    anomaly("invalid-nik", "NIK tidak valid (bukan 16 digit)", invalidNik.map((f) => toItem(f, f.nik ?? undefined))),
    anomaly("dup-nik", "NIK duplikat dalam Lembaga Petani", dupNik.map((f) => toItem(f, f.nik ?? undefined))),
    anomaly("dup-farmer-id", "ID Petani duplikat dalam Lembaga Petani", dupFarmerId.map((f) => toItem(f, f.farmerId))),
    anomaly("no-address", "Petani tanpa alamat", noAddress.map((f) => toItem(f))),
    anomaly("no-birth-date", "Petani tanpa tanggal lahir", noBirthDate.map((f) => toItem(f))),
    anomaly("no-joined-year", "Petani tanpa tahun bergabung", noJoinedYear.map((f) => toItem(f))),
  ].filter((a) => a.count > 0);

  // A farmer counts as "complete" when none of the anomalies above apply.
  const flagged = new Set<string>();
  for (const a of anomalies) for (const item of a.items) flagged.add(item.farmerDbId);
  const completeFarmers = total - flagged.size;

  return {
    domain: "petani",
    label: "Petani",
    score: scorePercent(completeFarmers, total),
    totalAnomalies: anomalies.reduce((s, a) => s + a.count, 0),
    cards: [
      { label: "Total Petani", value: total },
      { label: "Petani Lengkap", value: completeFarmers },
      { label: "Petani dengan Anomali", value: flagged.size },
      { label: "% Kelengkapan", value: `${scorePercent(completeFarmers, total).toFixed(1)}%` },
    ],
    anomalies,
  };
}

// ── Domain 3: Lahan ──
export function computeLahanDomain(farmers: CompletenessFarmerInput[]): DomainResult {
  const noParcel = farmers.filter((f) => f.landParcels.length === 0);

  type ParcelWithOwner = { owner: CompletenessFarmerInput; parcel: CompletenessFarmerInput["landParcels"][number] };
  const parcels: ParcelWithOwner[] = [];
  for (const f of farmers) for (const p of f.landParcels) parcels.push({ owner: f, parcel: p });

  const totalParcels = parcels.length;
  const totalArea = parcels.reduce((s, { parcel }) => s + (parcel.area ?? 0), 0);

  const noGeometry = parcels.filter(({ parcel }) => parcel.geometry == null);
  const noArea = parcels.filter(({ parcel }) => parcel.area == null || parcel.area <= 0);
  const noPlantingYear = parcels.filter(({ parcel }) => parcel.plantingYear == null);
  const noCropType = parcels.filter(({ parcel }) => isBlank(parcel.cropType));
  const noLandStatus = parcels.filter(({ parcel }) => isBlank(parcel.landStatus));

  const parcelItem = ({ owner, parcel }: ParcelWithOwner) => toItem(owner, parcel.parcelId);

  const anomalies: DomainAnomaly[] = [
    anomaly("petani-tanpa-lahan", "Petani tanpa lahan aktif", noParcel.map((f) => toItem(f))),
    anomaly("persil-tanpa-geometry", "Persil tanpa geometry", noGeometry.map(parcelItem)),
    anomaly("persil-tanpa-luas", "Persil tanpa luas", noArea.map(parcelItem)),
    anomaly("persil-tanpa-tahun-tanam", "Persil tanpa tahun tanam", noPlantingYear.map(parcelItem)),
    anomaly("persil-tanpa-jenis-tanaman", "Persil tanpa jenis tanaman", noCropType.map(parcelItem)),
    anomaly("persil-tanpa-status", "Persil tanpa status lahan", noLandStatus.map(parcelItem)),
  ].filter((a) => a.count > 0);

  // Parcel score: fraction of parcels with no anomaly (petani-tanpa-lahan is a relation metric, excluded here).
  const flaggedParcels = new Set<string>();
  const markParcel = (list: ParcelWithOwner[]) =>
    list.forEach(({ owner, parcel }) => flaggedParcels.add(`${owner.id}::${parcel.parcelId}`));
  markParcel(noGeometry);
  markParcel(noArea);
  markParcel(noPlantingYear);
  markParcel(noCropType);
  markParcel(noLandStatus);
  const cleanParcels = totalParcels - flaggedParcels.size;

  return {
    domain: "lahan",
    label: "Lahan",
    score: scorePercent(cleanParcels, totalParcels),
    totalAnomalies: anomalies.reduce((s, a) => s + a.count, 0),
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
  activities: { packageCode: string }[]
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
  const noPreTest = farmers.filter((f) => f.trainingParticipants.some((p) => p.preTestScore == null));
  const noPostTest = farmers.filter((f) => f.trainingParticipants.some((p) => p.postTestScore == null));

  const anomalies: DomainAnomaly[] = [
    ...packageCoverage
      .filter((p) => p.notCovered > 0)
      .map((p) => anomaly(`belum-paket-${p.code}`, `Belum ikut ${p.label}`, p.notCoveredFarmers)),
    anomaly("peserta-tanpa-pretest", "Peserta tanpa nilai pre-test", noPreTest.map((f) => toItem(f))),
    anomaly("peserta-tanpa-posttest", "Peserta tanpa nilai post-test", noPostTest.map((f) => toItem(f))),
  ].filter((a) => a.count > 0);

  if (activities.length === 0) {
    anomalies.unshift({ key: "kt-tanpa-aktivitas", label: "Lembaga Petani belum memiliki aktivitas pelatihan", count: 1, items: [] });
  }

  return {
    domain: "pelatihan",
    label: "Pelatihan",
    score: coverageScore,
    totalAnomalies: anomalies.reduce((s, a) => s + a.count, 0),
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
export function computeProduksiDomain(farmers: CompletenessFarmerInput[]): DomainResult {
  const total = farmers.length;
  const withProduction = farmers.filter((f) => f.productionRecords.length > 0);
  const noProduction = farmers.filter((f) => f.productionRecords.length === 0);
  const landNoProduction = farmers.filter(
    (f) => f.landParcels.length > 0 && f.productionRecords.length === 0
  );
  const prodNoParcel = farmers.filter((f) => f.productionRecords.some((r) => r.parcelId == null));

  const anomalies: DomainAnomaly[] = [
    anomaly("petani-tanpa-produksi", "Petani tanpa data produksi", noProduction.map((f) => toItem(f))),
    anomaly("berlahan-tanpa-produksi", "Petani punya lahan tapi tanpa produksi", landNoProduction.map((f) => toItem(f))),
    anomaly("produksi-tanpa-persil", "Produksi tidak terhubung ke persil", prodNoParcel.map((f) => toItem(f))),
  ].filter((a) => a.count > 0);

  return {
    domain: "produksi",
    label: "Produksi",
    score: scorePercent(withProduction.length, total),
    totalAnomalies: anomalies.reduce((s, a) => s + a.count, 0),
    cards: [
      { label: "Total Petani", value: total },
      { label: "Petani dengan Produksi", value: withProduction.length },
      { label: "Petani Tanpa Produksi", value: noProduction.length },
      { label: "Berlahan Tanpa Produksi", value: landNoProduction.length },
    ],
    anomalies,
  };
}

// ── Orchestrator ──
export function computeCompleteness(group: CompletenessGroupInput): DataCompletenessResult {
  const farmers = group.farmers;

  const profileChecks = computeProfileChecks(group);
  const profileComplete = profileChecks.filter((c) => c.complete).length;
  const profileScore = scorePercent(profileComplete, profileChecks.length);
  const profileFailed = profileChecks.length - profileComplete;

  const petani = computePetaniDomain(farmers);
  const lahan = computeLahanDomain(farmers);
  const pelatihan = computePelatihanDomain(farmers, group.trainingPackages, group.activities);
  const produksi = computeProduksiDomain(farmers);

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
  };
}
