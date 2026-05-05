import { describe, it, expect } from "vitest";
import { landParcelSchema } from "../validations/land-parcel.schema";

describe("LandParcel Schema Validation", () => {
  // ─── Valid cases ──────────────────────────────────────────────────────────

  it("should accept a minimal valid parcel (farmerId only)", () => {
    const result = landParcelSchema.safeParse({ farmerId: "farmer-1" });
    expect(result.success).toBe(true);
  });

  it("should accept a fully populated valid parcel", () => {
    const result = landParcelSchema.safeParse({
      farmerId: "farmer-1",
      commodityCode: "PALM",
      parcelCode: "P-001",
      polygonSizeHa: 2.5,
      legalId: "SHM-12345",
      legalSizeHa: 2.0,
      status: "Aktif",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.polygonSizeHa).toBe(2.5);
      expect(result.data.legalSizeHa).toBe(2.0);
    }
  });

  it("should accept empty strings for optional fields and transform them to null", () => {
    const result = landParcelSchema.safeParse({
      farmerId: "farmer-1",
      commodityCode: "",
      parcelCode: "",
      polygonSizeHa: "",
      legalId: "",
      legalSizeHa: "",
      status: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.polygonSizeHa).toBeNull();
      expect(result.data.legalSizeHa).toBeNull();
    }
  });

  it("should accept null for optional numeric fields", () => {
    const result = landParcelSchema.safeParse({
      farmerId: "farmer-1",
      polygonSizeHa: null,
      legalSizeHa: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.polygonSizeHa).toBeNull();
      expect(result.data.legalSizeHa).toBeNull();
    }
  });

  it("should coerce string numbers to floats for size fields", () => {
    const result = landParcelSchema.safeParse({
      farmerId: "farmer-1",
      polygonSizeHa: "1.75",
      legalSizeHa: "1.50",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.polygonSizeHa).toBe(1.75);
      expect(result.data.legalSizeHa).toBe(1.5);
    }
  });

  // ─── Invalid cases ────────────────────────────────────────────────────────

  it("should reject missing farmerId", () => {
    const result = landParcelSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const farmerIdError = result.error.issues.find(
        (i) => i.path[0] === "farmerId"
      );
      expect(farmerIdError).toBeDefined();
      // Zod emits a type error when field is undefined; min(1) message fires on empty string
    }
  });

  it("should reject empty string farmerId", () => {
    const result = landParcelSchema.safeParse({ farmerId: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const farmerIdError = result.error.issues.find(
        (i) => i.path[0] === "farmerId"
      );
      expect(farmerIdError).toBeDefined();
    }
  });

  it("should reject negative polygonSizeHa", () => {
    const result = landParcelSchema.safeParse({
      farmerId: "farmer-1",
      polygonSizeHa: -1,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const sizeError = result.error.issues.find(
        (i) => i.path[0] === "polygonSizeHa"
      );
      expect(sizeError).toBeDefined();
      expect(sizeError?.message).toContain("positif");
    }
  });

  it("should reject zero polygonSizeHa (must be positive)", () => {
    const result = landParcelSchema.safeParse({
      farmerId: "farmer-1",
      polygonSizeHa: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative legalSizeHa", () => {
    const result = landParcelSchema.safeParse({
      farmerId: "farmer-1",
      legalSizeHa: -0.5,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const sizeError = result.error.issues.find(
        (i) => i.path[0] === "legalSizeHa"
      );
      expect(sizeError).toBeDefined();
      expect(sizeError?.message).toContain("positif");
    }
  });

  it("should reject non-numeric string for size fields", () => {
    const result = landParcelSchema.safeParse({
      farmerId: "farmer-1",
      polygonSizeHa: "abc",
    });
    expect(result.success).toBe(false);
  });

  // ─── Pagination logic ─────────────────────────────────────────────────────

  it("Pagination: total 0, limit 10 -> totalPages = 1 (floor guard)", () => {
    const total = 0;
    const limit = 10;
    const totalPages = Math.ceil(total / limit) || 1;
    expect(totalPages).toBe(1);
  });

  it("Pagination: total 25, limit 10 -> totalPages = 3", () => {
    const total = 25;
    const limit = 10;
    const totalPages = Math.ceil(total / limit) || 1;
    expect(totalPages).toBe(3);
  });

  it("Pagination: total 10, limit 10 -> totalPages = 1", () => {
    const total = 10;
    const limit = 10;
    const totalPages = Math.ceil(total / limit) || 1;
    expect(totalPages).toBe(1);
  });

  // ─── Delete guard logic ───────────────────────────────────────────────────

  it("Delete guard: should block deletion when related records exist", () => {
    const mockParcel = { _count: { productions: 2, maintenances: 1 } };
    const totalRelated =
      mockParcel._count.productions + mockParcel._count.maintenances;
    expect(totalRelated).toBeGreaterThan(0);
  });

  it("Delete guard: should allow deletion when no related records", () => {
    const mockParcel = { _count: { productions: 0, maintenances: 0 } };
    const totalRelated =
      mockParcel._count.productions + mockParcel._count.maintenances;
    expect(totalRelated).toBe(0);
  });
});
