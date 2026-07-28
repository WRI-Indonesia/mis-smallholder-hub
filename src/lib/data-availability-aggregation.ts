// DA-03 (#193) — Pure aggregation for Dashboard Ketersediaan Data.
// Scoring per Lembaga direuse utuh dari DA-02 (computeCompleteness) supaya angka
// dashboard dan halaman Analisa Ketersediaan Data tidak pernah berbeda.
// Kept free of Prisma/Next imports so it is directly unit-testable.

import { computeCompleteness, DOMAIN_WEIGHTS } from "@/lib/data-completeness";
import type { CompletenessGroupInput } from "@/types/data-completeness";
import type {
  AvailabilityAnomalyCount,
  AvailabilityAnomalySummary,
  AvailabilityDashboardData,
  AvailabilityDomainKey,
  AvailabilityGroupEntry,
  AvailabilityScoreBand,
  AvailabilitySliceFilter,
  AvailabilityTotals,
  BmpFarmerGroupCategory,
} from "@/types/dashboard";

export const AVAILABILITY_DOMAIN_ORDER: AvailabilityDomainKey[] = [
  "profil",
  "petani",
  "lahan",
  "pelatihan",
  "produksi",
];

export const AVAILABILITY_DOMAIN_LABELS: Record<AvailabilityDomainKey, string> = {
  profil: "Profil Lembaga",
  petani: "Petani",
  lahan: "Lahan",
  pelatihan: "Pelatihan",
  produksi: "Produksi",
};

/**
 * Band skor — satu sumber warna untuk card, bar chart, dan matriks.
 * Ambang mengikuti konvensi hijau/kuning/merah dashboard lain: 80–99 baik,
 * 50–79 perlu perhatian, <50 kritis. Skor 100 dibedakan sebagai band
 * tersendiri (lengkap penuh) — "sudah tuntas" harus terbaca berbeda dari
 * "sudah baik tapi masih ada yang kurang".
 */
export function scoreBand(score: number): AvailabilityScoreBand {
  if (score >= 100) return "full";
  if (score >= 80) return "good";
  if (score >= 50) return "warn";
  return "bad";
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Jalankan scoring DA-02 untuk satu Lembaga lalu rampingkan ke entri dashboard:
 * daftar petani per anomali dibuang (PII, dan payload lintas Lembaga bisa besar),
 * hanya `{key, label, count}` yang dikirim ke client.
 *
 * Profil yang belum lengkap ikut disintesis sebagai satu anomali
 * (`profil-tidak-lengkap`) supaya Σ count panel anomali == `totalAnomalies`,
 * yang di DA-02 juga menghitung check profil yang gagal.
 */
export function buildAvailabilityEntry(
  input: CompletenessGroupInput,
  meta: { category: BmpFarmerGroupCategory; districtId: string },
): AvailabilityGroupEntry {
  const result = computeCompleteness(input);

  const domainScores = { petani: 0, lahan: 0, pelatihan: 0, produksi: 0 };
  const anomalies: AvailabilityAnomalyCount[] = [];

  const profileFailed = result.profileChecks.filter((c) => !c.complete).length;
  if (profileFailed > 0) {
    anomalies.push({
      key: "profil-tidak-lengkap",
      label: "Profil Lembaga belum lengkap",
      count: profileFailed,
    });
  }

  for (const domain of result.domains) {
    domainScores[domain.domain] = domain.score;
    for (const a of domain.anomalies) {
      anomalies.push({ key: a.key, label: a.label, count: a.count });
    }
  }

  return {
    id: result.group.id,
    name: result.group.name,
    code: result.group.code,
    category: meta.category,
    districtId: meta.districtId,
    districtName: result.group.districtName,
    totalFarmers: result.totalFarmers,
    totalParcels: input.farmers.reduce((s, f) => s + f.landParcels.length, 0),
    activityCount: input.activities.length,
    farmersWithProduction: input.farmers.filter((f) => f.productionRecords.length > 0).length,
    healthScore: result.healthScore,
    profileScore: result.profileScore,
    domainScores,
    totalAnomalies: result.totalAnomalies,
    anomalies,
  };
}

/** Persempit data per-Lembaga sesuai pilihan Distrik/Kategori. */
export function filterAvailabilityGroups(
  data: AvailabilityDashboardData,
  filter: AvailabilitySliceFilter,
): AvailabilityGroupEntry[] {
  return data.groups.filter((g) => {
    if (filter.districtId && g.districtId !== filter.districtId) return false;
    if (filter.category && g.category !== filter.category) return false;
    return true;
  });
}

/**
 * KPI portfolio pada irisan yang tampil.
 *
 * Skor domain petani/lahan/pelatihan/produksi = rata-rata TERTIMBANG jumlah
 * petani (keputusan owner #193): Lembaga besar berbobot lebih, sehingga skor
 * mencerminkan proporsi data riil yang lengkap — bukan rata-rata Lembaga.
 * Bila seluruh irisan tak punya petani, jatuh ke rata-rata sederhana agar skor
 * profil/struktur tetap terbaca. Profil = rata-rata sederhana (satu profil per
 * Lembaga, tak terkait ukuran). Skor keseluruhan memakai DOMAIN_WEIGHTS DA-02.
 */
export function availabilityTotals(groups: AvailabilityGroupEntry[]): AvailabilityTotals {
  let totalFarmers = 0;
  let totalParcels = 0;
  let totalActivities = 0;
  let farmersWithProduction = 0;
  let totalAnomalies = 0;
  let profileSum = 0;

  const weighted = { petani: 0, lahan: 0, pelatihan: 0, produksi: 0 };
  const simple = { petani: 0, lahan: 0, pelatihan: 0, produksi: 0 };
  const weightedKeys = Object.keys(weighted) as (keyof typeof weighted)[];

  for (const g of groups) {
    totalFarmers += g.totalFarmers;
    totalParcels += g.totalParcels;
    totalActivities += g.activityCount;
    farmersWithProduction += g.farmersWithProduction;
    totalAnomalies += g.totalAnomalies;
    profileSum += g.profileScore;
    for (const key of weightedKeys) {
      weighted[key] += g.domainScores[key] * g.totalFarmers;
      simple[key] += g.domainScores[key];
    }
  }

  const count = groups.length;
  const domainScores: Record<AvailabilityDomainKey, number> = {
    profil: count > 0 ? round1(profileSum / count) : 0,
    petani: 0,
    lahan: 0,
    pelatihan: 0,
    produksi: 0,
  };
  for (const key of weightedKeys) {
    const avg =
      totalFarmers > 0 ? weighted[key] / totalFarmers : count > 0 ? simple[key] / count : 0;
    domainScores[key] = round1(avg);
  }

  const overallScore = Math.round(
    DOMAIN_WEIGHTS.profil * domainScores.profil +
      DOMAIN_WEIGHTS.petani * domainScores.petani +
      DOMAIN_WEIGHTS.lahan * domainScores.lahan +
      DOMAIN_WEIGHTS.pelatihan * domainScores.pelatihan +
      DOMAIN_WEIGHTS.produksi * domainScores.produksi,
  );

  return {
    totalGroups: count,
    totalFarmers,
    totalParcels,
    totalActivities,
    farmersWithProduction,
    totalAnomalies,
    overallScore,
    domainScores,
  };
}

/** Lembaga urut skor terendah dulu — yang paling butuh dikejar tampil teratas. */
export function availabilityScoreRows(groups: AvailabilityGroupEntry[]): AvailabilityGroupEntry[] {
  return [...groups].sort(
    (a, b) => a.healthScore - b.healthScore || a.name.localeCompare(b.name),
  );
}

/** Top-N tipe anomali dijumlah lintas Lembaga, terbanyak dulu. */
export function topAnomalies(
  groups: AvailabilityGroupEntry[],
  n = 10,
): AvailabilityAnomalySummary[] {
  const acc = new Map<string, AvailabilityAnomalySummary>();
  for (const g of groups) {
    for (const a of g.anomalies) {
      const e = acc.get(a.key);
      if (e) {
        e.count += a.count;
        e.groupsAffected += 1;
      } else {
        acc.set(a.key, { key: a.key, label: a.label, count: a.count, groupsAffected: 1 });
      }
    }
  }
  return [...acc.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, n);
}
