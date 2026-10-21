import { describe, it, expect } from "vitest";
import { farmerSchema, updateFarmerSchema } from "@/validations/farmer.schema";

describe("Farmer Schema - Create Validation", () => {
  it("accepts valid farmer input", () => {
    const data = {
      farmerGroupId: "group-1",
      gender: "M" as const,
      name: "Abdi Wijaya",
      farmerId: "FMR-001",
      nik: "1234567890123456",
      address: "Jl. Merdeka No. 10",
      birthPlace: "Jakarta",
      birthDate: new Date("1990-05-15"),
    };
    const r = farmerSchema.safeParse(data);
    expect(r.success).toBe(true);
  });

  it("rejects empty farmerGroupId", () => {
    const data = {
      farmerGroupId: "",
      gender: "M" as const,
      name: "Abdi Wijaya",
      farmerId: "FMR-001",
    };
    const r = farmerSchema.safeParse(data);
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.farmerGroupId).toBeDefined();
  });

  it("rejects invalid gender", () => {
    const data = {
      farmerGroupId: "group-1",
      gender: "X",
      name: "Abdi Wijaya",
      farmerId: "FMR-001",
    };
    const r = farmerSchema.safeParse(data);
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.gender).toBeDefined();
  });

  it("rejects short name", () => {
    const data = {
      farmerGroupId: "group-1",
      gender: "F" as const,
      name: "A",
      farmerId: "FMR-001",
    };
    const r = farmerSchema.safeParse(data);
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.name).toBeDefined();
  });

  it("accepts valid joinedYear within range", () => {
    const data = {
      farmerGroupId: "group-1",
      gender: "M" as const,
      name: "Abdi Wijaya",
      farmerId: "FMR-001",
      joinedYear: 2020,
    };
    const r = farmerSchema.safeParse(data);
    expect(r.success).toBe(true);
  });

  it("rejects joinedYear below 1900", () => {
    const data = {
      farmerGroupId: "group-1",
      gender: "M" as const,
      name: "Abdi Wijaya",
      farmerId: "FMR-001",
      joinedYear: 1899,
    };
    const r = farmerSchema.safeParse(data);
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.joinedYear).toBeDefined();
  });

  it("rejects joinedYear above 2100", () => {
    const data = {
      farmerGroupId: "group-1",
      gender: "M" as const,
      name: "Abdi Wijaya",
      farmerId: "FMR-001",
      joinedYear: 2101,
    };
    const r = farmerSchema.safeParse(data);
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.joinedYear).toBeDefined();
  });

  it("coerces empty string/null joinedYear to null", () => {
    const data = {
      farmerGroupId: "group-1",
      gender: "M" as const,
      name: "Abdi Wijaya",
      farmerId: "FMR-001",
      joinedYear: "",
    };
    const r = farmerSchema.safeParse(data);
    expect(r.success).toBe(true);
    expect(r.data?.joinedYear).toBeNull();
  });
});

describe("Farmer Schema - Update Validation", () => {
  it("accepts valid update containing id", () => {
    const data = {
      id: "farmer-cuid-123",
      farmerGroupId: "group-1",
      gender: "F" as const,
      name: "Siti Rahma",
      farmerId: "FMR-002",
    };
    const r = updateFarmerSchema.safeParse(data);
    expect(r.success).toBe(true);
  });

  it("rejects update without id", () => {
    const data = {
      farmerGroupId: "group-1",
      gender: "F" as const,
      name: "Siti Rahma",
      farmerId: "FMR-002",
    };
    const r = updateFarmerSchema.safeParse(data);
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.id).toBeDefined();
  });
});

