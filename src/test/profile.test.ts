import { describe, it, expect } from "vitest";
import { changePasswordSchema } from "@/validations/profile.schema";

describe("changePassword validation (#130)", () => {
  it("accepts a valid current + new password", () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: "oldpass",
      newPassword: "newpass6",
    });
    expect(r.success).toBe(true);
  });

  it("rejects a new password shorter than 6 characters", () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: "oldpass",
      newPassword: "123",
    });
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.newPassword?.[0]).toContain("minimal 6");
  });

  it("rejects an empty current password", () => {
    const r = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: "newpass6",
    });
    expect(r.success).toBe(false);
  });
});
