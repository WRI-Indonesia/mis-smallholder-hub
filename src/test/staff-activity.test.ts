import { describe, it, expect } from "vitest";
import { staffActivitySchema, rejectActivitySchema } from "@/validations/staff-activity.schema";

describe("staffActivitySchema", () => {
  it("accepts valid activity data", () => {
    const result = staffActivitySchema.parse({
      activityDate: "2026-05-09",
      planning: "Kunjungan lapangan ke KT APKASAIBER",
    });
    expect(result.activityDate).toBe("2026-05-09");
    expect(result.planning).toBe("Kunjungan lapangan ke KT APKASAIBER");
  });

  it("accepts data with all optional fields", () => {
    const result = staffActivitySchema.parse({
      activityDate: "2026-05-09",
      planning: "Kunjungan lapangan",
      realization: "Berhasil verifikasi 5 petani",
      comment: "Cuaca cerah",
    });
    expect(result.realization).toBe("Berhasil verifikasi 5 petani");
    expect(result.comment).toBe("Cuaca cerah");
  });

  it("accepts edit mode with id", () => {
    const result = staffActivitySchema.parse({
      id: "act-123",
      activityDate: "2026-05-09",
      planning: "Rapat koordinasi",
    });
    expect(result.id).toBe("act-123");
  });

  it("rejects empty activityDate", () => {
    expect(() =>
      staffActivitySchema.parse({ activityDate: "", planning: "Test" })
    ).toThrow();
  });

  it("rejects empty planning", () => {
    expect(() =>
      staffActivitySchema.parse({ activityDate: "2026-05-09", planning: "" })
    ).toThrow();
  });

  it("accepts empty realization string", () => {
    const result = staffActivitySchema.parse({
      activityDate: "2026-05-09",
      planning: "Test",
      realization: "",
    });
    expect(result.realization).toBe("");
  });

  it("accepts empty comment string", () => {
    const result = staffActivitySchema.parse({
      activityDate: "2026-05-09",
      planning: "Test",
      comment: "",
    });
    expect(result.comment).toBe("");
  });
});

describe("rejectActivitySchema", () => {
  it("accepts valid rejection note", () => {
    const result = rejectActivitySchema.parse({
      rejectionNote: "Aktivitas tidak sesuai target",
    });
    expect(result.rejectionNote).toBe("Aktivitas tidak sesuai target");
  });

  it("rejects empty rejection note", () => {
    expect(() =>
      rejectActivitySchema.parse({ rejectionNote: "" })
    ).toThrow();
  });
});

// ─── Calendar logic ───────────────────────────────────────────────────────────

describe("Calendar grid logic", () => {
  it("calculates correct days in January 2026", () => {
    const daysInMonth = new Date(2026, 1, 0).getDate();
    expect(daysInMonth).toBe(31);
  });

  it("calculates correct days in February 2026 (non-leap)", () => {
    const daysInMonth = new Date(2026, 2, 0).getDate();
    expect(daysInMonth).toBe(28);
  });

  it("identifies Saturday as weekend", () => {
    const date = new Date(2026, 0, 3); // Jan 3, 2026 = Saturday
    expect(date.getDay()).toBe(6);
  });

  it("identifies Sunday as weekend", () => {
    const date = new Date(2026, 0, 4); // Jan 4, 2026 = Sunday
    expect(date.getDay()).toBe(0);
  });

  it("identifies Monday as weekday", () => {
    const date = new Date(2026, 0, 5); // Jan 5, 2026 = Monday
    expect(date.getDay()).toBe(1);
  });
});

// ─── Status flow logic ────────────────────────────────────────────────────────

describe("Activity status flow", () => {
  const canEdit = (status: string) =>
    status === "DRAFT" || status === "REJECTED";

  const canSubmit = (status: string) =>
    status === "DRAFT" || status === "REJECTED";

  const canApprove = (status: string) =>
    status === "PENDING_APPROVAL";

  const canDelete = (status: string) =>
    status !== "APPROVED";

  it("DRAFT can be edited", () => expect(canEdit("DRAFT")).toBe(true));
  it("REJECTED can be edited", () => expect(canEdit("REJECTED")).toBe(true));
  it("PENDING_APPROVAL cannot be edited", () => expect(canEdit("PENDING_APPROVAL")).toBe(false));
  it("APPROVED cannot be edited", () => expect(canEdit("APPROVED")).toBe(false));

  it("DRAFT can be submitted", () => expect(canSubmit("DRAFT")).toBe(true));
  it("REJECTED can be submitted", () => expect(canSubmit("REJECTED")).toBe(true));

  it("PENDING_APPROVAL can be approved", () => expect(canApprove("PENDING_APPROVAL")).toBe(true));
  it("DRAFT cannot be approved", () => expect(canApprove("DRAFT")).toBe(false));

  it("DRAFT can be deleted", () => expect(canDelete("DRAFT")).toBe(true));
  it("APPROVED cannot be deleted", () => expect(canDelete("APPROVED")).toBe(false));
});
