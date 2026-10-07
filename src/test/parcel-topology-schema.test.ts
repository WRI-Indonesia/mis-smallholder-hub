import { describe, it, expect } from "vitest";
import { findingGeometryInputSchema, overlapGeometryInputSchema } from "@/validations/parcel-topology.schema";
import { groupScopeSql } from "@/lib/access-scope-sql";

describe("input geometri Tumpang Tindih Lahan — purpose divalidasi saat runtime (review ef4ed79)", () => {
  it("purpose di luar enum ditolak — dulu lolos sebagai 'bukan export' = cukup izin VIEW untuk ribuan geometri", () => {
    expect(findingGeometryInputSchema.safeParse({ purpose: "bulk", items: ["a", "b"], withBoundary: false }).success).toBe(false);
    expect(overlapGeometryInputSchema.safeParse({ purpose: "bulk", items: ["a|b", "c|d"] }).success).toBe(false);
  });

  it("preview = tepat satu item; export = banyak", () => {
    expect(findingGeometryInputSchema.safeParse({ purpose: "preview", items: ["a", "b"], withBoundary: true }).success).toBe(false);
    expect(findingGeometryInputSchema.safeParse({ purpose: "preview", items: ["a"], withBoundary: true }).success).toBe(true);
    expect(findingGeometryInputSchema.safeParse({ purpose: "export", items: ["a", "b"], withBoundary: false }).success).toBe(true);
    expect(overlapGeometryInputSchema.safeParse({ purpose: "preview", items: ["a|b"] }).success).toBe(true);
  });

  it("withBoundary wajib boolean; id/kunci berformat ketat", () => {
    expect(findingGeometryInputSchema.safeParse({ purpose: "preview", items: ["a"], withBoundary: "ya" }).success).toBe(false);
    expect(findingGeometryInputSchema.safeParse({ purpose: "export", items: ["a; DROP"], withBoundary: false }).success).toBe(false);
    expect(overlapGeometryInputSchema.safeParse({ purpose: "export", items: ["a"] }).success).toBe(false);
  });
});

describe("groupScopeSql", () => {
  it("alias hanya identifier sederhana (disisipkan sebagai SQL mentah)", () => {
    expect(() => groupScopeSql("g; DROP TABLE x", { mode: "ALL" })).toThrow(/alias/);
    expect(() => groupScopeSql("ga", { mode: "BY_DISTRICT", ids: ["d1"] })).not.toThrow();
  });
});
