// DA-03 (#193) — Pure aggregation for Dashboard Ketersediaan Data.
// Scoring per Lembaga direuse utuh dari DA-02 (computeCompleteness) supaya angka
// dashboard dan halaman Analisa Ketersediaan Data tidak pernah berbeda.
// Kept free of Prisma/Next imports so it is directly unit-testable.

import { computeCompleteness, DOMAIN_WEIGHTS } from "@/lib/data-completeness";
import type { CompletenessOptions } from "@/lib/data-completeness";
import { anomalyDef } from "@/lib/data-completeness-registry";
import type { CompletenessGroupInput } from "@/types/data-completeness";
import type {
  AvailabilityAnomalyCount,
  AvailabilityAnomalySummary,
  AvailabilityDashboardData,
  AvailabilityDomainKey,
  AvailabilityGroupEntry,
  AvailabilityModuleSummary,
  AvailabilityScoreBand,
  AvailabilitySliceFilter,
  AvailabilityTotals,
  BmpFarmerGroupCategory,
} from "@/types/dashboard";

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
  options: CompletenessOptions = {},
): AvailabilityGroupEntry {
  const result = computeCompleteness(input, options);

  const domainScores = { petani: 0, lahan: 0, pelatihan: 0, produksi: 0 };
  const anomalies: AvailabilityAnomalyCount[] = [];

  const coreProfile = result.profileChecks.filter((c) => c.kind === "inti");
  const profileFailed = coreProfile.filter((c) => !c.complete).length;
  if (profileFailed > 0) {
    anomalies.push({
      key: "profil-tidak-lengkap",
      label: anomalyDef("profil-tidak-lengkap").label,
      count: profileFailed,
      entityCount: profileFailed,
      total: coreProfile.length,
      systemic: false,
    });
  }
  // Check kualitas profil yang gagal (#352 putaran 2) — satu temuan per check,
  // agar Σ count tetap == totalAnomalies.
  for (const c of result.profileChecks) {
    if (c.kind !== "kualitas" || c.complete) continue;
    anomalies.push({ key: c.key, label: c.label, count: 1, entityCount: 1, total: 1, systemic: false });
  }

  for (const domain of result.domains) {
    domainScores[domain.domain] = domain.score;
    for (const a of domain.anomalies) {
      anomalies.push({
        key: a.key,
        label: a.label,
        count: a.count,
        entityCount: a.entityCount,
        total: a.total,
        systemic: a.systemic,
      });
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
    moduleCoverage: result.moduleCoverage.map((m) => ({
      key: m.key,
      covered: m.covered,
      total: m.total,
      pct: m.pct,
    })),
  };
}

/** Persempit data per-Lembaga sesuai pilihan Distrik/Kategori/Lembaga. */
export function filterAvailabilityGroups(
  data: AvailabilityDashboardData,
  filter: AvailabilitySliceFilter,
): AvailabilityGroupEntry[] {
  return data.groups.filter((g) => {
    if (filter.districtId && g.districtId !== filter.districtId) return false;
    if (filter.category && g.category !== filter.category) return false;
    if (filter.groupId && g.id !== filter.groupId) return false;
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

function summarizeAnomalies(
  groups: AvailabilityGroupEntry[],
  pick: (a: AvailabilityAnomalyCount) => boolean,
  value: (a: AvailabilityAnomalyCount) => number,
  n: number,
): AvailabilityAnomalySummary[] {
  const acc = new Map<string, AvailabilityAnomalySummary>();
  for (const g of groups) {
    for (const a of g.anomalies) {
      if (!pick(a)) continue;
      const v = value(a);
      const e = acc.get(a.key);
      if (e) {
        e.count += v;
        e.groupsAffected += 1;
        e.groups.push({ id: g.id, name: g.name, count: v });
      } else {
        acc.set(a.key, {
          key: a.key,
          label: a.label,
          count: v,
          groupsAffected: 1,
          groups: [{ id: g.id, name: g.name, count: v }],
        });
      }
    }
  }
  for (const e of acc.values()) {
    e.groups.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }
  return [...acc.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, n);
}

/**
 * Top-N tipe anomali PER ENTITAS (bisa dikejar per petani/persil) dijumlah
 * lintas Lembaga, terbanyak dulu. Anomali yang dilipat sistemik di suatu
 * Lembaga tidak ikut di sini — lihat `topSystemicAnomalies` (#352 A3).
 */
export function topAnomalies(
  groups: AvailabilityGroupEntry[],
  n = 10,
): AvailabilityAnomalySummary[] {
  return summarizeAnomalies(groups, (a) => !a.systemic, (a) => a.count, n);
}

/**
 * Top-N "kolom belum pernah diisi" — anomali sistemik (≥ 95 % entitas kosong
 * di Lembaga itu) dijumlah ENTITAS-nya lintas Lembaga; `groupsAffected` =
 * berapa Lembaga yang kolom itu praktis kosong seluruhnya.
 */
export function topSystemicAnomalies(
  groups: AvailabilityGroupEntry[],
  n = 10,
): AvailabilityAnomalySummary[] {
  return summarizeAnomalies(groups, (a) => a.systemic, (a) => a.entityCount, n);
}

/**
 * Cakupan modul portfolio (#352 A1): Σ covered / Σ total hanya atas Lembaga
 * yang modulnya BERLAKU (sudah dimulai) — Lembaga yang belum memulai modul
 * tidak menyeret persennya. Modul yang belum berlaku di satu Lembaga pun →
 * pct null.
 */
export function moduleCoverageTotals(groups: AvailabilityGroupEntry[]): AvailabilityModuleSummary[] {
  const acc = new Map<string, AvailabilityModuleSummary>();
  for (const g of groups) {
    for (const m of g.moduleCoverage) {
      const e = acc.get(m.key) ?? { key: m.key, covered: 0, total: 0, pct: null, groupsApplicable: 0 };
      if (m.pct != null) {
        e.covered += m.covered;
        e.total += m.total;
        e.groupsApplicable += 1;
      }
      acc.set(m.key, e);
    }
  }
  for (const e of acc.values()) {
    e.pct = e.groupsApplicable > 0 && e.total > 0 ? round1((e.covered / e.total) * 100) : null;
  }
  return [...acc.values()];
}
