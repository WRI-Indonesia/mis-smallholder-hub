import { describe, it, expect, vi, beforeEach } from "vitest";
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
import {
  buildAvailabilityEntry,
  availabilityTotals,
} from "@/lib/data-availability-aggregation";
import type { CompletenessFarmerInput, CompletenessGroupInput } from "@/types/data-completeness";
import type { TrainingGroupEntry } from "@/types/dashboard";

// Invarian hulu (bagian akhir berkas) diuji lewat action ASLI — `auth`/`rbac`/
// `prisma` di-mock (pola `land-marker-guard.test.ts`); prisma mock menyimpan
// baris di memori supaya filter `where` action benar-benar dievaluasi.
const hasPermission = vi.hoisted(() => vi.fn(async () => true));
vi.mock("@/lib/rbac", () => ({ hasPermission, isSuperAdmin: async () => false }));
vi.mock("@/lib/access-context", async () => ({
  ...(await vi.importActual<typeof import("@/lib/access-scope")>("@/lib/access-scope")),
  getAccessContext: async () => ({ mode: "ALL" }),
}));
vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { id: "user-1" } }) }));
vi.mock("@/lib/s3", () => ({ getPresignedUrl: async () => "https://signed" }));
vi.mock("@/lib/shapefile-server", () => ({ parseShapefileZip: vi.fn() }));

type MemFarmer = { id: string; farmerGroupId: string; isActive: boolean };
type MemParcel = { id: string; farmerId: string; parcelId: string; revision: number; geometry: unknown; isActive: boolean };
type MemProduction = { id: string; parcelId: string | null };

const mem = vi.hoisted(() => ({
  farmers: [] as MemFarmer[],
  parcels: [] as MemParcel[],
  production: [] as MemProduction[],
}));

const db = vi.hoisted(() => {
  const m = {
    trainingActivity: { findFirst: vi.fn(async () => ({ farmerGroupId: "g1" })) },
    farmer: {
      // Evaluasi `where` addParticipants: id ∈ daftar, isActive, farmerGroupId.
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] }; isActive: boolean; farmerGroupId: string } }) =>
        mem.farmers.filter((f) => where.id.in.includes(f.id) && f.isActive === where.isActive && f.farmerGroupId === where.farmerGroupId)
      ),
    },
    trainingParticipant: { findMany: vi.fn(async () => []), create: vi.fn(async () => ({})), update: vi.fn(async () => ({})) },
    landParcel: {
      findMany: vi.fn(async ({ where }: { where: { OR: { farmerId: string; parcelId: string }[] } }) =>
        mem.parcels.filter((p) => p.isActive && where.OR.some((k) => k.farmerId === p.farmerId && k.parcelId === p.parcelId))
      ),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { isActive: boolean } }) => {
        const p = mem.parcels.find((x) => x.id === where.id)!;
        p.isActive = data.isActive;
        return p;
      }),
      create: vi.fn(async ({ data }: { data: Omit<MemParcel, "id" | "isActive"> }) => {
        const row = { ...data, id: `${data.parcelId}-rev${data.revision}`, isActive: true };
        mem.parcels.push(row);
        return { id: row.id };
      }),
    },
    landParcelIdentity: { upsert: vi.fn(async () => ({ id: "uid-1" })) },
    landParcelBorder: { upsert: vi.fn() },
    productionRecord: {
      updateMany: vi.fn(async ({ where, data }: { where: { parcelId: string }; data: { parcelId: string } }) => {
        for (const r of mem.production) if (r.parcelId === where.parcelId) r.parcelId = data.parcelId;
        return { count: 0 };
      }),
    },
    tree: { updateMany: vi.fn(async () => ({ count: 0 })) },
    $transaction: vi.fn(),
  };
  m.$transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === "function" ? (arg as (tx: typeof m) => unknown)(m) : Promise.all(arg as unknown[])
  );
  return m;
});
vi.mock("@/lib/prisma", () => ({ prisma: db }));

const { addParticipants } = await import("@/server/actions/training");
const { bulkCreateLandParcels } = await import("@/server/actions/bulk-upload-parcel");

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
const bmpParcels: BmpRawParcel[] = [{ id: "p1", farmerId: "f1", area: 2, plantingYear: null }];

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
    // 10 ÷ 2 ha = 5, disetahunkan ×12/3 (data 3 bulan, owner 2026-10-08) = 20 Ton/Ha/tahun.
    expect(bmpProductivity(entry)).toBe(20);
    // Bila hanya tonase ter-atribusi yang dihitung, angkanya 2 ÷ 2 × 4 = 4 Ton/Ha/tahun.
    expect(bmpProductivity(entry)).toBeGreaterThan(4);
  });

  it("tanpa record bermasalah, produktivitas = tonase ÷ luas yang benar", () => {
    const clean: BmpRawProduction[] = [
      { farmerId: "f1", parcelId: "p1", period: "2025-01", kg: 2000 },
    ];
    const entry = buildBmpSnapshotData(bmpGroups, bmpFarmers, bmpParcels, clean).groups[0];
    expect(bmpProductivity(entry)).toBe(12); // 2 ton ÷ 2 ha, disetahunkan ×12 (data 1 bulan)
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

// ── Dashboard Ketersediaan Data ────────────────────────────────────────────

describe("Invarian skor — Dashboard Ketersediaan Data", () => {
  const daGroup = (farmers: CompletenessFarmerInput[]): CompletenessGroupInput => ({
    id: "kt-1",
    name: "KT Sukamaju",
    code: null, // profil sengaja tak lengkap agar anomali profil ikut teruji
    abrv: "SKM",
    joinYear: 2015,
    groupType: null,
    establishedYear: null,
    rspoCertYear: null,
    rspoCertStatus: null,
    ispoCertYear: null,
    ispoCertStatus: null,
    sapMapAssuranceYear: null,
    sapMapAssuranceStatus: null,
    locationLat: 1.23,
    locationLong: 103.4,
    district: { id: "d-1", name: "Distrik A" },
    activities: [],
    trainingPackages: [{ code: "PAKET_1_BMP_PC_RSPO_NKT", name: "Paket 1" }],
    farmers,
  });

  const daFarmer = (id: string, nik: string | null): CompletenessFarmerInput => ({
    id,
    farmerId: `F-${id}`,
    name: `Petani ${id}`,
    gender: null,
    nik,
    address: null,
    birthPlace: null,
    birthDate: null,
    joinedYear: null,
    landParcels: [],
    trainingParticipants: [],
    productionRecords: [],
  });

  const entries = [
    buildAvailabilityEntry(daGroup([daFarmer("f1", null), daFarmer("f2", "1234567890123456")]), {
      category: "SWADAYA",
      districtId: "d-1",
    }),
    buildAvailabilityEntry(daGroup([]), { category: "EX_PLASMA", districtId: "d-1" }),
  ];

  it("skor per-Lembaga dan portfolio selalu di rentang 0–100", () => {
    const totals = availabilityTotals(entries);
    const scores = [
      totals.overallScore,
      ...Object.values(totals.domainScores),
      ...entries.flatMap((e) => [e.healthScore, e.profileScore, ...Object.values(e.domainScores)]),
    ];
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it("skor portfolio terikat oleh min/max skor Lembaga (rata-rata tertimbang tak bisa keluar rentang)", () => {
    const totals = availabilityTotals(entries);
    const min = Math.min(...entries.map((e) => e.healthScore));
    const max = Math.max(...entries.map((e) => e.healthScore));
    // Toleransi 1 poin: healthScore per-Lembaga dibulatkan ke bilangan bulat
    // sedangkan portfolio dihitung dari skor domain sebelum pembulatan itu.
    expect(totals.overallScore).toBeGreaterThanOrEqual(min - 1);
    expect(totals.overallScore).toBeLessThanOrEqual(max + 1);
  });

  it("anomali domain petani tidak pernah melebihi jumlah petani per tipenya", () => {
    // Tiap tipe anomali petani menandai satu petani paling banyak sekali,
    // jadi count per tipe ≤ totalFarmers (penyebut kartu Petani).
    const e = entries[0];
    const petaniKeys = ["no-nik", "invalid-nik", "no-address", "no-birth-date", "no-birth-place", "no-joined-year"];
    for (const a of e.anomalies.filter((x) => petaniKeys.includes(x.key))) {
      expect(a.count).toBeLessThanOrEqual(e.totalFarmers);
      // Pembilang ≤ penyebut juga untuk entitas terdampak (pelipatan sistemik #352 tak mengubahnya).
      expect(a.entityCount).toBeLessThanOrEqual(a.total);
      expect(a.total).toBe(e.totalFarmers);
    }
  });
});

// ── Invarian di sisi penulisan data (hulu) ─────────────────────────────────

/**
 * Kedua invarian di bawah ditegakkan di server action, bukan di lib agregasi —
 * diuji lewat action asli (`addParticipants`, `bulkCreateLandParcels`).
 */
describe("Invarian hulu — peserta wajib anggota Lembaga penyelenggara (TD-023)", () => {
  // addParticipants memvalidasi peserta ke `farmerGroupId: activity.farmerGroupId`
  // (activity mock = Lembaga g1) dan menolak seluruh batch bila ada yang tak cocok.
  beforeEach(() => {
    vi.clearAllMocks();
    mem.farmers = [
      { id: "f1", farmerGroupId: "g1", isActive: true },
      { id: "f2", farmerGroupId: "g1", isActive: true },
      { id: "f-lain", farmerGroupId: "g2", isActive: true },
      { id: "f-nonaktif", farmerGroupId: "g1", isActive: false },
    ];
  });
  const add = (ids: string[]) => addParticipants("act-1", ids.map((farmerId) => ({ farmerId })));

  it("menerima peserta yang memang anggota aktif Lembaga penyelenggara", async () => {
    expect(await add(["f1", "f2"])).toEqual({ success: true });
    expect(db.trainingParticipant.create).toHaveBeenCalledTimes(2);
  });

  it("menolak peserta dari Lembaga lain — sumber divergensi Main vs DASH-06", async () => {
    // Karena ditolak di hulu, definisi petani-sentris (Main) dan kegiatan-sentris
    // (DASH-06) tidak bisa berbeda: himpunan peserta selalu ⊆ anggota Lembaga.
    expect((await add(["f1", "f-lain"])).success).toBe(false);
  });

  it("menolak petani nonaktif", async () => {
    expect((await add(["f-nonaktif"])).success).toBe(false);
  });

  it("menolak seluruh batch bila ada satu peserta tak valid, bukan diam-diam melewatinya", async () => {
    const r = await add(["f1", "f2", "f-lain"]);
    expect(r.success).toBe(false);
    expect(r).toHaveProperty("error");
    expect(db.trainingParticipant.create).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("Invarian hulu — revisi lahan memindahkan produksi (TD-022)", () => {
  // bulkCreateLandParcels: lahan duplikat dengan geometry berbeda → baris lama
  // dinonaktifkan, baris baru dibuat, `ProductionRecord.parcelId` lama dipindah.
  const square = (d: number) => ({ type: "Polygon", coordinates: [[[0, 0], [d, 0], [d, d], [0, 0]]] });
  const parcel = (id: string, parcelId: string): MemParcel => ({
    id, farmerId: "f1", parcelId, revision: 1, geometry: square(1), isActive: true,
  });
  const upload = (parcelId: string) =>
    bulkCreateLandParcels([{ farmerId: "f1", parcelId, geometry: square(2) }]);
  const orphans = () => {
    const activeIds = new Set(mem.parcels.filter((p) => p.isActive).map((p) => p.id));
    return mem.production.filter((r) => r.parcelId != null && !activeIds.has(r.parcelId));
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("produksi ikut pindah ke lahan revisi — tidak ada record yang menunjuk lahan nonaktif", async () => {
    mem.parcels = [parcel("p1", "HJP.1")];
    mem.production = [
      { id: "r1", parcelId: "p1" },
      { id: "r2", parcelId: "p1" },
    ];
    const res = await upload("HJP.1");
    expect(res.success).toBe(true);
    expect(mem.parcels.find((p) => p.id === "p1")?.isActive).toBe(false);
    expect(mem.production.every((r) => r.parcelId === "HJP.1-rev2")).toBe(true);
    // Invarian TD-022: tidak boleh ada produksi yang menunjuk lahan nonaktif,
    // karena tonasenya akan masuk pembilang tanpa luasnya masuk penyebut.
    expect(orphans()).toHaveLength(0);
  });

  it("tanpa pemindahan, produksi jadi orphan — inilah cacat yang ditutup", () => {
    // Perilaku LAMA (data statis), disimpan agar alasan perbaikannya tetap terbaca.
    mem.parcels = [
      { ...parcel("p1", "HJP.1"), isActive: false },
      { ...parcel("p1-rev2", "HJP.1"), revision: 2 },
    ];
    mem.production = [{ id: "r1", parcelId: "p1" }];
    expect(orphans()).toHaveLength(1);
  });

  it("produksi milik lahan lain tidak ikut terpindah", async () => {
    mem.parcels = [parcel("p1", "HJP.1"), parcel("p2", "HJP.2")];
    mem.production = [
      { id: "r1", parcelId: "p1" },
      { id: "r2", parcelId: "p2" },
      { id: "r3", parcelId: null },
    ];
    await upload("HJP.1");
    expect(mem.production.find((r) => r.id === "r1")?.parcelId).toBe("HJP.1-rev2");
    expect(mem.production.find((r) => r.id === "r2")?.parcelId).toBe("p2");
    expect(mem.production.find((r) => r.id === "r3")?.parcelId).toBeNull();
  });
});
