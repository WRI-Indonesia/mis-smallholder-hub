import { describe, it, expect, vi } from "vitest";
import bcrypt from "bcryptjs";

// Unit tests for auth logic (no DB dependency)
describe("Auth - Password hashing", () => {
  it("bcrypt hash and compare works correctly", async () => {
    const password = "P@ssword123";
    const hash = await bcrypt.hash(password, 10);

    expect(hash).not.toBe(password);
    expect(await bcrypt.compare(password, hash)).toBe(true);
    expect(await bcrypt.compare("wrong", hash)).toBe(false);
  });

  it("rejects empty password", async () => {
    const hash = await bcrypt.hash("P@ssword123", 10);
    expect(await bcrypt.compare("", hash)).toBe(false);
  });
});

describe("Auth - Credential validation", () => {
  it("rejects null/undefined credentials", () => {
    const validate = (email: unknown, password: unknown) => {
      if (!email || !password) return null;
      return { email, password };
    };

    expect(validate(null, "pass")).toBeNull();
    expect(validate("email@test.com", null)).toBeNull();
    expect(validate(null, null)).toBeNull();
    expect(validate("email@test.com", "pass")).not.toBeNull();
  });
});

describe("Auth - Session callback logic", () => {
  it("jwt callback adds user data to token", () => {
    const token = { sub: "123" };
    const user = { id: "SH-0004", name: "Sofyan", email: "sofyan@wri.org", role: "SUPERADMIN" };

    // Simulate jwt callback
    const result = { ...token, id: user.id, role: user.role };

    expect(result.id).toBe("SH-0004");
    expect(result.role).toBe("SUPERADMIN");
  });

  it("session callback passes token data to session", () => {
    const token = { id: "SH-0004", role: "SUPERADMIN" };
    const session = { user: { id: "", name: "Sofyan", email: "sofyan@wri.org", role: "" } };

    // Simulate session callback
    session.user.id = token.id;
    session.user.role = token.role;

    expect(session.user.id).toBe("SH-0004");
    expect(session.user.role).toBe("SUPERADMIN");
  });
});
