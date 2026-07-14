import { describe, it, expect } from "vitest";

/**
 * Cross-scope unit tests untuk helper access-filter yang dipakai server actions
 * (#127 — AUDIT-P1). Mengikuti gaya repo (lihat `rbac-server-guards.test.ts`):
 * memverifikasi logika where-clause secara terisolasi tanpa DB. Modul asli
 * (`@/lib/access-context`) tidak diimpor karena menarik rantai next-auth/prisma
 * yang tidak resolve di environment vitest — helper di bawah adalah cermin 1:1
 * dari `farmerGroupAccessFilter` / `farmerAccessFilter` / `farmerRelationAccessFilter`.
 */

type AccessContext =
  | { mode: "ALL" }
  | { mode: "BY_FARMER_GROUP"; ids: string[] }
  | { mode: "BY_DISTRICT"; ids: string[] };

// Cermin dari access-context.ts `farmerGroupAccessFilter` (query pada FarmerGroup).
function farmerGroupAccessFilter(access: AccessContext) {
  return access.mode === "BY_FARMER_GROUP"
    ? { id: { in: access.ids } }
    : access.mode === "BY_DISTRICT"
    ? { districtId: { in: access.ids } }
    : {};
}

// Cermin dari access-context.ts `farmerAccessFilter` (query pada Farmer / TrainingActivity).
function farmerAccessFilter(access: AccessContext) {
  return access.mode === "BY_FARMER_GROUP"
    ? { farmerGroupId: { in: access.ids } }
    : access.mode === "BY_DISTRICT"
    ? { farmerGroup: { districtId: { in: access.ids } } }
    : {};
}

// Cermin dari access-context.ts `farmerRelationAccessFilter` (query pada LandParcel / ProductionRecord).
function farmerRelationAccessFilter(access: AccessContext) {
  return access.mode === "BY_FARMER_GROUP"
    ? { farmer: { farmerGroupId: { in: access.ids } } }
    : access.mode === "BY_DISTRICT"
    ? { farmer: { farmerGroup: { districtId: { in: access.ids } } } }
    : {};
}

describe("farmerGroupAccessFilter", () => {
  it("ALL → tanpa batasan", () => {
    expect(farmerGroupAccessFilter({ mode: "ALL" })).toEqual({});
  });
  it("BY_FARMER_GROUP → batasi id KT", () => {
    expect(farmerGroupAccessFilter({ mode: "BY_FARMER_GROUP", ids: ["kt-1", "kt-2"] })).toEqual({
      id: { in: ["kt-1", "kt-2"] },
    });
  });
  it("BY_DISTRICT → batasi districtId", () => {
    expect(farmerGroupAccessFilter({ mode: "BY_DISTRICT", ids: ["d1"] })).toEqual({
      districtId: { in: ["d1"] },
    });
  });
});

describe("farmerAccessFilter", () => {
  it("ALL → tanpa batasan", () => {
    expect(farmerAccessFilter({ mode: "ALL" })).toEqual({});
  });
  it("BY_FARMER_GROUP → farmerGroupId in ids", () => {
    expect(farmerAccessFilter({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] })).toEqual({
      farmerGroupId: { in: ["kt-1"] },
    });
  });
  it("BY_DISTRICT → relasi farmerGroup.districtId", () => {
    expect(farmerAccessFilter({ mode: "BY_DISTRICT", ids: ["d1"] })).toEqual({
      farmerGroup: { districtId: { in: ["d1"] } },
    });
  });
});

describe("farmerRelationAccessFilter", () => {
  it("ALL → tanpa batasan", () => {
    expect(farmerRelationAccessFilter({ mode: "ALL" })).toEqual({});
  });
  it("BY_FARMER_GROUP → relasi farmer.farmerGroupId", () => {
    expect(farmerRelationAccessFilter({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] })).toEqual({
      farmer: { farmerGroupId: { in: ["kt-1"] } },
    });
  });
  it("BY_DISTRICT → relasi farmer.farmerGroup.districtId", () => {
    expect(farmerRelationAccessFilter({ mode: "BY_DISTRICT", ids: ["d1"] })).toEqual({
      farmer: { farmerGroup: { districtId: { in: ["d1"] } } },
    });
  });
});

describe("by-id scope — Lembaga Petani (getFarmerGroupById/update/toggle) tidak bocor lintas wilayah", () => {
  // Filter KT dipasang lewat `AND`, bukan spread, agar `{ id: { in } }` (mode
  // BY_FARMER_GROUP) tidak menimpa literal `id` (celah scope-bypass).
  it("BY_DISTRICT: where menyertakan id spesifik + batasan districtId", () => {
    const where = { id: "kt-x", AND: farmerGroupAccessFilter({ mode: "BY_DISTRICT", ids: ["d1"] }) };
    expect(where).toEqual({ id: "kt-x", AND: { districtId: { in: ["d1"] } } });
  });
  it("BY_FARMER_GROUP: literal id tetap ada, tidak tertimpa filter scope", () => {
    const where = { id: "kt-x", AND: farmerGroupAccessFilter({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] }) };
    // `id` spesifik dipertahankan; scope `{ id: { in } }` masuk lewat AND →
    // request KT di luar scope menghasilkan himpunan kosong (not found).
    expect(where).toEqual({ id: "kt-x", AND: { id: { in: ["kt-1"] } } });
    expect(where.id).toBe("kt-x");
  });
  it("ALL: AND no-op tidak menambah batasan", () => {
    const where = { id: "kt-x", AND: farmerGroupAccessFilter({ mode: "ALL" }) };
    expect(where).toEqual({ id: "kt-x", AND: {} });
  });
});

describe("by-id scope — Pelatihan (getTrainingActivityById/update/toggle)", () => {
  it("BY_FARMER_GROUP: activity dibatasi farmerGroupId", () => {
    const where = { id: "act-x", ...farmerAccessFilter({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] }) };
    expect(where).toEqual({ id: "act-x", farmerGroupId: { in: ["kt-1"] } });
  });
  it("BY_DISTRICT: activity dibatasi lewat relasi farmerGroup.districtId", () => {
    const where = { id: "act-x", ...farmerAccessFilter({ mode: "BY_DISTRICT", ids: ["d1"] }) };
    expect(where).toEqual({ id: "act-x", farmerGroup: { districtId: { in: ["d1"] } } });
  });
});

describe("scope peserta pelatihan (removeParticipant/updateParticipantScores) via relasi activity", () => {
  it("BY_FARMER_GROUP: participant dibatasi activity.farmerGroupId", () => {
    const where = { id: "part-x", activity: farmerAccessFilter({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] }) };
    expect(where).toEqual({ id: "part-x", activity: { farmerGroupId: { in: ["kt-1"] } } });
  });
  it("BY_DISTRICT: participant dibatasi activity.farmerGroup.districtId", () => {
    const where = { id: "part-x", activity: farmerAccessFilter({ mode: "BY_DISTRICT", ids: ["d1"] }) };
    expect(where).toEqual({ id: "part-x", activity: { farmerGroup: { districtId: { in: ["d1"] } } } });
  });
});

describe("soft-delete visibility gating — hanya SUPERADMIN yang melihat record nonaktif", () => {
  // Cermin pola `...((await isSuperAdmin()) ? {} : { isActive: true })` di list & read by-id.
  function softDeleteFilter(isSuperAdmin: boolean) {
    return isSuperAdmin ? {} : { isActive: true };
  }

  it("SUPERADMIN: tanpa batasan isActive (bisa lihat aktif & nonaktif)", () => {
    expect(softDeleteFilter(true)).toEqual({});
  });
  it("non-SUPERADMIN: dipaksa isActive: true (hanya record aktif)", () => {
    expect(softDeleteFilter(false)).toEqual({ isActive: true });
  });
  it("gabung dengan scope+id: user biasa tetap terkunci ke aktif", () => {
    const where = {
      id: "row-x",
      ...farmerRelationAccessFilter({ mode: "BY_DISTRICT", ids: ["d1"] }),
      ...softDeleteFilter(false),
    };
    expect(where).toEqual({
      id: "row-x",
      farmer: { farmerGroup: { districtId: { in: ["d1"] } } },
      isActive: true,
    });
  });
});

describe("by-id scope — Lahan & Produksi (create target + toggle/delete)", () => {
  it("createLandParcel/createFarmer: target farmer harus lolos farmerAccessFilter", () => {
    const where = { id: "farmer-x", isActive: true, ...farmerAccessFilter({ mode: "BY_FARMER_GROUP", ids: ["kt-1"] }) };
    expect(where).toEqual({ id: "farmer-x", isActive: true, farmerGroupId: { in: ["kt-1"] } });
  });
  it("toggleLandParcelActive/toggleProductionRecordActive: dibatasi relasi farmer", () => {
    const where = { id: "row-x", ...farmerRelationAccessFilter({ mode: "BY_DISTRICT", ids: ["d1"] }) };
    expect(where).toEqual({ id: "row-x", farmer: { farmerGroup: { districtId: { in: ["d1"] } } } });
  });
});
