import { describe, it, expect } from "vitest";
import {
  createLandMarkerSchema,
  updateLandMarkerSchema,
  createMarkersFromPolygonSchema,
  renumberLandMarkersSchema,
  landMarkerUploadBatchSchema,
} from "@/validations/land-marker.schema";

/**
 * Skema Zod patok batas (#329). Form mengirim string (FormData) — koordinat
 * berkoma desimal harus diterima; guard "≤ 100 m dari batas" sengaja TIDAK di
 * sini (butuh geometri → action).
 */
const base = { landParcelId: "lp-1", longitude: "101,191234", latitude: "0.523456" };

describe("createLandMarkerSchema / updateLandMarkerSchema", () => {
  it("string berkoma desimal → number; kondisi bawaan NOT_INSTALLED; type '' → null", () => {
    const r = createLandMarkerSchema.safeParse({ ...base, type: "", installedAt: "", installedBy: "", notes: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.longitude).toBeCloseTo(101.191234, 6);
      expect(r.data.latitude).toBeCloseTo(0.523456, 6);
      expect(r.data.condition).toBe("NOT_INSTALLED");
      expect(r.data.type).toBeNull();
      expect(r.data.installedAt).toBeNull();
      expect(r.data.installedBy).toBeNull();
    }
  });

  it("koordinat kosong / bukan angka / di luar rentang → error per field", () => {
    const r = createLandMarkerSchema.safeParse({ ...base, latitude: "", longitude: "abc" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = r.error.flatten().fieldErrors;
      expect(e.latitude?.[0]).toMatch(/harus angka/);
      expect(e.longitude?.[0]).toMatch(/harus angka/);
    }
    const out = createLandMarkerSchema.safeParse({ ...base, latitude: "95" });
    expect(out.success).toBe(false);
    if (!out.success) expect(out.error.flatten().fieldErrors.latitude?.[0]).toMatch(/di luar rentang/);
  });

  it("kondisi/jenis di luar enum → ditolak; tanggal masa depan → ditolak", () => {
    expect(createLandMarkerSchema.safeParse({ ...base, condition: "BAGUS" }).success).toBe(false);
    expect(createLandMarkerSchema.safeParse({ ...base, type: "PLASTIC" }).success).toBe(false);
    const future = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    const r = createLandMarkerSchema.safeParse({ ...base, installedAt: future });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.flatten().fieldErrors.installedAt?.[0]).toMatch(/masa depan/);
  });

  it("update wajib markerId", () => {
    expect(updateLandMarkerSchema.safeParse({ ...base }).success).toBe(false);
    expect(updateLandMarkerSchema.safeParse({ ...base, markerId: "m-1", condition: "PRESENT" }).success).toBe(true);
  });

  it("teks: installedBy ≤ 200, notes ≤ 500", () => {
    expect(createLandMarkerSchema.safeParse({ ...base, installedBy: "x".repeat(201) }).success).toBe(false);
    expect(createLandMarkerSchema.safeParse({ ...base, notes: "x".repeat(501) }).success).toBe(false);
    expect(createLandMarkerSchema.safeParse({ ...base, notes: "x".repeat(500) }).success).toBe(true);
  });
});

describe("createMarkersFromPolygonSchema / renumberLandMarkersSchema", () => {
  it("keepSequenceNos minimal satu, bilangan bulat positif", () => {
    expect(createMarkersFromPolygonSchema.safeParse({ landParcelId: "lp", keepSequenceNos: [] }).success).toBe(false);
    expect(createMarkersFromPolygonSchema.safeParse({ landParcelId: "lp", keepSequenceNos: [0] }).success).toBe(false);
    expect(createMarkersFromPolygonSchema.safeParse({ landParcelId: "lp", keepSequenceNos: [1, 3] }).success).toBe(true);
  });

  it("order minimal satu markerId", () => {
    expect(renumberLandMarkersSchema.safeParse({ landParcelId: "lp", order: [] }).success).toBe(false);
    expect(renumberLandMarkersSchema.safeParse({ landParcelId: "lp", order: ["a", "b"] }).success).toBe(true);
  });
});

describe("landMarkerUploadBatchSchema — payload unggahan (sudah ternormalisasi klien)", () => {
  const row = { landParcelId: "lp-1", code: null, sequenceNo: null, longitude: 101.19, latitude: 0.52, condition: null, type: null, installedAt: null, installedBy: null, notes: null };

  it("baris valid; tanggal harus yyyy-mm-dd; batas 20.000 baris", () => {
    expect(landMarkerUploadBatchSchema.safeParse([row]).success).toBe(true);
    expect(landMarkerUploadBatchSchema.safeParse([{ ...row, installedAt: "01/09/2026" }]).success).toBe(false);
    expect(landMarkerUploadBatchSchema.safeParse([{ ...row, installedAt: "2026-09-01", condition: "PRESENT" }]).success).toBe(true);
    expect(landMarkerUploadBatchSchema.safeParse([{ ...row, code: "HJP-PTK-000123" }]).success).toBe(true);
    expect(landMarkerUploadBatchSchema.safeParse([{ ...row, code: "patok-1" }]).success).toBe(false);
    expect(landMarkerUploadBatchSchema.safeParse([]).success).toBe(false);
    expect(landMarkerUploadBatchSchema.safeParse(Array.from({ length: 20_001 }, () => row)).success).toBe(false);
  });
});
