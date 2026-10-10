import { describe, expect, it } from "vitest";
import { buildFlowSegments, type ScRecord, type SupplyChainData } from "@/lib/supply-chain-flow";
import { arcCoordinates, flowLineWidth, niceTon, offtakerFilterPatch, undrawnEntities, widthScaleSamples } from "@/lib/supply-chain-map";

describe("arcCoordinates", () => {
  it("mulai di A, berakhir di B, dan melengkung ke kiri arah aliran", () => {
    const pts = arcCoordinates([0, 0], [10, 0], 0.2, 10);
    expect(pts).toHaveLength(11);
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[10]).toEqual([10, 0]);
    // Arah +x → kiri = +y: titik tengah kurva di atas sumbu.
    expect(pts[5][1]).toBeGreaterThan(0);
    expect(pts[5][1]).toBeCloseTo(1, 5); // ½ × 0,2 × 10
  });
  it("arah balik melengkung ke sisi berlawanan; titik berimpit atau bend 0 = lurus", () => {
    const back = arcCoordinates([10, 0], [0, 0], 0.2, 10);
    expect(back[5][1]).toBeLessThan(0);
    expect(arcCoordinates([1, 1], [1, 1])).toEqual([[1, 1], [1, 1]]);
    expect(arcCoordinates([0, 0], [10, 0], 0)).toEqual([[0, 0], [10, 0]]);
  });
});

describe("tebal garis & legenda", () => {
  it("flowLineWidth: 1,5 px untuk 0 t, 13,5 px untuk segmen terbesar", () => {
    expect(flowLineWidth(0, 1000)).toBe(1.5);
    expect(flowLineWidth(1000, 1000)).toBe(13.5);
    expect(flowLineWidth(250, 1000)).toBeCloseTo(7.5, 5);
  });
  it("niceTon membulatkan ke satu angka penting", () => {
    expect(niceTon(1234)).toBe(1000);
    expect(niceTon(8700)).toBe(9000);
    expect(niceTon(25347)).toBe(30000);
    expect(niceTon(0)).toBe(0);
  });
  it("widthScaleSamples: tiga contoh unik naik; contoh terbesar = tonase maksimum sebenarnya (lebar 13,5)", () => {
    const s = widthScaleSamples(25347);
    expect(s.map((x) => x.ton)).toEqual([1000, 6000, 25347]);
    expect(s[2].width).toBe(13.5);
    expect(widthScaleSamples(0)).toEqual([]);
    expect(widthScaleSamples(30).map((x) => x.ton)).toEqual([2, 8, 30]);
  });
  it("widthScaleSamples: label tak pernah melebihi maksimum dan tak ada contoh yang tampil '0 t'", () => {
    // 8.700 t dulu berlabel 9.000 t; 1,2 t dulu memunculkan contoh 0,06 t ("0 t").
    expect(widthScaleSamples(8700).map((x) => x.ton)).toEqual([400, 2000, 8700]);
    expect(widthScaleSamples(1.2).map((x) => x.ton)).toEqual([1.2]);
    for (const max of [1.2, 30, 8700, 25347]) for (const x of widthScaleSamples(max)) {
      expect(x.ton).toBeLessThanOrEqual(max);
      expect(Math.round(x.ton)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("undrawnEntities", () => {
  const rec = (over: Partial<ScRecord>): ScRecord => ({
    id: "r", year: 2025, level: "LAHAN", groupCode: "G1", surveyId: null, offtakerId: null, nextOfftakerId: null,
    millText: null, millId: "M1", millStatus: "PKS_PASTI", millBasis: "NAMA_PKS", supplyTon: 10, toUl: false, ulTon: null, flags: [],
    ...over,
  });
  const data: SupplyChainData = {
    groups: [
      { code: "G1", name: "Lembaga Satu", abrv: "L1", category: "SWADAYA", districtName: "Siak", lat: 0, lon: 100 },
      { code: "G2", name: "Lembaga Dua", abrv: "L2", category: "SWADAYA", districtName: "Siak", lat: null, lon: null },
    ],
    mills: [
      { id: "M1", umlId: null, name: "Ada", company: "ADA", district: null, lat: 0, lon: 101, rspoStatus: null, source: "UML", buyerPrograms: [] },
      { id: "M2", umlId: null, name: "Tanpa Titik", company: "TANPA TITIK", district: null, lat: null, lon: null, rspoStatus: null, source: "MANUAL", buyerPrograms: [] },
    ],
    offtakers: [
      { id: "AGN-1", name: "Agen A", type: "AGEN", district: "Siak", lat: null, lon: null, farmerGroupCode: null },
      { id: "KOP-1", name: "L1", type: "KOPERASI", district: "Siak", lat: null, lon: null, farmerGroupCode: "G1" },
      { id: "RMP-1", name: "RAMP R", type: "RAMP", district: "Siak", lat: 0, lon: 100.5, farmerGroupCode: null },
    ],
    records: [],
  };
  it("mengumpulkan Mill/Lembaga/offtaker tanpa titik beserta tonasenya, urut tonase", () => {
    const u = undrawnEntities(data, [
      rec({ id: "a", millId: "M2", supplyTon: 5 }),
      rec({ id: "b", millId: "M2", supplyTon: 20, groupCode: "G2" }),
      rec({ id: "c", offtakerId: "AGN-1", nextOfftakerId: "RMP-1", supplyTon: 7 }),
      rec({ id: "d", offtakerId: "KOP-1", supplyTon: 3 }), // koperasi = Lembaga bertitik → bukan tanpa titik
      rec({ id: "e", supplyTon: null, millId: "M2" }), // tanpa tonase diabaikan
    ]);
    // Record b (Mill tanpa titik + Lembaga tanpa titik) masuk bucket Mill saja — pola buildFlowSegments.
    expect(u.mills).toEqual([{ id: "M2", name: "Tanpa Titik", ton: 25 }]);
    expect(u.groups).toEqual([]);
    expect(u.offtakers).toEqual([{ id: "AGN-1", name: "Agen A", type: "AGEN", ton: 7 }]);
  });
  it("mode Ringkas (tanpa offtaker) tidak melaporkan offtaker", () => {
    expect(undrawnEntities(data, [rec({ offtakerId: "AGN-1" })], { viaOfftakers: false }).offtakers).toEqual([]);
  });
});

describe("review 2026-10-10 — satu aturan titik singgah & filter offtaker", () => {
  const rec = (over: Partial<ScRecord>): ScRecord => ({
    id: "r", year: 2025, level: "DEALER", groupCode: "G1", surveyId: null, offtakerId: null, nextOfftakerId: null,
    millText: null, millId: "M1", millStatus: "PKS_PASTI", millBasis: "NAMA_PKS", supplyTon: 10, toUl: false, ulTon: null, flags: [],
    ...over,
  });
  const data: SupplyChainData = {
    groups: [
      { code: "G1", name: "Lembaga Satu", abrv: "L1", category: "SWADAYA", districtName: "Siak", lat: 0, lon: 100 },
      { code: "G2", name: "Lembaga Dua", abrv: "L2", category: "SWADAYA", districtName: "Siak", lat: null, lon: null },
    ],
    mills: [
      { id: "M1", umlId: null, name: "Ada", company: "ADA", district: null, lat: 0, lon: 101, rspoStatus: null, source: "UML", buyerPrograms: [] },
      { id: "M2", umlId: null, name: "Tanpa Titik", company: "TANPA TITIK", district: null, lat: null, lon: null, rspoStatus: null, source: "MANUAL", buyerPrograms: [] },
    ],
    offtakers: [
      { id: "AGN-1", name: "Agen A", type: "AGEN", district: "Siak", lat: null, lon: null, farmerGroupCode: null },
      { id: "KUD-1", name: "KUD K", type: "KOPERASI", district: "Siak", lat: null, lon: null, farmerGroupCode: null },
      { id: "RMP-1", name: "RAMP R", type: "RAMP", district: "Siak", lat: 0, lon: 100.5, farmerGroupCode: null },
    ],
    records: [],
  };
  const offs = new Map(data.offtakers.map((o) => [o.id, o]));

  it("undrawnEntities memakai bucket buildFlowSegments: satu record satu bucket, offtaker hanya dari record yang tergambar", () => {
    const records = [
      rec({ id: "a", groupCode: "G2", millId: "M2", offtakerId: "AGN-1", supplyTon: 20 }), // Mill tanpa titik → hanya bucket Mill
      rec({ id: "b", groupCode: "G2", offtakerId: "AGN-1", supplyTon: 5 }), // Lembaga tanpa titik → hanya bucket Lembaga
      rec({ id: "c", millId: null, millStatus: "TIDAK_DIKETAHUI", offtakerId: "AGN-1", supplyTon: 4 }), // Mill tak diketahui → tak ada nama
      rec({ id: "d", offtakerId: "AGN-1", nextOfftakerId: "KUD-1", supplyTon: 7 }), // tergambar; KUD kedua (non-RAMP) ikut dilompati
    ];
    const u = undrawnEntities(data, records);
    const { undrawn } = buildFlowSegments(data, records);
    expect(u.mills).toEqual([{ id: "M2", name: "Tanpa Titik", ton: 20 }]);
    expect(u.groups).toEqual([{ code: "G2", abrv: "L2", ton: 5 }]);
    expect(u.offtakers.map((o) => [o.id, o.ton])).toEqual([["AGN-1", 7], ["KUD-1", 7]]);
    expect(u.mills.reduce((a, m) => a + m.ton, 0)).toBe(undrawn.millWithoutPointTon);
    expect(u.groups.reduce((a, g) => a + g.ton, 0)).toBe(undrawn.groupWithoutPointTon);
    expect(u.offtakers).toHaveLength(undrawn.offtakersWithoutPoint);
  });

  it("offtakerFilterPatch: patch hanya bila filter benar-benar menangkap record offtaker itu", () => {
    expect(offtakerFilterPatch("AGN-1", [rec({ offtakerId: "AGN-1" })], offs)).toEqual({ agen: "AGN-1" });
    expect(offtakerFilterPatch("RMP-1", [rec({ offtakerId: "AGN-1", nextOfftakerId: "RMP-1" })], offs)).toEqual({ ramp: "RMP-1" });
    // KUD hanya sebagai offtaker kedua non-RAMP: filter agen/ramp tak bisa menangkapnya → null (tombol disembunyikan).
    expect(offtakerFilterPatch("KUD-1", [rec({ offtakerId: "AGN-1", nextOfftakerId: "KUD-1" })], offs)).toBeNull();
  });
});
