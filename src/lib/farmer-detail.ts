// #172 — Pure aggregation for the Petani 360° detail page (pola #171).
// Kept free of Prisma/Next imports so it is directly unit-testable.

import { deriveFarmerSubGroups, type FarmerSubGroups } from "@/lib/farmer-sub-groups";
import { NIK_REGEX } from "@/lib/data-completeness";
import {
  buildProductionStats,
  type AvailabilityDistribution,
  type ProductionYearRow,
} from "@/lib/production-stats";

export interface FarmerDetailRawParcel {
  /** LandParcel.id (db). */
  id: string;
  /** Kode lahan human-facing. */
  parcelId: string;
  area: number | null;
  subGroupLv1: string | null;
  subGroupLv2: string | null;
  blok: string | null;
  plantingYear: number | null;
  cropType: string | null;
  landStatus: string | null;
  revision: number;
}

export interface FarmerDetailRawParticipation {
  id: string;
  packageCode: string;
  packageName: string;
  trainingDate: Date;
  location: string | null;
  preTestScore: number | null;
  postTestScore: number | null;
}

export interface FarmerDetailRawInput {
  nik: string | null;
  address: string | null;
  birthPlace: string | null;
  birthDate: Date | null;
  joinedYear: number | null;
  landParcels: FarmerDetailRawParcel[];
  trainingParticipants: FarmerDetailRawParticipation[];
  productionRecords: { parcelId: string | null; period: string; yieldKg: number }[];
}

export interface ProfileCompleteness {
  complete: number;
  total: number;
  /** Label field yang belum terisi/valid (Bahasa Indonesia, untuk sub-teks card). */
  missing: string[];
}

export interface FarmerTrainingChecklistItem {
  code: string;
  label: string;
  done: boolean;
  /** Jumlah partisipasi petani pada paket ini. */
  participations: number;
}

export interface FarmerDetailData {
  summary: {
    totalParcels: number;
    totalArea: number;
    productionTotalKg: number;
    productionYears: number[];
    packagesDone: number;
    packagesTotal: number;
    profile: ProfileCompleteness;
    /** Produktivitas tahun terakhir ber-data (#166); null bila belum ada. */
    lastProductivity: { year: number; tonHa: number } | null;
  };
  subGroups: FarmerSubGroups;
  pelatihan: {
    checklist: FarmerTrainingChecklistItem[];
    /** Riwayat partisipasi, terbaru dulu. */
    history: FarmerDetailRawParticipation[];
  };
  produksi: {
    perYear: ProductionYearRow[];
    availability: AvailabilityDistribution;
  };
}

const round2 = (n: number) => parseFloat(n.toFixed(2));

/** Cek kelengkapan profil petani — basis card "Kelengkapan Profil" (#172). */
export function computeProfileCompleteness(f: {
  nik: string | null;
  address: string | null;
  birthPlace: string | null;
  birthDate: Date | null;
  joinedYear: number | null;
}): ProfileCompleteness {
  const checks: { label: string; complete: boolean }[] = [
    { label: "NIK valid", complete: f.nik != null && NIK_REGEX.test(f.nik) },
    { label: "Alamat", complete: !!f.address?.trim() },
    { label: "Tempat lahir", complete: !!f.birthPlace?.trim() },
    { label: "Tanggal lahir", complete: f.birthDate != null },
    { label: "Tahun bergabung", complete: f.joinedYear != null },
  ];
  return {
    complete: checks.filter((c) => c.complete).length,
    total: checks.length,
    missing: checks.filter((c) => !c.complete).map((c) => c.label),
  };
}

/**
 * Susun seluruh data halaman detail Petani dari satu fetch ter-scope.
 * Semua input sudah difilter aktif + milik satu petani oleh caller.
 */
export function buildFarmerDetail(
  farmer: FarmerDetailRawInput,
  trainingPackages: { code: string; name: string }[]
): FarmerDetailData {
  const totalArea = farmer.landParcels.reduce((s, p) => s + (p.area ?? 0), 0);

  const prodStats = buildProductionStats(
    farmer.landParcels.map((p) => ({ id: p.id, area: p.area })),
    farmer.productionRecords
  );

  const checklist: FarmerTrainingChecklistItem[] = trainingPackages.map((pkg) => {
    const participations = farmer.trainingParticipants.filter((tp) => tp.packageCode === pkg.code);
    return {
      code: pkg.code,
      label: pkg.name,
      done: participations.length > 0,
      participations: participations.length,
    };
  });

  const history = [...farmer.trainingParticipants].sort(
    (a, b) => b.trainingDate.getTime() - a.trainingDate.getTime()
  );

  const latestYear = prodStats.perYear[0] ?? null;

  return {
    summary: {
      totalParcels: farmer.landParcels.length,
      totalArea: round2(totalArea),
      productionTotalKg: prodStats.totalKg,
      productionYears: prodStats.years,
      packagesDone: checklist.filter((c) => c.done).length,
      packagesTotal: checklist.length,
      profile: computeProfileCompleteness(farmer),
      lastProductivity: latestYear
        ? { year: latestYear.year, tonHa: latestYear.productivityTonHa }
        : null,
    },
    subGroups: deriveFarmerSubGroups(farmer.landParcels),
    pelatihan: { checklist, history },
    produksi: { perYear: prodStats.perYear, availability: prodStats.availability },
  };
}
