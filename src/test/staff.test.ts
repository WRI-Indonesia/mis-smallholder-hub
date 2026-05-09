import { describe, it, expect } from "vitest";
import { staffSchema } from "@/validations/staff.schema";

describe("staffSchema", () => {
  // ─── Valid data ─────────────────────────────────────────────────────────

  it("accepts valid staff data", () => {
    const result = staffSchema.parse({
      staffCode: "SH-001",
      name: "Budi Santoso",
      jobDeskId: "jd-001",
    });
    expect(result.staffCode).toBe("SH-001");
    expect(result.name).toBe("Budi Santoso");
    expect(result.jobDeskId).toBe("jd-001");
  });

  it("accepts data with all optional fields", () => {
    const result = staffSchema.parse({
      staffCode: "SH-002",
      name: "Siti Rahayu",
      jobDeskId: "jd-002",
      emailWri: "siti@wri.org",
      lineManagerId: "staff-abc",
      districtIds: ["dist-1", "dist-2"],
      farmerGroupIds: ["fg-1", "fg-2", "fg-3"],
    });
    expect(result.emailWri).toBe("siti@wri.org");
    expect(result.lineManagerId).toBe("staff-abc");
    expect(result.districtIds).toHaveLength(2);
    expect(result.farmerGroupIds).toHaveLength(3);
  });

  it("accepts data with optional id (edit mode)", () => {
    const result = staffSchema.parse({
      id: "staff-xyz",
      staffCode: "SH-003",
      name: "Ahmad Yani",
      jobDeskId: "jd-003",
    });
    expect(result.id).toBe("staff-xyz");
  });

  it("defaults districtIds and farmerGroupIds to empty arrays", () => {
    const result = staffSchema.parse({
      staffCode: "SH-004",
      name: "Test Staff",
      jobDeskId: "jd-001",
    });
    expect(result.districtIds).toEqual([]);
    expect(result.farmerGroupIds).toEqual([]);
  });

  // ─── Required field validation ──────────────────────────────────────────

  it("rejects empty staffCode", () => {
    expect(() =>
      staffSchema.parse({ staffCode: "", name: "Test", jobDeskId: "jd-1" })
    ).toThrow();
  });

  it("rejects name shorter than 2 characters", () => {
    expect(() =>
      staffSchema.parse({ staffCode: "SH-001", name: "A", jobDeskId: "jd-1" })
    ).toThrow();
  });

  it("rejects empty jobDeskId", () => {
    expect(() =>
      staffSchema.parse({ staffCode: "SH-001", name: "Test Staff", jobDeskId: "" })
    ).toThrow();
  });

  // ─── Email validation ───────────────────────────────────────────────────

  it("rejects invalid email format", () => {
    expect(() =>
      staffSchema.parse({
        staffCode: "SH-001",
        name: "Test Staff",
        jobDeskId: "jd-1",
        emailWri: "not-an-email",
      })
    ).toThrow();
  });

  it("accepts empty email string", () => {
    const result = staffSchema.parse({
      staffCode: "SH-001",
      name: "Test Staff",
      jobDeskId: "jd-1",
      emailWri: "",
    });
    expect(result.emailWri).toBe("");
  });

  it("accepts valid WRI email", () => {
    const result = staffSchema.parse({
      staffCode: "SH-001",
      name: "Test Staff",
      jobDeskId: "jd-1",
      emailWri: "test@wri.org",
    });
    expect(result.emailWri).toBe("test@wri.org");
  });

  // ─── Optional fields ────────────────────────────────────────────────────

  it("accepts null lineManagerId", () => {
    const result = staffSchema.parse({
      staffCode: "SH-001",
      name: "Test Staff",
      jobDeskId: "jd-1",
      lineManagerId: null,
    });
    expect(result.lineManagerId).toBeNull();
  });

  it("accepts empty lineManagerId string", () => {
    const result = staffSchema.parse({
      staffCode: "SH-001",
      name: "Test Staff",
      jobDeskId: "jd-1",
      lineManagerId: "",
    });
    expect(result.lineManagerId).toBe("");
  });
});

// ─── Staff code format ────────────────────────────────────────────────────────

describe("Staff code format validation", () => {
  it("accepts SH-001 format", () => {
    const result = staffSchema.parse({
      staffCode: "SH-001",
      name: "Test",
      jobDeskId: "jd-1",
    });
    expect(result.staffCode).toBe("SH-001");
  });

  it("accepts any non-empty string as staff code", () => {
    const result = staffSchema.parse({
      staffCode: "WRI-DC-007",
      name: "Test",
      jobDeskId: "jd-1",
    });
    expect(result.staffCode).toBe("WRI-DC-007");
  });
});
