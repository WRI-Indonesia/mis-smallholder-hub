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
