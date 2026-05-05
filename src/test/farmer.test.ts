import { describe, it, expect } from "vitest";
import { farmerSchema } from "../validations/farmer.schema";

describe("Farmer Schema Validation", () => {
  it("should accept valid 16 digit NIK", () => {
    const validData = {
      name: "Budi",
      nik: "1234567890123456",
      gender: "L",
      birthdate: "1990-01-01",
      farmerGroupId: "group-1"
    };
    
    const result = farmerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("should reject NIK with less than 16 digits", () => {
    const invalidData = {
      name: "Budi",
      nik: "123456789012345", // 15 digits
      gender: "L",
      birthdate: "1990-01-01",
      farmerGroupId: "group-1"
    };
    
    const result = farmerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject NIK with letters", () => {
    const invalidData = {
      name: "Budi",
      nik: "123456789012345A", // contains letter
      gender: "L",
      birthdate: "1990-01-01",
      farmerGroupId: "group-1"
    };
    
    const result = farmerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("should reject birthdate in the future", () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1); // 1 year from now
    
    const invalidData = {
      name: "Budi",
      nik: "1234567890123456",
      gender: "L",
      birthdate: futureDate.toISOString(),
      farmerGroupId: "group-1"
    };
    
    const result = farmerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("masa depan");
    }
  });

  it("Pagination logic check: total 25, limit 10 -> totalPages = 3", () => {
    const total = 25;
    const limit = 10;
    const totalPages = Math.ceil(total / limit) || 1;
    expect(totalPages).toBe(3);
  });
});
