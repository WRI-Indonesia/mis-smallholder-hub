import { describe, it, expect } from "vitest";
import { provinceSchema, districtSchema, subdistrictSchema, villageSchema } from "@/validations/region.schema";

describe("provinceSchema", () => {
  it("accepts valid province data", () => {
    const result = provinceSchema.parse({ code: "14", name: "Riau" });
    expect(result.code).toBe("14");
    expect(result.name).toBe("Riau");
  });

  it("accepts province with optional id", () => {
    const result = provinceSchema.parse({ id: "abc", code: "14", name: "Riau" });
    expect(result.id).toBe("abc");
  });

  it("rejects empty code", () => {
    expect(() => provinceSchema.parse({ code: "", name: "Riau" })).toThrow();
  });

  it("rejects code shorter than 2 characters", () => {
    expect(() => provinceSchema.parse({ code: "1", name: "Riau" })).toThrow();
  });

  it("rejects empty name", () => {
    expect(() => provinceSchema.parse({ code: "14", name: "" })).toThrow();
  });

  it("rejects name shorter than 2 characters", () => {
    expect(() => provinceSchema.parse({ code: "14", name: "R" })).toThrow();
  });
});

describe("districtSchema", () => {
  it("accepts valid district data", () => {
    const result = districtSchema.parse({
      code: "1404",
      name: "Pelalawan",
      provinceId: "prov-123",
    });
    expect(result.code).toBe("1404");
    expect(result.name).toBe("Pelalawan");
    expect(result.provinceId).toBe("prov-123");
  });

  it("rejects code shorter than 4 characters", () => {
    expect(() =>
      districtSchema.parse({ code: "14", name: "Pelalawan", provinceId: "prov-123" })
    ).toThrow();
  });

  it("rejects missing provinceId", () => {
    expect(() =>
      districtSchema.parse({ code: "1404", name: "Pelalawan", provinceId: "" })
    ).toThrow();
  });

  it("rejects empty name", () => {
    expect(() =>
      districtSchema.parse({ code: "1404", name: "", provinceId: "prov-123" })
    ).toThrow();
  });

  it("accepts district with optional id", () => {
    const result = districtSchema.parse({
      id: "dist-abc",
      code: "1404",
      name: "Pelalawan",
      provinceId: "prov-123",
    });
    expect(result.id).toBe("dist-abc");
  });
});

describe("subdistrictSchema", () => {
  it("accepts valid subdistrict data", () => {
    const result = subdistrictSchema.parse({
      code: "140401",
      name: "Pangkalan Kerinci",
      districtId: "dist-123",
    });
    expect(result.code).toBe("140401");
    expect(result.name).toBe("Pangkalan Kerinci");
    expect(result.districtId).toBe("dist-123");
  });

  it("rejects code shorter than 6 characters", () => {
    expect(() =>
      subdistrictSchema.parse({ code: "1404", name: "Pangkalan Kerinci", districtId: "dist-123" })
    ).toThrow();
  });

  it("rejects missing districtId", () => {
    expect(() =>
      subdistrictSchema.parse({ code: "140401", name: "Pangkalan Kerinci", districtId: "" })
    ).toThrow();
  });
});

describe("villageSchema", () => {
  it("accepts valid village data", () => {
    const result = villageSchema.parse({
      code: "1404012001",
      name: "Pangkalan Kerinci Kota",
      subdistrictId: "subd-123",
    });
    expect(result.code).toBe("1404012001");
    expect(result.name).toBe("Pangkalan Kerinci Kota");
    expect(result.subdistrictId).toBe("subd-123");
  });

  it("rejects code shorter than 10 characters", () => {
    expect(() =>
      villageSchema.parse({ code: "140401", name: "Pangkalan Kerinci Kota", subdistrictId: "subd-123" })
    ).toThrow();
  });

  it("rejects missing subdistrictId", () => {
    expect(() =>
      villageSchema.parse({ code: "1404012001", name: "Pangkalan Kerinci Kota", subdistrictId: "" })
    ).toThrow();
  });
});
