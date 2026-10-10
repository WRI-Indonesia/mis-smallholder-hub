import { describe, expect, it } from "vitest";
import type { ScRecord, SupplyChainData } from "@/lib/supply-chain-flow";
import { UNKNOWN_MILL_FILTER } from "@/lib/supply-chain-flow";
import { ALL_KEY, distanceStats, groupVolumes, millKey, recordDistanceKm, supplyChainInsights } from "@/lib/supply-chain-insights";
import { supplyChainExportFilename, supplyChainExportSheets } from "@/lib/supply-chain-xlsx";

const rec = (over: Partial<ScRecord>): ScRecord => ({
  id: "r", year: 2025, level: "LAHAN", groupCode: "G1", surveyId: null, offtakerId: null, nextOfftakerId: null,
  millText: null, millId: "M1", millStatus: "PKS_PASTI", millBasis: "NAMA_PKS", supplyTon: 10, toUl: false, ulTon: null, flags: [],
  ...over,
});

// Koordinat sederhana di khatulistiwa: 1° bujur ≈ 111,2 km.
const data: SupplyChainData = {
  groups: [
    { code: "G1", name: "Lembaga Satu", abrv: "L1", category: "SWADAYA", districtName: "Siak", lat: 0, lon: 100 },
    { code: "G2", name: "Lembaga Dua", abrv: "L2", category: "EX_PLASMA", districtName: "Rokan Hulu", lat: 0, lon: 102 },
    { code: "G3", name: "Lembaga Tiga", abrv: "L3", category: "SWADAYA", districtName: "Siak", lat: null, lon: null },
  ],
  mills: [
    { id: "M1", umlId: "PO1", name: "SEI BUATAN", company: "PERKEBUNAN NUSANTARA V", district: "Siak", lat: 0, lon: 101, rspoStatus: null, source: "UML", buyerPrograms: ["UL"] },
    { id: "M2", umlId: null, name: "Karya Cipta", company: "KARYA CIPTA", district: null, lat: 0, lon: 104, rspoStatus: null, source: "MANUAL", buyerPrograms: [] },
    { id: "M3", umlId: null, name: "Tanpa Titik", company: "TANPA TITIK", district: null, lat: null, lon: null, rspoStatus: null, source: "MANUAL", buyerPrograms: [] },
  ],
  offtakers: [
    { id: "AGN-1", name: "Agen A", type: "AGEN", district: "Siak", lat: 0, lon: 100.5, farmerGroupCode: null },
    { id: "AGN-2", name: "Agen B", type: "AGEN", district: "Rokan Hulu", lat: null, lon: null, farmerGroupCode: null },
    { id: "RMP-1", name: "RAMP C", type: "RAMP", district: "Rokan Hulu", lat: 0, lon: 103, farmerGroupCode: null },
    { id: "KOP-3", name: "L3", type: "KOPERASI", district: "Siak", lat: null, lon: null, farmerGroupCode: "G3" },
  ],
  records: [],
};
const lk = {
  groups: new Map(data.groups.map((g) => [g.code, g])),
  offtakers: new Map(data.offtakers.map((o) => [o.id, o])),
  mills: new Map(data.mills.map((m) => [m.id, m])),
};
const DEG_KM = 111.19;

describe("recordDistanceKm", () => {
  it("menjumlah ruas Lembaga → pengumpul → RAMP → Mill; offtaker tanpa koordinat dilompati", () => {
    // G1 (100) → AGN-1 (100,5) → M1 (101): 0,5° + 0,5° = 1°.
    expect(recordDistanceKm(rec({ offtakerId: "AGN-1" }), lk)!).toBeCloseTo(DEG_KM, 0);
    // G2 (102) → AGN-2 tanpa titik (lompat) → RMP-1 (103) → M2 (104): 2°.
    expect(recordDistanceKm(rec({ groupCode: "G2", offtakerId: "AGN-2", nextOfftakerId: "RMP-1", millId: "M2" }), lk)!).toBeCloseTo(2 * DEG_KM, 0);
  });
  it("null bila Lembaga atau Mill tak berkoordinat / Mill tak diketahui", () => {
    expect(recordDistanceKm(rec({ groupCode: "G3" }), lk)).toBeNull();
    expect(recordDistanceKm(rec({ millId: "M3" }), lk)).toBeNull();
    expect(recordDistanceKm(rec({ millId: null, millStatus: "TIDAK_DIKETAHUI" }), lk)).toBeNull();
  });
});

describe("distanceStats", () => {
  const records = [
    rec({ id: "a", supplyTon: 30 }), // G1 → M1 langsung: 1°
    rec({ id: "b", groupCode: "G2", millId: "M1", supplyTon: 10 }), // G2 → M1: 1°
    rec({ id: "c", groupCode: "G2", offtakerId: "RMP-1", millId: "M2", supplyTon: 10 }), // 1° + 1° = 2°
    rec({ id: "d", groupCode: "G3", supplyTon: 50 }), // tanpa koordinat → tak terhitung
    rec({ id: "e", supplyTon: null }), // tanpa tonase → diabaikan
  ];
  it("rata-rata tertimbang tonase per kunci, maksimum, dan tonase yang terhitung", () => {
    const perMill = distanceStats(records, data, millKey);
    expect(perMill.get("M1")!.avgKm).toBeCloseTo(DEG_KM, 0);
    expect(perMill.get("M1")!.tonWithDistance).toBe(40);
    expect(perMill.get("M2")!.avgKm).toBeCloseTo(2 * DEG_KM, 0);
    const all = distanceStats(records, data, () => ALL_KEY).get(ALL_KEY)!;
    // (30·1 + 10·1 + 10·2) / 50 = 1,2°
    expect(all.avgKm).toBeCloseTo(1.2 * DEG_KM, 0);
    expect(all.maxKm).toBeCloseTo(2 * DEG_KM, 0);
    expect(all.tonWithDistance).toBe(50);
  });
  it("kosong bila tak ada record berjarak", () => {
    expect(distanceStats([rec({ groupCode: "G3" })], data, millKey).size).toBe(0);
  });
});

describe("groupVolumes", () => {
  const records = [
    rec({ id: "a", offtakerId: "AGN-1", supplyTon: 80, toUl: true }),
    rec({ id: "b", offtakerId: "RMP-1", millId: "M2", supplyTon: 20, millStatus: "PKS_BELUM_PASTI" }),
    rec({ id: "c", groupCode: "G2", supplyTon: 15, millId: null, millStatus: "TIDAK_DIKETAHUI" }),
    rec({ id: "d", groupCode: "G2", supplyTon: 5, millId: "M2", offtakerId: "AGN-2", nextOfftakerId: "RMP-1" }),
  ];
  const rows = groupVolumes(records, data);
  it("urut tonase; UL, PKS pasti, offtaker & Mill utama beserta tonasenya", () => {
    expect(rows.map((r) => r.code)).toEqual(["G1", "G2"]);
    const g1 = rows[0];
    expect(g1.ton).toBe(100);
    expect(g1.ulTon).toBe(80);
    expect(g1.pastiTon).toBe(80);
    expect(g1.offtakerCount).toBe(2);
    expect(g1.millCount).toBe(2);
    expect(g1.mainOfftaker).toMatchObject({ id: "AGN-1", name: "Agen A", type: "AGEN", ton: 80, isSelf: false });
    expect(g1.mainMill).toMatchObject({ millId: "M1", isUl: true, ton: 80 });
    // a: G1→AGN-1→M1 = 1° (80 t); b: G1→RMP-1→M2 = 3° + 1° = 4° (20 t).
    expect(g1.avgKm).toBeCloseTo(((80 * 1 + 20 * 4) / 100) * DEG_KM, 0);
  });
  it("Mill utama boleh 'tidak diketahui'; offtaker kedua ikut dihitung tanpa menjadi utama", () => {
    const g2 = rows[1];
    expect(g2.mainMill).toMatchObject({ millId: null, name: "Mill tidak diketahui", ton: 15 });
    expect(g2.offtakerCount).toBe(2); // AGN-2 + RMP-1
    expect(g2.mainOfftaker?.id).toBe("AGN-2");
  });
  it("mainOfftaker null bila semua TBS langsung ke Mill", () => {
    expect(groupVolumes([rec({ supplyTon: 10 })], data)[0].mainOfftaker).toBeNull();
  });
});

describe("supplyChainInsights", () => {
  const records = [
    rec({ id: "a", offtakerId: "AGN-1", supplyTon: 85 }), // G1: 85% lewat AGN-1 → bergantung
    rec({ id: "b", offtakerId: "RMP-1", millId: "M2", supplyTon: 15, millStatus: "PKS_BELUM_PASTI" }),
    rec({ id: "c", groupCode: "G2", offtakerId: "AGN-2", supplyTon: 30, millId: null, millStatus: "TIDAK_DIKETAHUI" }), // G2: 60% tak pasti
    rec({ id: "d", groupCode: "G2", offtakerId: "RMP-1", supplyTon: 20, millId: "M1" }),
  ];
  const ins = supplyChainInsights(records, data);
  it("kosong tanpa tonase; empat sorotan bila ada", () => {
    expect(supplyChainInsights([rec({ supplyTon: null })], data)).toEqual([]);
    expect(ins.map((i) => i.kind)).toEqual(["KONSENTRASI", "KETERGANTUNGAN", "KEPASTIAN", "JARAK"]);
  });
  it("konsentrasi: Mill terbesar dan 3 terbesar, Mill tak diketahui tak dihitung sebagai Mill", () => {
    const k = ins[0];
    if (k.kind !== "KONSENTRASI") throw new Error();
    expect(k.topMill).toMatchObject({ millId: "M1", isUl: true });
    expect(k.topShare).toBeCloseTo(105 / 150, 5);
    // Tiga Mill bernama terbesar (M1 105 + M2 15); 30 t Mill tak diketahui tidak ikut.
    expect(k.top3Share).toBeCloseTo(120 / 150, 5);
    expect(k.millCount).toBe(2);
  });
  it("koperasi Lembaga sendiri (penjualan kolektif) bukan ketergantungan", () => {
    const own = supplyChainInsights([rec({ groupCode: "G3", offtakerId: "KOP-3", supplyTon: 10 })], data)[1];
    if (own.kind !== "KETERGANTUNGAN") throw new Error();
    expect(own.groups).toEqual([]);
    expect(groupVolumes([rec({ groupCode: "G3", offtakerId: "KOP-3", supplyTon: 10 })], data)[0].mainOfftaker).toMatchObject({ id: "KOP-3", isSelf: true });
  });
  it("ketergantungan ≥ 80% lewat satu offtaker (ambang bisa diubah)", () => {
    const d = ins[1];
    if (d.kind !== "KETERGANTUNGAN") throw new Error();
    expect(d.groups).toEqual([{ code: "G1", abrv: "L1", offtakerName: "Agen A", share: 0.85 }]);
    const loose = supplyChainInsights(records, data, { dependencyThreshold: 0.6 })[1];
    if (loose.kind !== "KETERGANTUNGAN") throw new Error();
    expect(loose.groups.map((g) => g.code)).toEqual(["G1", "G2"]);
  });
  it("kepastian: porsi tanpa PKS pasti, porsi tak diketahui, Lembaga ≥ 50% tak pasti", () => {
    const k = ins[2];
    if (k.kind !== "KEPASTIAN") throw new Error();
    expect(k.uncertainShare).toBeCloseTo(45 / 150, 5);
    expect(k.unknownShare).toBeCloseTo(30 / 150, 5);
    expect(k.groups).toEqual([{ code: "G2", abrv: "L2", share: 0.6 }]);
  });
  it("jarak: rata-rata tertimbang, porsi berkoordinat, Mill terjauh", () => {
    const j = ins[3];
    if (j.kind !== "JARAK") throw new Error();
    // a: G1→AGN-1→M1 = 1° (85 t); b: G1→RMP-1→M2 = 3°+1° = 4° (15 t); c: tanpa Mill; d: G2→RMP-1→M1 = 1°+2° = 3° (20 t).
    expect(j.coveredShare).toBeCloseTo(120 / 150, 5);
    expect(j.avgKm).toBeCloseTo(((85 * 1 + 15 * 4 + 20 * 3) / 120) * DEG_KM, 0);
    expect(j.farthestMill).toMatchObject({ millId: "M2" });
    expect(j.farthestMill!.avgKm).toBeCloseTo(4 * DEG_KM, 0);
  });
  it("jarak null bila tak ada koordinat", () => {
    const j = supplyChainInsights([rec({ groupCode: "G3", supplyTon: 10 })], data)[3];
    if (j.kind !== "JARAK") throw new Error();
    expect(j.avgKm).toBeNull();
    expect(j.farthestMill).toBeNull();
  });
});

describe("review 2026-10-10", () => {
  it("konsentrasi: Mill tidak diketahui tidak ikut peringkat, walau tonasenya terbesar", () => {
    const k = supplyChainInsights([
      rec({ id: "u", millId: null, millStatus: "TIDAK_DIKETAHUI", supplyTon: 60 }),
      rec({ id: "a", millId: "M1", supplyTon: 30 }),
      rec({ id: "b", millId: "M2", supplyTon: 10 }),
    ], data)[0];
    if (k.kind !== "KONSENTRASI") throw new Error();
    expect(k.topMill).toMatchObject({ millId: "M1" });
    expect(k.topShare).toBeCloseTo(0.3, 5);
    expect(k.top3Share).toBeCloseTo(0.4, 5);
    expect(k.millCount).toBe(2);
  });
  it("konsentrasi dilewati bila semua TBS ke Mill tidak diketahui", () => {
    const ins = supplyChainInsights([rec({ millId: null, millStatus: "TIDAK_DIKETAHUI", supplyTon: 5 })], data);
    expect(ins.map((i) => i.kind)).toEqual(["KETERGANTUNGAN", "KEPASTIAN", "JARAK"]);
  });
  it("jarak mengikuti garis peta: offtaker kedua non-RAMP disinggahi, koperasi Lembaga sendiri dilewati", () => {
    const d2: SupplyChainData = {
      ...data,
      offtakers: [
        ...data.offtakers,
        { id: "KUD-9", name: "KUD", type: "KOPERASI", district: "Siak", lat: 0, lon: 103, farmerGroupCode: null },
        { id: "KOP-G1", name: "L1", type: "KOPERASI", district: "Siak", lat: 0, lon: 99, farmerGroupCode: "G1" },
      ],
    };
    const lk2 = { groups: new Map(d2.groups.map((g) => [g.code, g])), offtakers: new Map(d2.offtakers.map((o) => [o.id, o])), mills: new Map(d2.mills.map((m) => [m.id, m])) };
    // G1 (100) → AGN-1 (100,5) → KUD-9 (103) → M1 (101): 0,5 + 2,5 + 2 = 5°.
    expect(recordDistanceKm(rec({ offtakerId: "AGN-1", nextOfftakerId: "KUD-9" }), lk2)!).toBeCloseTo(5 * DEG_KM, 0);
    // Koperasi milik G1 berkoordinat sendiri (99) tetap dilewati seperti di peta: G1 → M1 = 1°.
    expect(recordDistanceKm(rec({ offtakerId: "KOP-G1" }), lk2)!).toBeCloseTo(DEG_KM, 0);
  });
  it("sheet Jalur: status PKS pasti membawa basis record yang pasti", () => {
    const rows = supplyChainExportSheets([
      rec({ id: "x", millStatus: "PKS_BELUM_PASTI", millBasis: "PKS_TERDEKAT", supplyTon: 5 }),
      rec({ id: "y", millStatus: "PKS_PASTI", millBasis: "NAMA_PKS", supplyTon: 5 }),
    ], data)[0].data;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ statusMill: "PKS pasti", basisMill: "teks survei menyebut PKS" });
  });
});

describe("supplyChainExportSheets", () => {
  const records = [
    rec({ id: "a", offtakerId: "AGN-1", supplyTon: 30, toUl: true, ulTon: 20 }),
    rec({ id: "b", offtakerId: "AGN-1", supplyTon: 10, toUl: true }),
    rec({ id: "c", groupCode: "G2", offtakerId: "AGN-2", nextOfftakerId: "RMP-1", millId: "M2", supplyTon: 20, millStatus: "PKS_BELUM_PASTI", millBasis: "PKS_TERDEKAT" }),
    rec({ id: "d", groupCode: "G2", supplyTon: 5, millId: null, millStatus: "TIDAK_DIKETAHUI", millBasis: "KOSONG" }),
  ];
  const sheets = supplyChainExportSheets(records, data);
  it("tiga sheet dengan kolom yang kuncinya ada di setiap baris", () => {
    expect(sheets.map((s) => s.name)).toEqual(["Jalur", "Mill", "Lembaga"]);
    for (const s of sheets) {
      expect(s.data.length).toBeGreaterThan(0);
      for (const row of s.data) for (const c of s.columns) expect(row).toHaveProperty(c.key);
    }
  });
  it("Jalur: agregasi Lembaga × offtaker × Mill, urut tonase, jarak & jumlah baris", () => {
    const jalur = sheets[0].data;
    expect(jalur).toHaveLength(3);
    expect(jalur[0]).toMatchObject({ kodeLembaga: "G1", offtaker1: "Agen A", offtaker1Tipe: "Agen", mill: "PTPN V · Sei Buatan", millUl: "Ya", supplyUl: "Ya", ton: 40, tonUl: 30, baris: 2, jalur: "Lewat Agen" });
    expect(jalur[0].jarakKm).toBeCloseTo(DEG_KM, 0);
    expect(jalur[1]).toMatchObject({ kodeLembaga: "G2", offtaker2: "RAMP C", offtaker2Tipe: "RAMP", statusMill: "PKS belum pasti (nama PT)", basisMill: "PKS milik PT yang terdekat dari Lembaga" });
    expect(jalur[2]).toMatchObject({ mill: "Mill tidak diketahui", statusMill: "Mill tidak diketahui", jarakKm: null });
  });
  it("Mill & Lembaga: porsi terhadap total terfilter, jarak rata-rata", () => {
    const mill = sheets[1].data;
    expect(mill[0]).toMatchObject({ mill: "PTPN V · Sei Buatan", ton: 40, porsi: 61.5, ul: "Ya", lembaga: 1, offtaker: 1 });
    expect(mill.find((m) => m.mill === "Mill tidak diketahui")).toMatchObject({ jarakRata: null });
    const lembaga = sheets[2].data;
    expect(lembaga[0]).toMatchObject({ kode: "G1", ton: 40, pctUl: 75, pctPasti: 100, offtakerUtama: "Agen A (Agen)", pctOfftakerUtama: 100, millUtama: "PTPN V · Sei Buatan" });
    expect(lembaga[1]).toMatchObject({ kode: "G2", pctPasti: 0, mill: 1, millUtama: "Karya Cipta", pctMillUtama: 80 });
  });
  it("nama berkas: tahun + filter jadi slug", () => {
    expect(supplyChainExportFilename(2025, [])).toBe("rantai-pasok_2025");
    expect(supplyChainExportFilename(2025, ["Rokan Hulu", "ICS-1408-02", UNKNOWN_MILL_FILTER])).toBe("rantai-pasok_2025_rokan-hulu_ics-1408-02_tidak-diketahui");
    expect(supplyChainExportFilename(null, [])).toBe("rantai-pasok_semua");
  });
});
