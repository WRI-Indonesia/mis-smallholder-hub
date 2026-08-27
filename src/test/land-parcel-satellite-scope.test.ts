import { describe, it, expect } from "vitest";

/**
 * Scope RBAC satelit lahan (#296/#297). Mengikuti gaya repo
 * (`access-context.test.ts`): modul asli tidak diimpor (rantai next-auth),
 * helper di bawah adalah cermin 1:1 dari `access-context.ts` dan dari
 * where-fragment yang dipakai `src/server/actions/land-parcel-satellite.ts`
 * dan `getLandParcelSatellites` (`land-parcel.ts`).
 */

type AccessContext =
  | { mode: "ALL" }
  | { mode: "BY_FARMER_GROUP"; ids: string[] }
  | { mode: "BY_DISTRICT"; ids: string[] };

// Cermin `farmerAccessFilter` (query pada Farmer / LandStdb.farmer).
function farmerAccessFilter(access: AccessContext) {
  return access.mode === "BY_FARMER_GROUP"
    ? { farmerGroupId: { in: access.ids } }
    : access.mode === "BY_DISTRICT"
      ? { farmerGroup: { districtId: { in: access.ids } } }
      : {};
}

// Cermin `farmerRelationAccessFilter` (query pada LandParcel — punya relasi `farmer`).
function farmerRelationAccessFilter(access: AccessContext) {
  return access.mode === "BY_FARMER_GROUP"
    ? { farmer: { farmerGroupId: { in: access.ids } } }
    : access.mode === "BY_DISTRICT"
      ? { farmer: { farmerGroup: { districtId: { in: access.ids } } } }
      : {};
}

// Cermin `resolveParcel` — titik masuk semua create: scope pada BARIS LAHAN.
const resolveParcelWhere = (landParcelId: string, access: AccessContext) => ({
  id: landParcelId,
  isActive: true,
  ...farmerRelationAccessFilter(access),
});

// Cermin `satelliteScope` — update/nonaktif dokumen, kode vendor, program:
// record satelit → identity (`parcel`) → farmer.
const satelliteScope = (access: AccessContext) => ({ parcel: { ...farmerRelationAccessFilter(access) } });
const satelliteByIdWhere = (id: string, access: AccessContext) => ({ id, isActive: true, ...satelliteScope(access) });

// Cermin update STDB — record STDB punya relasi `farmer` langsung.
const stdbByIdWhere = (id: string, access: AccessContext) => ({ id, isActive: true, farmer: farmerAccessFilter(access) });

const GROUP: AccessContext = { mode: "BY_FARMER_GROUP", ids: ["kt-1"] };
const DISTRICT: AccessContext = { mode: "BY_DISTRICT", ids: ["d-1"] };

describe("satelit lahan — scope create diturunkan dari baris lahan (resolveParcel)", () => {
  it("BY_FARMER_GROUP → lahan harus milik petani di lembaga user", () => {
    expect(resolveParcelWhere("lp-1", GROUP)).toEqual({ id: "lp-1", isActive: true, farmer: { farmerGroupId: { in: ["kt-1"] } } });
  });
  it("BY_DISTRICT → lewat farmer.farmerGroup.districtId", () => {
    expect(resolveParcelWhere("lp-1", DISTRICT)).toEqual({ id: "lp-1", isActive: true, farmer: { farmerGroup: { districtId: { in: ["d-1"] } } } });
  });
  it("ALL → hanya id + aktif (tanpa batasan)", () => {
    expect(resolveParcelWhere("lp-1", { mode: "ALL" })).toEqual({ id: "lp-1", isActive: true });
  });
  it("lahan nonaktif tidak bisa jadi induk satelit (isActive selalu true)", () => {
    expect(resolveParcelWhere("lp-1", GROUP).isActive).toBe(true);
  });
});

describe("satelit lahan — update/nonaktif record dicek kepemilikan via parcel.farmer", () => {
  it("BY_FARMER_GROUP: id record + identitas milik lembaga user", () => {
    expect(satelliteByIdWhere("doc-1", GROUP)).toEqual({ id: "doc-1", isActive: true, parcel: { farmer: { farmerGroupId: { in: ["kt-1"] } } } });
  });
  it("BY_DISTRICT: id record + identitas di distrik user", () => {
    expect(satelliteByIdWhere("doc-1", DISTRICT)).toEqual({ id: "doc-1", isActive: true, parcel: { farmer: { farmerGroup: { districtId: { in: ["d-1"] } } } } });
  });
  it("tidak ada tabrakan kunci: scope memakai `parcel`, bukan `id` (pitfall #127 tidak berlaku)", () => {
    const w = satelliteByIdWhere("doc-1", GROUP);
    expect(w.id).toBe("doc-1");
    expect(Object.keys(w).sort()).toEqual(["id", "isActive", "parcel"]);
  });
  it("id record dari lahan lembaga lain → where tak akan cocok (scope tetap disertakan, bukan hanya id)", () => {
    const w = satelliteByIdWhere("doc-milik-lembaga-lain", GROUP);
    expect(w.parcel).toEqual({ farmer: { farmerGroupId: { in: ["kt-1"] } } });
  });
});

describe("STDB — scope lewat relasi farmer langsung", () => {
  it("BY_FARMER_GROUP", () => {
    expect(stdbByIdWhere("s-1", GROUP)).toEqual({ id: "s-1", isActive: true, farmer: { farmerGroupId: { in: ["kt-1"] } } });
  });
  it("ALL → farmer: {} (tanpa batasan, tetap valid untuk Prisma)", () => {
    expect(stdbByIdWhere("s-1", { mode: "ALL" })).toEqual({ id: "s-1", isActive: true, farmer: {} });
  });
});
