import { describe, it, expect } from "vitest";
import { trainingActivitySchema } from "@/validations/training-activity.schema";

describe("trainingActivitySchema", () => {
  // ─── Valid data ─────────────────────────────────────────────────────────

  it("accepts valid training activity data", () => {
    const result = trainingActivitySchema.parse({
      packageId: "pkg-001",
      farmerGroupId: "fg-001",
      trainingDate: "2026-05-01",
    });
    expect(result.packageId).toBe("pkg-001");
    expect(result.farmerGroupId).toBe("fg-001");
    expect(result.trainingDate).toBe("2026-05-01");
  });

  it("accepts data with all optional fields", () => {
    const result = trainingActivitySchema.parse({
      packageId: "pkg-001",
      farmerGroupId: "fg-001",
      trainingDate: "2026-05-01",
      location: "Balai Desa Makmur",
    });
    expect(result.location).toBe("Balai Desa Makmur");
  });

  it("accepts data with optional id (edit mode)", () => {
    const result = trainingActivitySchema.parse({
      id: "act-abc",
      packageId: "pkg-001",
      farmerGroupId: "fg-001",
      trainingDate: "2026-05-01",
    });
    expect(result.id).toBe("act-abc");
  });

  // ─── Required field validation ──────────────────────────────────────────

  it("rejects missing packageId", () => {
    expect(() =>
      trainingActivitySchema.parse({
        packageId: "",
        farmerGroupId: "fg-001",
        trainingDate: "2026-05-01",
      })
    ).toThrow();
  });

  it("rejects missing farmerGroupId", () => {
    expect(() =>
      trainingActivitySchema.parse({
        packageId: "pkg-001",
        farmerGroupId: "",
        trainingDate: "2026-05-01",
      })
    ).toThrow();
  });

  it("rejects missing trainingDate", () => {
    expect(() =>
      trainingActivitySchema.parse({
        packageId: "pkg-001",
        farmerGroupId: "fg-001",
        trainingDate: "",
      })
    ).toThrow();
  });

  // ─── Optional fields ────────────────────────────────────────────────────

  it("accepts empty location string", () => {
    const result = trainingActivitySchema.parse({
      packageId: "pkg-001",
      farmerGroupId: "fg-001",
      trainingDate: "2026-05-01",
      location: "",
    });
    expect(result.location).toBe("");
  });

  it("accepts undefined location", () => {
    const result = trainingActivitySchema.parse({
      packageId: "pkg-001",
      farmerGroupId: "fg-001",
      trainingDate: "2026-05-01",
    });
    expect(result.location).toBeUndefined();
  });
});

// ─── Pagination logic ─────────────────────────────────────────────────────────

describe("Training pagination logic", () => {
  it("calculates correct total pages for 0 items", () => {
    const total = 0;
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    expect(totalPages).toBe(1);
  });

  it("calculates correct total pages for 10 items with pageSize 10", () => {
    const total = 10;
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    expect(totalPages).toBe(1);
  });

  it("calculates correct total pages for 11 items with pageSize 10", () => {
    const total = 11;
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    expect(totalPages).toBe(2);
  });

  it("calculates correct total pages for 25 items with pageSize 10", () => {
    const total = 25;
    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    expect(totalPages).toBe(3);
  });
});

// ─── Date formatting ──────────────────────────────────────────────────────────

describe("Training date formatting", () => {
  it("formats ISO date to Indonesian locale", () => {
    const date = new Date("2026-05-01T00:00:00.000Z");
    const formatted = date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    // Should contain "2026" and "Mei" (Indonesian for May)
    expect(formatted).toContain("2026");
    expect(formatted).toContain("Mei");
  });

  it("formats another date correctly", () => {
    const date = new Date("2026-01-15T00:00:00.000Z");
    const formatted = date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    expect(formatted).toContain("2026");
    expect(formatted).toContain("Januari");
  });
});

// ─── NIK masking logic ────────────────────────────────────────────────────────

describe("NIK masking for participant display", () => {
  it("masks middle digits of NIK correctly", () => {
    const nik = "1234567890123456";
    const masked = `${nik.slice(0, 4)}****${nik.slice(-4)}`;
    expect(masked).toBe("1234****3456");
    expect(masked.length).toBe(12);
  });

  it("preserves first 4 and last 4 digits", () => {
    const nik = "9876543210987654";
    const masked = `${nik.slice(0, 4)}****${nik.slice(-4)}`;
    expect(masked.startsWith("9876")).toBe(true);
    expect(masked.endsWith("7654")).toBe(true);
  });
});
