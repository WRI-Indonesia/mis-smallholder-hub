import { describe, expect, it } from "vitest";
import { firstAccessibleChild } from "@/lib/menu-first-child";

/** TD-051 (#412): indeks menu induk → anak pertama yang boleh diakses, bukan anak tetap. */
describe("firstAccessibleChild", () => {
  const children = [
    { key: "settings-users", url: "/admin/settings/users" },
    { key: "settings-menu", url: "/admin/settings/menu" },
    { key: "settings-roles", url: "/admin/settings/roles" },
  ];
  it("anak pertama menurut urutan yang ada di himpunan izin", () => {
    expect(firstAccessibleChild(children, new Set(["settings-roles", "settings-menu"]))?.key).toBe("settings-menu");
    expect(firstAccessibleChild(children, ["settings-users"])?.url).toBe("/admin/settings/users");
  });
  it("tanpa anak yang boleh → null (pemanggil jatuh ke /admin)", () => {
    expect(firstAccessibleChild(children, new Set())).toBeNull();
    expect(firstAccessibleChild([], new Set(["x"]))).toBeNull();
  });
});
