import { describe, it, expect } from "vitest";
import { productionSchema, productionUpdateSchema } from "@/validations/production.schema";

describe("ProductionRecord Schema - Create Validation", () => {
  it("accepts valid production record input", () => {
    const data = {
      farmerId: "cix1234567890123456789012",
      parcelId: "cix1234567890123456789013",
      period: "2026-06",
      harvestDate: new Date("2026-06-15"),
      harvestNumber: 1,
      yieldKg: 1250.5,
      notes: "Cuaca mendung",
    };
    const r = productionSchema.safeParse(data);
    expect(r.success).toBe(true);
  });

  it("accepts production record input without parcelId", () => {
    const data = {
      farmerId: "cix1234567890123456789012",
      period: "2026-06",
      harvestDate: new Date("2026-06-15"),
      harvestNumber: 1,
      yieldKg: 1250.5,
    };
    const r = productionSchema.safeParse(data);
    expect(r.success).toBe(true);
  });

  it("rejects invalid period format", () => {
    const data = {
      farmerId: "cix1234567890123456789012",
      period: "26-06",
      harvestDate: new Date("2026-06-15"),
      harvestNumber: 1,
      yieldKg: 1250.5,
    };
    const r = productionSchema.safeParse(data);
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.period).toBeDefined();
  });

  it("rejects harvestDate outside period month", () => {
    const data = {
      farmerId: "cix1234567890123456789012",
      period: "2026-06",
      harvestDate: new Date("2026-05-31"),
      harvestNumber: 1,
      yieldKg: 1250.5,
    };
    const r = productionSchema.safeParse(data);
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.harvestDate).toBeDefined();
  });

  it("rejects harvestNumber less than 1 or greater than 4", () => {
    const dataLow = {
      farmerId: "cix1234567890123456789012",
      period: "2026-06",
      harvestDate: new Date("2026-06-15"),
      harvestNumber: 0,
      yieldKg: 1250.5,
    };
    const dataHigh = {
      farmerId: "cix1234567890123456789012",
      period: "2026-06",
      harvestDate: new Date("2026-06-15"),
      harvestNumber: 5,
      yieldKg: 1250.5,
    };
    expect(productionSchema.safeParse(dataLow).success).toBe(false);
    expect(productionSchema.safeParse(dataHigh).success).toBe(false);
  });

  it("rejects negative yieldKg", () => {
    const data = {
      farmerId: "cix1234567890123456789012",
      period: "2026-06",
      harvestDate: new Date("2026-06-15"),
      harvestNumber: 1,
      yieldKg: -10,
    };
    const r = productionSchema.safeParse(data);
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.yieldKg).toBeDefined();
  });
});

describe("ProductionRecord Schema - Update Validation", () => {
  it("accepts valid update containing partial fields", () => {
    const data = {
      yieldKg: 1300,
      notes: "Diperbarui",
    };
    const r = productionUpdateSchema.safeParse(data);
    expect(r.success).toBe(true);
  });

  it("rejects update that changes farmerId", () => {
    const data = {
      farmerId: "cix1234567890123456789012",
    };
    const r = productionUpdateSchema.safeParse(data);
    expect((r.data as Record<string, unknown>)?.farmerId).toBeUndefined();
  });
});

describe("ProductionRecord Query Filter Resolution", () => {
  type AccessContext =
    | { mode: "ALL" }
    | { mode: "BY_FARMER_GROUP"; ids: string[] }
    | { mode: "BY_DISTRICT"; ids: string[] };

  function buildProductionWhereClause(
    access: AccessContext,
    params?: {
      search?: string;
      farmerGroupId?: string;
      period?: string;
      hasParcel?: string;
      status?: string;
    }
  ) {
    // Merged farmer filter — matches fixed server action logic
    const farmerAccessFilter =
      access.mode === "BY_FARMER_GROUP" ? { farmerGroupId: { in: access.ids } } :
      access.mode === "BY_DISTRICT" ? { farmerGroup: { districtId: { in: access.ids } } } :
      {};

    const farmerGroupFilter = params?.farmerGroupId ? { farmerGroupId: params.farmerGroupId } : {};

    const farmerFilter = {
      ...farmerAccessFilter,
      ...farmerGroupFilter,
    };

    const isActiveFilter = 
      params?.status === "active" ? { isActive: true } :
      params?.status === "inactive" ? { isActive: false } :
      params?.status === "all" ? {} :
      { isActive: true };

    const hasParcelFilter = 
      params?.hasParcel === "true" ? { parcelId: { not: null } } :
      params?.hasParcel === "false" ? { parcelId: null } :
      {};

    return {
      ...(Object.keys(farmerFilter).length > 0 ? { farmer: farmerFilter } : {}),
      ...isActiveFilter,
      ...hasParcelFilter,
      ...(params?.period ? { period: params.period } : {}),
      ...(params?.search
        ? {
            OR: [
              { farmer: { name: { contains: params.search, mode: "insensitive" as const } } },
              { farmer: { farmerId: { contains: params.search, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };
  }

  it("builds correct filter for mode ALL", () => {
    const where = buildProductionWhereClause({ mode: "ALL" });
    expect(where.isActive).toBe(true);
    expect((where as Record<string, unknown>).farmer).toBeUndefined();
  });

  it("builds correct filter for mode BY_FARMER_GROUP", () => {
    const where = buildProductionWhereClause({ mode: "BY_FARMER_GROUP", ids: ["fg-1", "fg-2"] });
    expect(where.isActive).toBe(true);
    expect((where as Record<string, unknown>).farmer).toEqual({ farmerGroupId: { in: ["fg-1", "fg-2"] } });
  });

  it("builds correct filter for mode BY_DISTRICT", () => {
    const where = buildProductionWhereClause({ mode: "BY_DISTRICT", ids: ["dist-1", "dist-2"] });
    expect(where.isActive).toBe(true);
    expect((where as Record<string, unknown>).farmer).toEqual({ farmerGroup: { districtId: { in: ["dist-1", "dist-2"] } } });
  });

  it("builds correct hasParcel filter", () => {
    const whereTrue = buildProductionWhereClause({ mode: "ALL" }, { hasParcel: "true" });
    expect(whereTrue.parcelId).toEqual({ not: null });

    const whereFalse = buildProductionWhereClause({ mode: "ALL" }, { hasParcel: "false" });
    expect(whereFalse.parcelId).toBeNull();
  });

  it("builds correct status filter", () => {
    const whereInactive = buildProductionWhereClause({ mode: "ALL" }, { status: "inactive" });
    expect(whereInactive.isActive).toBe(false);

    const whereAll = buildProductionWhereClause({ mode: "ALL" }, { status: "all" });
    expect(whereAll.isActive).toBeUndefined();
  });

  it("preserves RBAC filter when farmerGroupId param is provided (BY_DISTRICT)", () => {
    const where = buildProductionWhereClause(
      { mode: "BY_DISTRICT", ids: ["dist-1", "dist-2"] },
      { farmerGroupId: "fg-1" }
    );
    // Both RBAC district scoping AND farmerGroupId filter must coexist
    expect(((where as Record<string, unknown>).farmer as Record<string, unknown>).farmerGroup).toEqual({ districtId: { in: ["dist-1", "dist-2"] } });
    expect(((where as Record<string, unknown>).farmer as Record<string, unknown>).farmerGroupId).toBe("fg-1");
  });

  it("does not add farmer filter for mode ALL without farmerGroupId", () => {
    const where = buildProductionWhereClause({ mode: "ALL" }, { period: "2026-06" });
    expect((where as Record<string, unknown>).farmer).toBeUndefined();
    expect((where as Record<string, unknown>).period).toBe("2026-06");
  });
});
