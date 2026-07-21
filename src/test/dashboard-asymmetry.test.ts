import { describe, it, expect } from "vitest";
import {
  buildBmpSnapshotData,
  sumBmpGroups,
  bmpProductivity,
  type BmpRawFarmer,
  type BmpRawGroup,
  type BmpRawParcel,
  type BmpRawProduction,
} from "@/lib/bmp-dashboard-aggregation";
import { buildDashboardData, type RawFarmer, type RawGroup } from "@/lib/dashboard-aggregation";
import { trainingCoverageMatrix, trainingTotals } from "@/lib/training-dashboard-aggregation";
import type { TrainingGroupEntry } from "@/types/dashboard";

/**
 * Invarian **pembilang ≤ penyebut** untuk metrik cakupan di ketiga dashboard.
 *
 * Latar: DASH-06 sempat merilis cacat di mana pembilang cakupan (peserta) tidak
 * memfilter `farmer.isActive` maupun keanggotaan Lembaga, padahal penyebutnya
 * (jumlah petani aktif) memfilter keduanya — sel bisa tembus >100%, indikator
 * "target tercapai" jadi salah, dan drill-down terkunci. Berkas ini menahan
 * kelas cacat itu untuk **semua** dashboard, bukan hanya yang pernah kena.
 *
 * Menggantikan pemeriksaan manual lewat skrip di `scripts/local/audit-*.ts`
 * (audit 2026-07-21) supaya asimetri ketahuan di gate, bukan saat ditanya.
 */

// ── Main Dashboard ─────────────────────────────────────────────────────────

const mainGroup = (id: string): RawGroup => ({
  id,
  name: `Lembaga ${id}`,
  code: id.toUpperCase(),
  districtId: "d1",
  districtName: "Siak",
  locationLat: null,
  locationLong: null,
});

const mainFarmer = (
  id: string,
  activities: { isActive: boolean; code: string }[] = [],
): RawFarmer => ({
  id,
  farmerGroupId: "g1",
  gender: "M",
  joinedYear: 2024,
  landParcels: [],
  trainingParticipants: activities.map((a) => ({
    activity: { isActive: a.isActive, package: { code: a.code } },
  })),
});

describe("Invarian cakupan — Main Dashboard", () => {
  const PAKET_1 = "PAKET_1_BMP_PC_RSPO_NKT";

  it("cakupan pelatihan tidak pernah melebihi jumlah petani", () => {
    const data = buildDashboardData(
      [mainGroup("g1")],
      [
        mainFarmer("f1", [{ isActive: true, code: PAKET_1 }]),
        mainFarmer("f2", [{ isActive: true, code: PAKET_1 }]),
        mainFarmer("f3"),
      ],
    );
    expect(data.stats.trainingCounts.PAKET_1_BMP_PC_RSPO_NKT).toBeLessThanOrEqual(
      data.stats.totalPetani,
    );
    expect(data.stats.trainingCounts.PAKET_1_BMP_PC_RSPO_NKT).toBe(2);
  });

  it("kegiatan NONAKTIF tidak menambah pembilang", () => {
    const data = buildDashboardData(
      [mainGroup("g1")],
      [mainFarmer("f1", [{ isActive: false, code: PAKET_1 }])],
    );
    expect(data.stats.trainingCounts.PAKET_1_BMP_PC_RSPO_NKT).toBe(0);
    expect(data.stats.totalPetani).toBe(1);
  });

  it("hadir berkali-kali di paket yang sama tetap dihitung satu petani", () => {
    const data = buildDashboardData(
      [mainGroup("g1")],
      [
        mainFarmer("f1", [
          { isActive: true, code: PAKET_1 },
          { isActive: true, code: PAKET_1 },
          { isActive: true, code: PAKET_1 },
        ]),
      ],
    );
    expect(data.stats.trainingCounts.PAKET_1_BMP_PC_RSPO_NKT).toBe(1);
  });
});

// ── BMP Dashboard ──────────────────────────────────────────────────────────

const bmpGroups: BmpRawGroup[] = [
  {
    id: "g1",
    name: "Lembaga Alpha",
    code: "A1",
    category: "SWADAYA",
    districtId: "d1",
    districtName: "Distrik 1",
  },
];
const bmpFarmers: BmpRawFarmer[] = [{ id: "f1", farmerGroupId: "g1" }];
const bmpParcels: BmpRawParcel[] = [{ id: "p1", farmerId: "f1", area: 2 }];

/**
 * Produksi yang atribusi lahannya putus: `pX` tidak ada di daftar lahan aktif —
 * persis yang terjadi bila bulk upload lahan membuat baris revisi baru (id baru)
 * tanpa me-*repoint* `ProductionRecord.parcelId`. Plus satu record tanpa lahan.
 */
const bmpProductionMixed: BmpRawProduction[] = [
  { farmerId: "f1", parcelId: "p1", period: "2025-01", kg: 2000 }, // ter-atribusi
  { farmerId: "f1", parcelId: "p-nonaktif", period: "2025-02", kg: 5000 }, // lahan nonaktif
  { farmerId: "f1", parcelId: null, period: "2025-03", kg: 3000 }, // tanpa lahan
];

describe("Invarian cakupan — BMP Dashboard", () => {
  const build = () =>
    sumBmpGroups(
      buildBmpSnapshotData(bmpGroups, bmpFarmers, bmpParcels, bmpProductionMixed).groups,
    );

  it("lahan ber-data tidak pernah melebihi total lahan, walau produksi menunjuk lahan tak dikenal", () => {
    const { totals } = build();
    expect(totals.lahanBerData).toBeLessThanOrEqual(totals.totalLahan);
    expect(totals.lahanBerData).toBe(1); // hanya p1; p-nonaktif & null tidak diatribusikan
    expect(totals.totalLahan).toBe(1);
  });

  it("petani melapor tidak pernah melebihi total petani", () => {
    const { totals } = build();
    expect(totals.petaniMelapor).toBeLessThanOrEqual(totals.totalPetani);
  });

  it("luas melapor hanya menjumlah lahan aktif yang dikenal", () => {
    const { totals } = build();
    expect(totals.luasMelaporHa).toBe(2); // luas p1 saja
  });

  it("KARAKTERISASI TD-022 — tonase tak ter-atribusi tetap masuk pembilang produktivitas", () => {
    // Ini BUKAN perilaku yang dibenarkan: 10 ton dibagi luas 2 ha padahal hanya
    // 2 ton yang benar-benar berasal dari lahan seluas itu → 5 Ton/Ha, bukan 1.
    // Bagian "record tanpa lahan masuk pembilang" adalah keputusan owner
    // terdokumentasi (#136); bagian "lahan nonaktif" murni celah (TD-022).
    // Test ini memaku perilaku sekarang supaya perubahannya harus disengaja —
    // saat TD-022 diputuskan & diperbaiki, angka di bawah WAJIB ikut diperbarui.
    const entry = buildBmpSnapshotData(bmpGroups, bmpFarmers, bmpParcels, bmpProductionMixed)
      .groups[0];
    const { totals } = build();

    expect(totals.produksiTon).toBe(10); // 2 + 5 + 3 ton — seluruhnya
    expect(bmpProductivity(entry)).toBe(5); // 10 ÷ 2 ha
    // Bila hanya tonase ter-atribusi yang dihitung, angkanya 2 ÷ 2 = 1 Ton/Ha.
    expect(bmpProductivity(entry)).toBeGreaterThan(1);
  });

  it("tanpa record bermasalah, produktivitas = tonase ÷ luas yang benar", () => {
    const clean: BmpRawProduction[] = [
      { farmerId: "f1", parcelId: "p1", period: "2025-01", kg: 2000 },
    ];
    const entry = buildBmpSnapshotData(bmpGroups, bmpFarmers, bmpParcels, clean).groups[0];
    expect(bmpProductivity(entry)).toBe(1); // 2 ton ÷ 2 ha
  });
});

// ── Dashboard Pelatihan ────────────────────────────────────────────────────

const trainingGroup = (overrides: Partial<TrainingGroupEntry> = {}): TrainingGroupEntry => ({
  id: "g1",
  name: "Lembaga Alpha",
  code: "A1",
  category: "SWADAYA",
  districtId: "d1",
  districtName: "Siak",
  totalFarmers: 3,
  activities: [],
  ...overrides,
});

describe("Invarian cakupan — Dashboard Pelatihan", () => {
  const wellFormed = trainingGroup({
    activities: [
      {
        id: "a1",
        packageCode: "PAKET_1_BMP_PC_RSPO_NKT",
        date: "2025-01-10",
        hasEvidence: true,
        hasLocation: true,
        participants: [
          { farmerId: "f1", gender: "M", preTestScore: null, postTestScore: null },
          { farmerId: "f2", gender: "F", preTestScore: null, postTestScore: null },
        ],
      },
    ],
  });

  it("payload sesuai kontrak: terlatih ≤ total petani", () => {
    const row = trainingCoverageMatrix([wellFormed])[0];
    expect(row.byPackage.PAKET_1_BMP_PC_RSPO_NKT).toBeLessThanOrEqual(row.totalFarmers);
    expect(row.anyPackage).toBeLessThanOrEqual(row.totalFarmers);
    expect(trainingTotals([wellFormed]).trainedFarmers).toBeLessThanOrEqual(
      trainingTotals([wellFormed]).totalFarmers,
    );
  });

  it("REGRESI — payload yang memuat peserta di luar penyebut membuat cakupan tembus >100%", () => {
    // Inilah cacat yang sempat rilis: `getTrainingDashboardView` tidak memfilter
    // `farmer.isActive` + keanggotaan Lembaga, sehingga peserta nonaktif/tamu
    // ikut menambah pembilang padahal penyebut (`_count.farmers`) tidak memuatnya.
    // Lib agregasi tidak bisa menjaga ini sendiri — kontraknya ditegakkan di
    // action. Test ini merekam KENAPA filter di action itu wajib ada.
    const contractViolated = trainingGroup({
      totalFarmers: 2,
      activities: [
        {
          id: "a1",
          packageCode: "PAKET_1_BMP_PC_RSPO_NKT",
          date: "2025-01-10",
          hasEvidence: true,
          hasLocation: true,
          participants: [
            { farmerId: "f1", gender: "M", preTestScore: null, postTestScore: null },
            { farmerId: "f2", gender: "M", preTestScore: null, postTestScore: null },
            // Petani nonaktif / anggota Lembaga lain — TIDAK ada di penyebut.
            { farmerId: "f-luar", gender: "F", preTestScore: null, postTestScore: null },
          ],
        },
      ],
    });

    const row = trainingCoverageMatrix([contractViolated])[0];
    expect(row.byPackage.PAKET_1_BMP_PC_RSPO_NKT).toBe(3);
    expect(row.totalFarmers).toBe(2);
    expect(row.byPackage.PAKET_1_BMP_PC_RSPO_NKT).toBeGreaterThan(row.totalFarmers); // 150%
  });

  it("hadir berkali-kali tetap satu petani — pembilang tidak menggelembung", () => {
    const repeat = trainingGroup({
      activities: ["a1", "a2", "a3"].map((id) => ({
        id,
        packageCode: "PAKET_1_BMP_PC_RSPO_NKT" as const,
        date: "2025-01-10",
        hasEvidence: true,
        hasLocation: true,
        participants: [
          { farmerId: "f1", gender: "M" as const, preTestScore: null, postTestScore: null },
        ],
      })),
    });
    const row = trainingCoverageMatrix([repeat])[0];
    expect(row.byPackage.PAKET_1_BMP_PC_RSPO_NKT).toBe(1);
    expect(row.anyPackage).toBeLessThanOrEqual(row.totalFarmers);
  });
});

// ── Invarian di sisi penulisan data (hulu) ─────────────────────────────────

/**
 * Kedua invarian di bawah ditegakkan di server action, bukan di lib agregasi.
 * Action tidak diimpor di vitest (menarik rantai next-auth), jadi mengikuti gaya
 * `rbac-server-guards.test.ts`: logika keputusannya di-mirror lalu diverifikasi.
 */
describe("Invarian hulu — peserta wajib anggota Lembaga penyelenggara (TD-023)", () => {
  // Mirror dari `addParticipants` (training.ts): peserta divalidasi ke
  // `farmerGroupId: activity.farmerGroupId`, dan seluruh batch ditolak bila ada
  // satu pun yang tidak cocok.
  const validateParticipants = (
    activityGroupId: string,
    farmers: { id: string; farmerGroupId: string; isActive: boolean }[],
    requested: string[],
  ): { ok: true } | { ok: false; error: string } => {
    const valid = farmers.filter(
      (f) => requested.includes(f.id) && f.isActive && f.farmerGroupId === activityGroupId,
    );
    return valid.length === requested.length
      ? { ok: true }
      : { ok: false, error: "Terdapat petani yang tidak valid untuk lembaga petani pelatihan ini" };
  };

  const FARMERS = [
    { id: "f1", farmerGroupId: "g1", isActive: true },
    { id: "f2", farmerGroupId: "g1", isActive: true },
    { id: "f-lain", farmerGroupId: "g2", isActive: true },
    { id: "f-nonaktif", farmerGroupId: "g1", isActive: false },
  ];

  it("menerima peserta yang memang anggota aktif Lembaga penyelenggara", () => {
    expect(validateParticipants("g1", FARMERS, ["f1", "f2"])).toEqual({ ok: true });
  });

  it("menolak peserta dari Lembaga lain — sumber divergensi Main vs DASH-06", () => {
    // Karena ditolak di hulu, definisi petani-sentris (Main) dan kegiatan-sentris
    // (DASH-06) tidak bisa berbeda: himpunan peserta selalu ⊆ anggota Lembaga.
    expect(validateParticipants("g1", FARMERS, ["f1", "f-lain"]).ok).toBe(false);
  });

  it("menolak petani nonaktif", () => {
    expect(validateParticipants("g1", FARMERS, ["f-nonaktif"]).ok).toBe(false);
  });

  it("menolak seluruh batch bila ada satu peserta tak valid, bukan diam-diam melewatinya", () => {
    const r = validateParticipants("g1", FARMERS, ["f1", "f2", "f-lain"]);
    expect(r.ok).toBe(false);
    expect(r).toHaveProperty("error");
  });
});

describe("Invarian hulu — revisi lahan memindahkan produksi (TD-022)", () => {
  /**
   * Mirror dari `bulk-upload-parcel.ts`: saat lahan duplikat dengan geometry
   * berbeda diunggah, baris lama dinonaktifkan, baris baru dibuat, dan seluruh
   * `ProductionRecord.parcelId` lama dipindahkan ke id baru.
   */
  const applyRevision = (
    parcels: { id: string; isActive: boolean }[],
    production: { id: string; parcelId: string | null }[],
    oldId: string,
    newId: string,
  ) => {
    const nextParcels = parcels.map((p) => (p.id === oldId ? { ...p, isActive: false } : p));
    nextParcels.push({ id: newId, isActive: true });
    const nextProduction = production.map((r) =>
      r.parcelId === oldId ? { ...r, parcelId: newId } : r,
    );
    return { parcels: nextParcels, production: nextProduction };
  };

  it("produksi ikut pindah ke lahan revisi — tidak ada record yang menunjuk lahan nonaktif", () => {
    const after = applyRevision(
      [{ id: "p1", isActive: true }],
      [
        { id: "r1", parcelId: "p1" },
        { id: "r2", parcelId: "p1" },
      ],
      "p1",
      "p1-rev2",
    );

    expect(after.production.every((r) => r.parcelId === "p1-rev2")).toBe(true);

    // Invarian TD-022: tidak boleh ada produksi yang menunjuk lahan nonaktif,
    // karena tonasenya akan masuk pembilang tanpa luasnya masuk penyebut.
    const activeIds = new Set(after.parcels.filter((p) => p.isActive).map((p) => p.id));
    const orphan = after.production.filter((r) => r.parcelId != null && !activeIds.has(r.parcelId));
    expect(orphan).toHaveLength(0);
  });

  it("tanpa pemindahan, produksi jadi orphan — inilah cacat yang ditutup", () => {
    // Perilaku LAMA, disimpan agar alasan perbaikannya tetap terbaca.
    const parcels = [
      { id: "p1", isActive: false },
      { id: "p1-rev2", isActive: true },
    ];
    const production = [{ id: "r1", parcelId: "p1" }];
    const activeIds = new Set(parcels.filter((p) => p.isActive).map((p) => p.id));
    const orphan = production.filter((r) => r.parcelId != null && !activeIds.has(r.parcelId));
    expect(orphan).toHaveLength(1);
  });

  it("produksi milik lahan lain tidak ikut terpindah", () => {
    const after = applyRevision(
      [
        { id: "p1", isActive: true },
        { id: "p2", isActive: true },
      ],
      [
        { id: "r1", parcelId: "p1" },
        { id: "r2", parcelId: "p2" },
        { id: "r3", parcelId: null },
      ],
      "p1",
      "p1-rev2",
    );
    expect(after.production.find((r) => r.id === "r2")?.parcelId).toBe("p2");
    expect(after.production.find((r) => r.id === "r3")?.parcelId).toBeNull();
  });
});
