import { describe, it, expect } from "vitest";

/**
 * Unit tests untuk logika merge agregat `getFarmerGroups` (#163 — perf list).
 * Mengikuti gaya repo (lihat `access-context.test.ts`): modul asli
 * (`@/server/actions/farmer-group`) tidak diimpor karena menarik rantai
 * next-auth/prisma yang tidak resolve di environment vitest — helper di bawah
 * adalah cermin 1:1 dari blok agregasi di `getFarmerGroups` (farmer.findMany
 * ringan + landParcel.groupBy per farmerId → stats per group).
 */

interface FarmerRow {
  id: string;
  farmerGroupId: string;
}

interface ParcelAgg {
  farmerId: string;
  _count: { _all: number };
  _sum: { area: number | null };
}

interface GroupStats {
  farmersCount: number;
  parcelsCount: number;
  totalArea: number;
}

// Cermin dari farmer-group.ts `getFarmerGroups` (blok agregasi #163).
function mergeGroupStats(farmers: FarmerRow[], parcelAggs: ParcelAgg[]) {
  const farmerToGroup = new Map(farmers.map((f) => [f.id, f.farmerGroupId]));
  const stats = new Map<string, GroupStats>();
  for (const f of farmers) {
    const s = stats.get(f.farmerGroupId) ?? { farmersCount: 0, parcelsCount: 0, totalArea: 0 };
    s.farmersCount += 1;
    stats.set(f.farmerGroupId, s);
  }
  for (const p of parcelAggs) {
    const s = stats.get(farmerToGroup.get(p.farmerId) ?? "");
    if (!s) continue;
    s.parcelsCount += p._count._all;
    s.totalArea += p._sum.area ?? 0;
  }
  return stats;
}

function statsFor(stats: Map<string, GroupStats>, groupId: string): GroupStats {
  // Cermin dari return getFarmerGroups: default 0 untuk group tanpa entri.
  return stats.get(groupId) ?? { farmersCount: 0, parcelsCount: 0, totalArea: 0 };
}

describe("getFarmerGroups stats merge (#163)", () => {
  it("menghitung jumlah petani per group", () => {
    const stats = mergeGroupStats(
      [
        { id: "f1", farmerGroupId: "g1" },
        { id: "f2", farmerGroupId: "g1" },
        { id: "f3", farmerGroupId: "g2" },
      ],
      []
    );
    expect(statsFor(stats, "g1").farmersCount).toBe(2);
    expect(statsFor(stats, "g2").farmersCount).toBe(1);
  });

  it("menjumlahkan persil & luas ke group pemilik via map petani→group", () => {
    const stats = mergeGroupStats(
      [
        { id: "f1", farmerGroupId: "g1" },
        { id: "f2", farmerGroupId: "g1" },
        { id: "f3", farmerGroupId: "g2" },
      ],
      [
        { farmerId: "f1", _count: { _all: 2 }, _sum: { area: 3.5 } },
        { farmerId: "f2", _count: { _all: 1 }, _sum: { area: 1.25 } },
        { farmerId: "f3", _count: { _all: 4 }, _sum: { area: null } },
      ]
    );
    expect(statsFor(stats, "g1")).toEqual({ farmersCount: 2, parcelsCount: 3, totalArea: 4.75 });
    // _sum.area null (semua lahan tanpa luas) tidak menambah totalArea.
    expect(statsFor(stats, "g2")).toEqual({ farmersCount: 1, parcelsCount: 4, totalArea: 0 });
  });

  it("mengabaikan agregat persil dari petani di luar map (nonaktif / luar scope)", () => {
    const stats = mergeGroupStats(
      [{ id: "f1", farmerGroupId: "g1" }],
      [
        { farmerId: "f1", _count: { _all: 1 }, _sum: { area: 2 } },
        { farmerId: "f-unknown", _count: { _all: 9 }, _sum: { area: 99 } },
      ]
    );
    expect(statsFor(stats, "g1")).toEqual({ farmersCount: 1, parcelsCount: 1, totalArea: 2 });
  });

  it("group tanpa petani mendapat default 0 (bukan undefined)", () => {
    const stats = mergeGroupStats([], []);
    expect(statsFor(stats, "g-kosong")).toEqual({ farmersCount: 0, parcelsCount: 0, totalArea: 0 });
  });
});

// ——— #169: Sertifikasi ISPO + Assurance SAP/MAP (status + tahun, pola RSPO #160) ———

import { farmerGroupSchema } from "@/validations/farmer-group.schema";
import { formatCertStatus } from "@/lib/farmer-group-labels";

const validBase = {
  districtId: "d1",
  name: "Lembaga Uji",
  category: "SWADAYA" as const,
};

describe("farmerGroupSchema — sertifikasi ISPO & SAP/MAP (#169)", () => {
  it("status tanpa tahun sah (semua skema)", () => {
    const r = farmerGroupSchema.safeParse({
      ...validBase,
      rspoCertStatus: "CERTIFIED",
      ispoCertStatus: "PLANNED",
      sapMapAssuranceStatus: "CERTIFIED",
    });
    expect(r.success).toBe(true);
  });

  it("tahun ISPO tanpa status ditolak (ambigu), path di ispoCertStatus", () => {
    const r = farmerGroupSchema.safeParse({ ...validBase, ispoCertYear: 2026 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.ispoCertStatus).toBeDefined();
    }
  });

  it("tahun SAP/MAP tanpa status ditolak, path di sapMapAssuranceStatus", () => {
    const r = farmerGroupSchema.safeParse({ ...validBase, sapMapAssuranceYear: 2027 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.flatten().fieldErrors.sapMapAssuranceStatus).toBeDefined();
    }
  });

  it("pasangan lengkap tahun + status sah untuk ketiga skema", () => {
    const r = farmerGroupSchema.safeParse({
      ...validBase,
      rspoCertYear: 2020,
      rspoCertStatus: "CERTIFIED",
      ispoCertYear: 2026,
      ispoCertStatus: "PLANNED",
      sapMapAssuranceYear: 2024,
      sapMapAssuranceStatus: "CERTIFIED",
    });
    expect(r.success).toBe(true);
  });
});

describe("formatCertStatus (label bersama RSPO/ISPO/SAP-MAP)", () => {
  it("CERTIFIED + tahun → tahun saja", () => {
    expect(formatCertStatus(2020, "CERTIFIED")).toBe("2020");
  });
  it("CERTIFIED tanpa tahun → Tersertifikasi", () => {
    expect(formatCertStatus(null, "CERTIFIED")).toBe("Tersertifikasi");
  });
  it("PLANNED + tahun → Plan <tahun>; tanpa tahun → Plan", () => {
    expect(formatCertStatus(2026, "PLANNED")).toBe("Plan 2026");
    expect(formatCertStatus(null, "PLANNED")).toBe("Plan");
  });
  it("tanpa status → em dash", () => {
    expect(formatCertStatus(null, null)).toBe("—");
    expect(formatCertStatus(2026, null)).toBe("—");
  });
});
