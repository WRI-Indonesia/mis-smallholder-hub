import { describe, it, expect } from "vitest";

// Unit tests for middleware authorization logic (extracted)
describe("Middleware - Authorization logic", () => {
  const checkAuth = (pathname: string, isLoggedIn: boolean) => {
    const isOnAdmin = pathname.startsWith("/admin");
    const isOnLogin = pathname === "/login";

    if (isOnAdmin && !isLoggedIn) return "redirect-to-login";
    if (isOnLogin && isLoggedIn) return "redirect-to-admin";
    return "allow";
  };

  it("redirects unauthenticated users from /admin to /login", () => {
    expect(checkAuth("/admin", false)).toBe("redirect-to-login");
    expect(checkAuth("/admin/settings/users", false)).toBe("redirect-to-login");
    expect(checkAuth("/admin/master-data/groups", false)).toBe("redirect-to-login");
  });

  it("allows authenticated users to access /admin", () => {
    expect(checkAuth("/admin", true)).toBe("allow");
    expect(checkAuth("/admin/settings/users", true)).toBe("allow");
  });

  it("redirects authenticated users from /login to /admin", () => {
    expect(checkAuth("/login", true)).toBe("redirect-to-admin");
  });

  it("allows unauthenticated users to access /login", () => {
    expect(checkAuth("/login", false)).toBe("allow");
  });

  it("allows public routes regardless of auth", () => {
    expect(checkAuth("/", true)).toBe("allow");
    expect(checkAuth("/", false)).toBe("allow");
    expect(checkAuth("/community", false)).toBe("allow");
  });
});
