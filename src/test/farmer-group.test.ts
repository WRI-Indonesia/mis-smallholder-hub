import { describe, it, expect } from "vitest";
import { farmerGroupSchema } from "@/validations/farmer-group.schema";

describe("farmerGroupSchema", () => {
  it("accepts valid farmer group data", () => {
    const result = farmerGroupSchema.parse({
      name: "Kelompok Makmur",
      districtId: "dist-123",
    });
    expect(result.name).toBe("Kelompok Makmur");
    expect(result.districtId).toBe("dist-123");
  });

  it("accepts data with all optional fields", () => {
    const result = farmerGroupSchema.parse({
      name: "Kelompok Makmur",
      code: "KT001",
      abrv: "KTM",
      abrv3id: "KTM-3ID",
      districtId: "dist-123",
      locationLat: -0.5332,
      locationLong: 102.1455,
    });
    expect(result.code).toBe("KT001");
    expect(result.abrv).toBe("KTM");
    expect(result.abrv3id).toBe("KTM-3ID");
    expect(result.locationLat).toBe(-0.5332);
    expect(result.locationLong).toBe(102.1455);
  });

  it("accepts data with optional id (edit mode)", () => {
    const result = farmerGroupSchema.parse({
      id: "grp-abc",
      name: "Kelompok Makmur",
      districtId: "dist-123",
    });
    expect(result.id).toBe("grp-abc");
  });

  it("rejects empty name", () => {
    expect(() =>
      farmerGroupSchema.parse({ name: "", districtId: "dist-123" })
    ).toThrow();
  });

  it("rejects name shorter than 2 characters", () => {
    expect(() =>
      farmerGroupSchema.parse({ name: "K", districtId: "dist-123" })
    ).toThrow();
  });

  it("rejects missing districtId", () => {
    expect(() =>
      farmerGroupSchema.parse({ name: "Kelompok Makmur", districtId: "" })
    ).toThrow();
  });

  // ─── Coordinate validation ────────────────────────────────────────────

  it("accepts lat at boundary -90", () => {
    const result = farmerGroupSchema.parse({
      name: "Test",
      districtId: "d-1",
      locationLat: -90,
    });
    expect(result.locationLat).toBe(-90);
  });

  it("accepts lat at boundary 90", () => {
    const result = farmerGroupSchema.parse({
      name: "Test",
      districtId: "d-1",
      locationLat: 90,
    });
    expect(result.locationLat).toBe(90);
  });

  it("rejects lat below -90", () => {
    expect(() =>
      farmerGroupSchema.parse({
        name: "Test",
        districtId: "d-1",
        locationLat: -91,
      })
    ).toThrow();
  });

  it("rejects lat above 90", () => {
    expect(() =>
      farmerGroupSchema.parse({
        name: "Test",
        districtId: "d-1",
        locationLat: 91,
      })
    ).toThrow();
  });

  it("accepts long at boundary -180", () => {
    const result = farmerGroupSchema.parse({
      name: "Test",
      districtId: "d-1",
      locationLong: -180,
    });
    expect(result.locationLong).toBe(-180);
  });

  it("accepts long at boundary 180", () => {
    const result = farmerGroupSchema.parse({
      name: "Test",
      districtId: "d-1",
      locationLong: 180,
    });
    expect(result.locationLong).toBe(180);
  });

  it("rejects long below -180", () => {
    expect(() =>
      farmerGroupSchema.parse({
        name: "Test",
        districtId: "d-1",
        locationLong: -181,
      })
    ).toThrow();
  });

  it("rejects long above 180", () => {
    expect(() =>
      farmerGroupSchema.parse({
        name: "Test",
        districtId: "d-1",
        locationLong: 181,
      })
    ).toThrow();
  });

  // ─── Optional fields ──────────────────────────────────────────────────

  it("accepts empty code string", () => {
    const result = farmerGroupSchema.parse({
      name: "Test",
      districtId: "d-1",
      code: "",
    });
    expect(result.code).toBe("");
  });

  it("accepts empty abrv string", () => {
    const result = farmerGroupSchema.parse({
      name: "Test",
      districtId: "d-1",
      abrv: "",
    });
    expect(result.abrv).toBe("");
  });

  it("accepts empty abrv3id string", () => {
    const result = farmerGroupSchema.parse({
      name: "Test",
      districtId: "d-1",
      abrv3id: "",
    });
    expect(result.abrv3id).toBe("");
  });

  it("rejects abrv3id longer than 50 characters", () => {
    expect(() =>
      farmerGroupSchema.parse({
        name: "Test",
        districtId: "d-1",
        abrv3id: "A".repeat(51),
      })
    ).toThrow();
  });

  it("accepts abrv3id at exactly 50 characters", () => {
    const result = farmerGroupSchema.parse({
      name: "Test",
      districtId: "d-1",
      abrv3id: "A".repeat(50),
    });
    expect(result.abrv3id).toBe("A".repeat(50));
  });

  it("accepts null lat/long", () => {
    const result = farmerGroupSchema.parse({
      name: "Test",
      districtId: "d-1",
      locationLat: null,
      locationLong: null,
    });
    expect(result.locationLat).toBeNull();
    expect(result.locationLong).toBeNull();
  });
});
