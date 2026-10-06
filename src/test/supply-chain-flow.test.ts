import { describe, expect, it } from "vitest";
import {
  buildFlowSegments,
  buildSupplyChainSankey,
  layoutSankey,
  UNKNOWN_MILL_FILTER,
  matchesSupplyChainFilter,
  millLabel,
  millVolumes,
  recordCollectorId,
  recordRampId,
  summarizeSupplyChain,
  supplyChainFilterOptions,
  type ScRecord,
  type SupplyChainData,
  type SupplyChainFilter,
} from "@/lib/supply-chain-flow";

const rec = (over: Partial<ScRecord>): ScRecord => ({
  id: "r", year: 2025, level: "LAHAN", groupCode: "G1", surveyId: null, offtakerId: null, nextOfftakerId: null,
  millText: null, millId: "M1", millStatus: "PKS_PASTI", millBasis: "NAMA_PKS", supplyTon: 10, toUl: false, ulTon: null, flags: [],
  ...over,
});

const data: SupplyChainData = {
  groups: [
    { code: "G1", name: "Lembaga Satu", abrv: "L1", category: "SWADAYA", districtName: "Siak", lat: 0.5, lon: 101.5 },
    { code: "G2", name: "Lembaga Dua", abrv: "L2", category: "EX_PLASMA", districtName: "Rokan Hulu", lat: 0.8, lon: 100.6 },
  ],
  mills: [
    { id: "M1", umlId: "PO1", name: "SEI BUATAN", company: "PERKEBUNAN NUSANTARA V", district: "Siak", lat: 0.65, lon: 101.86, rspoStatus: null, source: "UML", buyerPrograms: ["UL"] },
    { id: "M2", umlId: null, name: "Karya Cipta Nirvana", company: "KARYA CIPTA NIRVANA", district: null, lat: null, lon: null, rspoStatus: null, source: "MANUAL", buyerPrograms: [] },
  ],
  offtakers: [
    { id: "AGN-1", name: "Agen A", type: "AGEN", district: "Rokan Hulu", lat: null, lon: null, farmerGroupCode: null },
    { id: "RMP-1", name: "RAMP B", type: "RAMP", district: "Rokan Hulu", lat: 0.7, lon: 100.7, farmerGroupCode: null },
    { id: "KOP-1", name: "L1", type: "KOPERASI", district: "Siak", lat: 0.5, lon: 101.5, farmerGroupCode: "G1" },
  ],
  records: [],
};

describe("buildSupplyChainSankey", () => {
  it("menempatkan Agen di kolom 1, RAMP di kolom 2, Mill di kolom 3 dan melompati kolom kosong", () => {
    const records = [
      rec({ id: "a", groupCode: "G2", offtakerId: "AGN-1", nextOfftakerId: "RMP-1", supplyTon: 30 }),
      rec({ id: "b", groupCode: "G2", offtakerId: "RMP-1", supplyTon: 20 }),
      rec({ id: "c", groupCode: "G1", supplyTon: 5 }),
    ];
    const g = buildSupplyChainSankey(data, records, { mode: "RINCI" });
    const col = (id: string) => g.nodes.find((n) => n.id === id)?.column;
    expect(col("L:G2")).toBe(0);
    expect(col("O:AGN-1")).toBe(1);
    expect(col("O:RMP-1")).toBe(2);
    expect(col("M:M1")).toBe(3);
    // Rantai Agen → RAMP tercatat sebagai pita, RAMP langsung = pita Lembaga → RAMP (lompat kolom 1).
    expect(g.links).toContainEqual({ source: "O:AGN-1", target: "O:RMP-1", channel: "AGEN", value: 30 });
    expect(g.links).toContainEqual({ source: "L:G2", target: "O:RMP-1", channel: "RAMP", value: 20 });
    expect(g.links).toContainEqual({ source: "L:G1", target: "M:M1", channel: "LANGSUNG", value: 5 });
    expect(g.nodes.find((n) => n.id === "O:RMP-1")?.value).toBe(50);
    expect(g.totalTon).toBe(55);
  });

  it("melewati record tanpa tonase dan memetakan Mill kosong ke node 'tidak diketahui'", () => {
    const g = buildSupplyChainSankey(data, [rec({ supplyTon: null }), rec({ id: "x", millId: null, millStatus: "TIDAK_DIKETAHUI", supplyTon: 4 })]);
    expect(g.skippedRecords).toBe(1);
    expect(g.nodes.find((n) => n.id === "M:?")?.label).toBe("Mill tidak diketahui");
  });

  it("melipat kelebihan node per kolom menjadi satu node 'lain' tanpa kehilangan tonase", () => {
    const offtakers = Array.from({ length: 5 }, (_, i) => ({ id: `A${i}`, name: `Agen ${i}`, type: "AGEN" as const, district: "Siak", lat: null, lon: null, farmerGroupCode: null }));
    const d = { ...data, offtakers };
    const records = offtakers.map((o, i) => rec({ id: o.id, offtakerId: o.id, supplyTon: 10 + i }));
    const g = buildSupplyChainSankey(d, records, { mode: "RINCI", maxPerColumn: 2 });
    const other = g.nodes.find((n) => n.id === "X:1");
    expect(other?.folded).toBe(3);
    expect(other?.value).toBe(10 + 11 + 12);
    expect(g.nodes.filter((n) => n.column === 1)).toHaveLength(3);
  });
});

describe("Sankey mode Ringkas & jalur sorotan", () => {
  const records = [
    rec({ id: "a", groupCode: "G2", offtakerId: "AGN-1", nextOfftakerId: "RMP-1", supplyTon: 30 }),
    rec({ id: "b", groupCode: "G2", offtakerId: "RMP-1", supplyTon: 20 }),
    rec({ id: "c", groupCode: "G1", offtakerId: "KOP-1", supplyTon: 9 }),
  ];

  it("menggabungkan offtaker per tipe dan menghitung anggotanya", () => {
    const g = buildSupplyChainSankey(data, records);
    expect(g.nodes.map((n) => n.id).sort()).toEqual(["G:AGEN", "G:KTKOP", "G:RAMP", "L:G1", "L:G2", "M:M1"]);
    expect(g.nodes.find((n) => n.id === "G:RAMP")).toMatchObject({ column: 2, value: 50, sub: "1 RAMP" });
    expect(g.links).toContainEqual({ source: "G:AGEN", target: "G:RAMP", channel: "AGEN", value: 30 });
  });

  it("menyimpan jalur utuh sehingga sorotan bisa menelusuri hulu sampai hilir", () => {
    const g = buildSupplyChainSankey(data, records);
    const viaAgen = g.paths.find((p) => p.nodes.includes("G:AGEN"));
    expect(viaAgen?.nodes).toEqual(["L:G2", "G:AGEN", "G:RAMP", "M:M1"]);
    expect(viaAgen?.links).toHaveLength(3);
    expect(g.paths).toHaveLength(3);
  });
});

describe("Sankey asal per Distrik", () => {
  it("menggabungkan Lembaga ke node Distrik dan menghitung jumlah Lembaganya", () => {
    const g = buildSupplyChainSankey(data, [rec({ id: "a", groupCode: "G1", supplyTon: 5 }), rec({ id: "b", groupCode: "G2", supplyTon: 7 })], { origin: "DISTRIK" });
    const origin = g.nodes.filter((n) => n.column === 0);
    expect(origin.map((n) => n.id).sort()).toEqual(["D:Rokan Hulu", "D:Siak"]);
    expect(origin.find((n) => n.id === "D:Siak")).toMatchObject({ label: "Siak", sub: "1 Lembaga", value: 5 });
  });
});

describe("Sankey tujuan UL / Non-UL", () => {
  it("menggabungkan Mill per status Supply to UL, Mill kosong tetap terpisah", () => {
    const g = buildSupplyChainSankey(
      data,
      [rec({ id: "a", toUl: true, supplyTon: 5 }), rec({ id: "b", millId: "M2", supplyTon: 7 }), rec({ id: "c", millId: null, millStatus: "TIDAK_DIKETAHUI", supplyTon: 1 })],
      { destination: "UL" },
    );
    const dest = g.nodes.filter((n) => n.column === 3);
    expect(dest.map((n) => n.id).sort()).toEqual(["M:?", "U:NON_UL", "U:UL"]);
    expect(dest.find((n) => n.id === "U:UL")).toMatchObject({ value: 5, label: "Ke Mill UL" });
    expect(dest.find((n) => n.id === "U:NON_UL")).toMatchObject({ value: 7, sub: "1 Mill" });
  });
});

describe("millLabel", () => {
  it("menaruh perusahaan dulu, Title Case, tanpa pengulangan nama", () => {
    expect(millLabel({ name: "SEI BUATAN", company: "PERKEBUNAN NUSANTARA V" })).toBe("PTPN V · Sei Buatan");
    expect(millLabel({ name: "BATANG KULIM", company: "MUSIM MAS HOLDINGS PTE LTD" })).toBe("Musim Mas · Batang Kulim");
    expect(millLabel({ name: "ANUGERAH TANI MAKMUR", company: "ANUGERAH TANI MAKMUR" })).toBe("Anugerah Tani Makmur");
    expect(millLabel({ name: "ANDERSON UNEDO", company: "UNKNOWN" })).toBe("Anderson Unedo");
  });
});

describe("layoutSankey", () => {
  it("menjaga skala tonase sama di semua kolom dan tetap di dalam tinggi", () => {
    const records = [
      rec({ id: "a", groupCode: "G2", offtakerId: "AGN-1", nextOfftakerId: "RMP-1", supplyTon: 30 }),
      rec({ id: "b", groupCode: "G1", supplyTon: 10 }),
    ];
    const layout = layoutSankey(buildSupplyChainSankey(data, records), { width: 600, height: 300 });
    for (const n of layout.nodes) {
      expect(n.y0).toBeGreaterThanOrEqual(0);
      expect(n.y1).toBeLessThanOrEqual(300 + 1e-6);
    }
    const h = (id: string) => {
      const n = layout.nodes.find((x) => x.id === id)!;
      return n.y1 - n.y0;
    };
    expect(h("L:G2") / h("L:G1")).toBeCloseTo(3, 5);
    expect(h("M:M1")).toBeCloseTo(h("L:G2") + h("L:G1"), 5);
    // Lebar pita = tonase × skala yang sama.
    const link = layout.links.find((l) => l.source === "L:G2")!;
    expect(link.width).toBeCloseTo(h("L:G2"), 5);
  });

  it("kosong bila graf kosong", () => {
    expect(layoutSankey({ nodes: [], links: [], paths: [], totalTon: 0, skippedRecords: 0 }, { width: 100, height: 100 }).nodes).toEqual([]);
  });
});

describe("summarizeSupplyChain & millVolumes", () => {
  it("menghitung tonase UL dari kolom tonase UL atau seluruh supply bila hanya ditandai Yes", () => {
    const offs = new Map(data.offtakers.map((o) => [o.id, o]));
    const records = [rec({ toUl: true, ulTon: 4, supplyTon: 10 }), rec({ id: "b", toUl: true, supplyTon: 6 }), rec({ id: "c", millId: null, millStatus: "TIDAK_DIKETAHUI", supplyTon: 5 })];
    const s = summarizeSupplyChain(records, offs);
    expect(s.totalTon).toBe(21);
    expect(s.ulTon).toBe(10);
    // Salah ketik desimal (UL 30525 > supply 30,53) tak boleh menggelembungkan KPI.
    expect(summarizeSupplyChain([rec({ toUl: true, supplyTon: 30.53, ulTon: 30525 })], offs).ulTon).toBeCloseTo(30.53);
    expect(s.tonByStatus.TIDAK_DIKETAHUI).toBe(5);
    const rows = millVolumes(records, new Map(data.mills.map((m) => [m.id, m])));
    expect(rows[0]).toMatchObject({ millId: "M1", ton: 16, isUl: true, groupCount: 1 });
    expect(rows[1]).toMatchObject({ millId: null, name: "Mill tidak diketahui" });
  });
});

describe("buildFlowSegments", () => {
  it("melompati offtaker tanpa titik, tidak menggambar Mill tanpa koordinat, dan tidak membuat segmen nol untuk koperasi = Lembaga", () => {
    const records = [
      rec({ id: "a", groupCode: "G2", offtakerId: "AGN-1", nextOfftakerId: "RMP-1", supplyTon: 30 }),
      rec({ id: "b", groupCode: "G2", millId: "M2", millStatus: "PKS_BELUM_PASTI", supplyTon: 7 }),
      rec({ id: "c", groupCode: "G1", offtakerId: "KOP-1", supplyTon: 9 }),
      rec({ id: "d", groupCode: "G1", millId: null, millStatus: "TIDAK_DIKETAHUI", supplyTon: 2 }),
    ];
    const { segments, undrawn } = buildFlowSegments(data, records);
    const keys = segments.map((s) => `${s.from.key}>${s.to.key}`);
    expect(keys).toContain("L:G2>O:RMP-1");
    expect(keys).toContain("O:RMP-1>M:M1");
    expect(keys).toContain("L:G1>M:M1");
    expect(keys).not.toContain("L:G1>O:KOP-1");
    expect(undrawn).toEqual({ unknownMillTon: 2, millWithoutPointTon: 7, skippedOfftakerTon: 30, offtakersWithoutPoint: 1 });
    // Ringkas: tanpa singgah offtaker → Lembaga langsung ke Mill.
    const direct = buildFlowSegments(data, records, { viaOfftakers: false }).segments.map((x) => `${x.from.key}>${x.to.key}`);
    expect(direct).toContain("L:G2>M:M1");
    expect(direct.some((k) => k.includes("O:"))).toBe(false);
  });
});

describe("filter Lembaga / Agen / RAMP / Mill", () => {
  const offs = new Map(data.offtakers.map((o) => [o.id, o]));
  const none: SupplyChainFilter = { groupCode: null, collectorId: null, rampId: null, millId: null, ul: null };
  const records = [
    rec({ id: "a", groupCode: "G2", offtakerId: "AGN-1", nextOfftakerId: "RMP-1", supplyTon: 30 }),
    rec({ id: "b", groupCode: "G2", offtakerId: "RMP-1", millId: "M2", supplyTon: 20 }),
    rec({ id: "c", groupCode: "G1", offtakerId: "KOP-1", supplyTon: 9 }),
    rec({ id: "d", groupCode: "G1", millId: null, millStatus: "TIDAK_DIKETAHUI", supplyTon: 2 }),
  ];

  it("RAMP = offtaker pertama bertipe RAMP atau offtaker kedua; pengumpul = offtaker pertama non-RAMP", () => {
    expect(recordCollectorId(records[0], offs)).toBe("AGN-1");
    expect(recordRampId(records[0], offs)).toBe("RMP-1");
    expect(recordCollectorId(records[1], offs)).toBeNull();
    expect(recordRampId(records[1], offs)).toBe("RMP-1");
    expect(recordCollectorId(records[2], offs)).toBe("KOP-1");
  });

  it("menggabungkan filter sebagai irisan dan mengenali Mill tidak diketahui", () => {
    const ids = (f: Partial<SupplyChainFilter>) => records.filter((r) => matchesSupplyChainFilter(r, { ...none, ...f }, offs)).map((r) => r.id);
    expect(ids({ rampId: "RMP-1" })).toEqual(["a", "b"]);
    expect(ids({ rampId: "RMP-1", millId: "M1" })).toEqual(["a"]);
    expect(ids({ collectorId: "AGN-1", groupCode: "G1" })).toEqual([]);
    expect(ids({ millId: UNKNOWN_MILL_FILTER })).toEqual(["d"]);
    // UL = record ber-"Supply to UL = Yes"; Non-UL = sisanya.
    const withUl = records.map((r) => (r.id === "a" ? { ...r, toUl: true } : r));
    const ulIds = (ul: SupplyChainFilter["ul"]) => withUl.filter((r) => matchesSupplyChainFilter(r, { ...none, ul }, offs)).map((r) => r.id);
    expect(ulIds("UL")).toEqual(["a"]);
    expect(ulIds("NON_UL")).toEqual(["b", "c", "d"]);
  });

  it("pilihan dropdown bergaya faset: dihitung dari filter LAIN, bukan dirinya sendiri", () => {
    const opts = supplyChainFilterOptions(records, { ...none, rampId: "RMP-1" }, data);
    // Filter RAMP menyempitkan Lembaga/Mill…
    expect(opts.groupCode.map((o) => o.id)).toEqual(["G2"]);
    expect(opts.millId.map((o) => o.id)).toEqual(["M1", "M2"]);
    // …tetapi daftar RAMP sendiri tetap utuh agar bisa berpindah RAMP.
    expect(opts.rampId.map((o) => o.id)).toEqual(["RMP-1"]);
    const all = supplyChainFilterOptions(records, none, data);
    expect(all.millId.find((o) => o.id === UNKNOWN_MILL_FILTER)?.name).toBe("Mill tidak diketahui");
    expect(all.collectorId[0]).toMatchObject({ id: "AGN-1", ton: 30 });
  });
});
