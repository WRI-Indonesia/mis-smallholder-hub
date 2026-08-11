// Logika murni Komparasi Data Acuan (#243) — tanpa akses DB agar mudah diuji.
//
// Konvensi angka MIS identik dengan dashboard:
// - Petani: petani aktif per lembaga.
// - Persil/Luas: persil aktif milik petani aktif.
// - Training per paket: distinct petani, lembaga kegiatan = lembaga petani
//   (pola dashboard-training.ts).
// - Produksi: distinct petani punya minimal satu record produksi aktif.
// Selisih = acuan − MIS (positif = MIS masih kurang dari acuan).

import type { DashboardPackageCode } from "@/types/dashboard";
import type {
  BenchmarkComparisonRow,
  BenchmarkComparisonView,
  BenchmarkDistrictSection,
  BenchmarkMetricKey,
  BenchmarkMisValues,
  BenchmarkReferenceValues,
} from "@/types/benchmark-comparison";

export const BENCHMARK_METRICS: {
  key: BenchmarkMetricKey;
  label: string;
  /** true = angka desimal (2 digit); false = bilangan bulat. */
  decimal: boolean;
}[] = [
  { key: "farmerCount", label: "Petani", decimal: false },
  { key: "parcelCount", label: "Persil Lahan", decimal: false },
  { key: "areaHa", label: "Luas Lahan (ha)", decimal: true },
  { key: "trainingP1", label: "Training Paket 1", decimal: false },
  { key: "trainingP2Mk", label: "Training Paket 2-MK", decimal: false },
  { key: "trainingP2K3", label: "Training Paket 2-K3", decimal: false },
  { key: "trainingP34", label: "Training Paket 3&4", decimal: false },
  { key: "productionFarmerCount", label: "Produksi (petani)", decimal: false },
];

/** Toleransi pembulatan luas — selisih di bawah ini dianggap 0. */
const EPSILON = 0.005;

export const TRAINING_METRIC_BY_PACKAGE: Record<DashboardPackageCode, BenchmarkMetricKey> = {
  PAKET_1_BMP_PC_RSPO_NKT: "trainingP1",
  PAKET_2_MK: "trainingP2Mk",
  PAKET_2_K3: "trainingP2K3",
  PAKET_3_4_GEDSI_FINANCIAL_LIVELIHOOD_BUSDEV: "trainingP34",
};

export interface MisAggregationInput {
  groupIds: string[];
  /** Petani aktif: id → lembaga. */
  farmers: { id: string; farmerGroupId: string }[];
  /** Persil aktif milik petani aktif. */
  parcels: { farmerId: string; area: number | null }[];
  /** Partisipasi aktif (kegiatan aktif) — difilter lembaga di sini. */
  trainingParticipations: {
    farmerId: string;
    activityFarmerGroupId: string;
    packageCode: string;
  }[];
  /** Petani (distinct) yang punya record produksi aktif. */
  productionFarmerIds: string[];
}

function emptyMis(): BenchmarkMisValues {
  return {
    farmerCount: 0,
    parcelCount: 0,
    areaHa: 0,
    trainingP1: 0,
    trainingP2Mk: 0,
    trainingP2K3: 0,
    trainingP34: 0,
    productionFarmerCount: 0,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Hitung agregat MIS per lembaga dari baris mentah hasil query. */
export function aggregateMisMetrics(input: MisAggregationInput): Map<string, BenchmarkMisValues> {
  const byGroup = new Map<string, BenchmarkMisValues>();
  for (const id of input.groupIds) byGroup.set(id, emptyMis());

  const farmerGroupById = new Map<string, string>();
  for (const f of input.farmers) {
    farmerGroupById.set(f.id, f.farmerGroupId);
    const mis = byGroup.get(f.farmerGroupId);
    if (mis) mis.farmerCount += 1;
  }

  for (const p of input.parcels) {
    const groupId = farmerGroupById.get(p.farmerId);
    const mis = groupId ? byGroup.get(groupId) : undefined;
    if (!mis) continue;
    mis.parcelCount += 1;
    mis.areaHa += p.area ?? 0;
  }

  // Distinct petani per paket; lembaga kegiatan harus = lembaga petani
  // (partisipasi lintas lembaga tidak dihitung — konvensi dashboard).
  const seen = new Set<string>();
  for (const t of input.trainingParticipations) {
    const metricKey = TRAINING_METRIC_BY_PACKAGE[t.packageCode as DashboardPackageCode];
    if (!metricKey) continue;
    const farmerGroupId = farmerGroupById.get(t.farmerId);
    if (!farmerGroupId || farmerGroupId !== t.activityFarmerGroupId) continue;
    const dedupKey = `${t.farmerId}|${metricKey}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    const mis = byGroup.get(farmerGroupId);
    if (mis) mis[metricKey] += 1;
  }

  const producers = new Set(input.productionFarmerIds);
  for (const farmerId of producers) {
    const groupId = farmerGroupById.get(farmerId);
    const mis = groupId ? byGroup.get(groupId) : undefined;
    if (mis) mis.productionFarmerCount += 1;
  }

  for (const mis of byGroup.values()) mis.areaHa = round2(mis.areaHa);
  return byGroup;
}

export interface ComparisonGroupInput {
  id: string;
  code: string | null;
  abrv: string | null;
  name: string;
  district: { id: string; name: string };
}

export interface ComparisonBenchmarkInput extends BenchmarkReferenceValues {
  farmerGroupId: string;
  notes: string | null;
}

function formatDiff(value: number, decimal: boolean): string {
  return decimal ? String(round2(value)) : String(value);
}

/** Ambil 8 nilai metrik dari baris benchmark (buang farmerGroupId/notes/kolom lain). */
function pickReferenceValues(benchmark: ComparisonBenchmarkInput): BenchmarkReferenceValues {
  const values = {} as BenchmarkReferenceValues;
  for (const metric of BENCHMARK_METRICS) values[metric.key] = benchmark[metric.key];
  return values;
}

/** Susun view komparasi: baris per lembaga, seksi per distrik, total per seksi. */
export function buildComparisonView(
  groups: ComparisonGroupInput[],
  misByGroup: Map<string, BenchmarkMisValues>,
  benchmarks: ComparisonBenchmarkInput[]
): BenchmarkComparisonView {
  const benchmarkByGroup = new Map(benchmarks.map((b) => [b.farmerGroupId, b]));
  const sections = new Map<string, BenchmarkDistrictSection>();
  let groupsWithDiff = 0;

  for (const group of groups) {
    const mis = misByGroup.get(group.id) ?? emptyMis();
    const benchmark = benchmarkByGroup.get(group.id);
    const reference: BenchmarkReferenceValues | null = benchmark
      ? pickReferenceValues(benchmark)
      : null;

    const diff = {} as BenchmarkComparisonRow["diff"];
    const diffSummary: string[] = [];
    for (const metric of BENCHMARK_METRICS) {
      const refValue = reference?.[metric.key] ?? null;
      if (refValue === null) {
        diff[metric.key] = null;
        continue;
      }
      const delta = round2(refValue - mis[metric.key]);
      diff[metric.key] = Math.abs(delta) <= EPSILON ? 0 : delta;
      if (Math.abs(delta) > EPSILON) {
        diffSummary.push(`${metric.label} (${formatDiff(delta, metric.decimal)})`);
      }
    }
    if (diffSummary.length > 0) groupsWithDiff += 1;

    let section = sections.get(group.district.id);
    if (!section) {
      section = {
        districtId: group.district.id,
        districtName: group.district.name,
        rows: [],
        totals: { reference: emptyMis(), mis: emptyMis() },
      };
      sections.set(group.district.id, section);
    }
    section.rows.push({
      farmerGroupId: group.id,
      code: group.code,
      abrv: group.abrv,
      name: group.name,
      districtId: group.district.id,
      districtName: group.district.name,
      reference,
      notes: benchmark?.notes ?? null,
      mis,
      diff,
      diffSummary,
    });
    for (const metric of BENCHMARK_METRICS) {
      section.totals.mis[metric.key] = round2(section.totals.mis[metric.key] + mis[metric.key]);
      const refValue = reference?.[metric.key];
      if (refValue != null) {
        section.totals.reference[metric.key] = round2(
          section.totals.reference[metric.key] + refValue
        );
      }
    }
  }

  const orderedSections = [...sections.values()].sort((a, b) =>
    a.districtName.localeCompare(b.districtName, "id")
  );
  for (const section of orderedSections) {
    section.rows.sort((a, b) => (a.code ?? "").localeCompare(b.code ?? "") || a.name.localeCompare(b.name, "id"));
  }

  return { sections: orderedSections, groupsWithDiff, totalGroups: groups.length };
}

/**
 * Terapkan hasil simpan acuan ke view yang sudah ada TANPA menunggu refresh
 * server (update optimistis di client). View di-rebuild dengan perhitungan
 * yang sama persis, jadi hasilnya identik dengan render server berikutnya.
 */
export function applySavedBenchmark(
  view: BenchmarkComparisonView,
  saved: ComparisonBenchmarkInput
): BenchmarkComparisonView {
  const groups: ComparisonGroupInput[] = [];
  const misByGroup = new Map<string, BenchmarkMisValues>();
  const benchmarks: ComparisonBenchmarkInput[] = [];

  for (const section of view.sections) {
    for (const row of section.rows) {
      groups.push({
        id: row.farmerGroupId,
        code: row.code,
        abrv: row.abrv,
        name: row.name,
        district: { id: row.districtId, name: row.districtName },
      });
      misByGroup.set(row.farmerGroupId, row.mis);
      if (row.farmerGroupId === saved.farmerGroupId) {
        benchmarks.push(saved);
      } else if (row.reference) {
        benchmarks.push({ farmerGroupId: row.farmerGroupId, notes: row.notes, ...row.reference });
      }
    }
  }

  return buildComparisonView(groups, misByGroup, benchmarks);
}
