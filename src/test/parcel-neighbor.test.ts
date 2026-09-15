import { describe, it, expect } from "vitest";
import {
  NEIGHBOR_DISTANCE_M,
  metersToDegrees,
  applyNeighborScope,
  capNeighbors,
  neighborOwnerLabel,
  type ParcelNeighborRaw,
} from "@/lib/parcel-neighbor";

/**
 * Helper murni lahan tetangga (#327). Aturan yang dijaga: nama di luar scope
 * dibuang di server (bukan disembunyikan UI), urutan/cap deterministik, dan
 * konversi jarak yang dipakai `ST_DWithin` pada kolom geometry (derajat).
 */
const raw = (id: string, o: Partial<ParcelNeighborRaw> = {}): ParcelNeighborRaw => ({
  id,
  parcelId: `LHN-${id}`,
  geometry: { type: "Polygon", coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
  distanceM: 0,
  overlaps: false,
  farmerName: `Petani ${id}`,
  farmerCode: `SH-${id}`,
  groupName: "Lembaga Uji",
  sameFarmer: false,
  ...o,
});

describe("metersToDegrees — ambang ST_DWithin", () => {
  it("25 m ≈ 0,000225° (1° ≈ 111,32 km di ekuator)", () => {
    expect(metersToDegrees(NEIGHBOR_DISTANCE_M)).toBeCloseTo(0.0002246, 6);
    expect(metersToDegrees(111_320)).toBeCloseTo(1, 9);
  });
});

describe("applyNeighborScope — identitas lengkap untuk semua, inScope hanya menandai tautan detail", () => {
  it("di luar scope → nama/kode petani & Lembaga TETAP (alat verifikasi lapangan), inScope=false", () => {
    const [inside, outside] = applyNeighborScope([raw("a"), raw("b")], new Set(["a"]));
    expect(inside).toMatchObject({ inScope: true, farmerName: "Petani a", farmerCode: "SH-a" });
    expect(outside).toMatchObject({ inScope: false, farmerName: "Petani b", farmerCode: "SH-b", groupName: "Lembaga Uji" });
    expect(outside.geometry).toEqual(raw("b").geometry);
  });

  it("scope kosong → semua tetangga tetap lengkap, semuanya inScope=false", () => {
    const out = applyNeighborScope([raw("a"), raw("b")], new Set());
    expect(out.every((n) => n.farmerName !== null && !n.inScope)).toBe(true);
    expect(out).toHaveLength(2);
  });
});

describe("capNeighbors — urutan jarak lalu ID, cap + omitted", () => {
  it("urut jarak menaik; jarak sama → ID lahan; omitted = sisa di luar cap", () => {
    const rows = [raw("c", { distanceM: 4.1 }), raw("b", { distanceM: 0 }), raw("a", { distanceM: 0 }), raw("d", { distanceM: 20 })];
    const { neighbors, omitted } = capNeighbors(rows, 3);
    expect(neighbors.map((n) => n.id)).toEqual(["a", "b", "c"]);
    expect(omitted).toBe(1);
  });

  it("di bawah cap → omitted 0; input tidak dimutasi", () => {
    const rows = [raw("b", { distanceM: 1 }), raw("a", { distanceM: 0 })];
    const { neighbors, omitted } = capNeighbors(rows, 12);
    expect(omitted).toBe(0);
    expect(neighbors.map((n) => n.id)).toEqual(["a", "b"]);
    expect(rows.map((n) => n.id)).toEqual(["b", "a"]);
  });
});

describe("neighborOwnerLabel", () => {
  it("lahan sendiri → 'Petani ini (lahan sendiri)'; selain itu nama petani", () => {
    expect(neighborOwnerLabel({ farmerName: "X", sameFarmer: true })).toBe("Petani ini (lahan sendiri)");
    expect(neighborOwnerLabel({ farmerName: "Budi", sameFarmer: false })).toBe("Budi");
  });
});
