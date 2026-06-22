import { describe, it, expect } from "vitest";
import { z } from "zod";

// Test validation schemas (no DB dependency)
const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["SUPERADMIN", "ADMIN", "OPERATOR", "MANAGEMENT"]),
});

const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(["SUPERADMIN", "ADMIN", "OPERATOR", "MANAGEMENT"]),
  password: z.string().min(6).optional().or(z.literal("")),
});

describe("User Validation - Create", () => {
  it("accepts valid input", () => {
    const result = createUserSchema.safeParse({
      name: "Test User",
      email: "test@wri.org",
      password: "P@ssword123",
      role: "OPERATOR",
    });
    expect(result.success).toBe(true);
  });

  it("rejects short name", () => {
    const result = createUserSchema.safeParse({
      name: "T",
      email: "test@wri.org",
      password: "P@ssword123",
      role: "OPERATOR",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = createUserSchema.safeParse({
      name: "Test",
      email: "not-an-email",
      password: "P@ssword123",
      role: "OPERATOR",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = createUserSchema.safeParse({
      name: "Test",
      email: "test@wri.org",
      password: "123",
      role: "OPERATOR",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid role", () => {
    const result = createUserSchema.safeParse({
      name: "Test",
      email: "test@wri.org",
      password: "P@ssword123",
      role: "INVALID",
    });
    expect(result.success).toBe(false);
  });
});

describe("User Validation - Update", () => {
  it("accepts valid update without password", () => {
    const result = updateUserSchema.safeParse({
      id: "user-001",
      name: "Updated Name",
      email: "updated@wri.org",
      role: "ADMIN",
      password: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid update with new password", () => {
    const result = updateUserSchema.safeParse({
      id: "user-001",
      name: "Updated",
      email: "test@wri.org",
      role: "ADMIN",
      password: "NewP@ss123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects update with short new password", () => {
    const result = updateUserSchema.safeParse({
      id: "user-001",
      name: "Updated",
      email: "test@wri.org",
      role: "ADMIN",
      password: "123",
    });
    expect(result.success).toBe(false);
  });
});

describe("User List - Status filter logic", () => {
  const users = [
    { id: "1", name: "Active User", email: "a@t.com", isActive: true },
    { id: "2", name: "Inactive User", email: "b@t.com", isActive: false },
    { id: "3", name: "Another Active", email: "c@t.com", isActive: true },
  ];

  function filterUsers(list: typeof users, status: "all" | "active" | "inactive") {
    return list.filter((u) =>
      status === "all" ? true :
      status === "active" ? u.isActive :
      !u.isActive
    );
  }

  it("shows all users with 'all' filter", () => {
    expect(filterUsers(users, "all")).toHaveLength(3);
  });

  it("shows only active users", () => {
    const result = filterUsers(users, "active");
    expect(result).toHaveLength(2);
    expect(result.every((u) => u.isActive)).toBe(true);
  });

  it("shows only inactive users", () => {
    const result = filterUsers(users, "inactive");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Inactive User");
  });
});
