import { describe, it, expect } from "vitest";
import { sharedCodeParcels, type SharedCodeHolder } from "@/lib/parcel-shared-code";

/**
 * "Juga dipakai" (UL Parcel Code di >1 lahan, 2026-09-23) — pengecualian scope
 * tercatat: ID Lahan pemakai lain selalu tampil, TAUTAN hanya dalam scope
 * (review wrap-up: versi awal menautkan lahan Lembaga lain → 404 + bocor).
 */
const holder = (parcelId: string, revId: string | null, farmerGroupId: string, districtId: string, code = "UL-1"): SharedCodeHolder => ({
  source: "MERIDIA",
  code,
  parcel: { parcelId, revisions: revId ? [{ id: revId, farmer: { farmerGroupId, farmerGroup: { districtId } } }] : [] },
});
const HOLDERS = [
  holder("APSS.0001.A", "lp-a", "kt-1", "d-1"),
  holder("ASER.0002.B", "lp-b", "kt-2", "d-2"),
  holder("TANPA.REV", null, "kt-1", "d-1"),
  holder("KODE.LAIN", "lp-c", "kt-1", "d-1", "UL-9"),
];
const CODE = { source: "MERIDIA", code: "UL-1" };

describe("sharedCodeParcels", () => {
  it("ALL: semua pemegang kode yang sama bertautan; lahan tanpa revisi aktif & kode lain dilewati", () => {
    expect(sharedCodeParcels(CODE, HOLDERS, { mode: "ALL" })).toEqual([
      { parcelId: "APSS.0001.A", id: "lp-a" },
      { parcelId: "ASER.0002.B", id: "lp-b" },
    ]);
  });

  it("BY_FARMER_GROUP: lahan Lembaga lain tetap disebut ID-nya, tanpa tautan", () => {
    expect(sharedCodeParcels(CODE, HOLDERS, { mode: "BY_FARMER_GROUP", ids: ["kt-1"] })).toEqual([
      { parcelId: "APSS.0001.A", id: "lp-a" },
      { parcelId: "ASER.0002.B", id: null },
    ]);
  });

  it("BY_DISTRICT: lewat districtId Lembaga", () => {
    expect(sharedCodeParcels(CODE, HOLDERS, { mode: "BY_DISTRICT", ids: ["d-2"] })).toEqual([
      { parcelId: "APSS.0001.A", id: null },
      { parcelId: "ASER.0002.B", id: "lp-b" },
    ]);
  });
});
