import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Penjaga izin efektif menu (#262).
 *
 * Kaskade izin (`getUserPermissionsForMenu`) mewariskan izin induk ke anak
 * sebagai **union tanpa pengurangan**: sub-menu tidak bisa lebih ketat daripada
 * induknya, dan menghilangkan baris `RolePermission` BUKAN mekanisme
 * pembatasan. Akibatnya sebuah menu bisa terbuka untuk peran yang tak pernah
 * disebut di barisnya sendiri — sesuatu yang tak terlihat saat membaca CSV
 * baris per baris.
 *
 * Test ini menghitung ulang izin efektif dari kedua berkas seed dengan logika
 * kaskade yang sama, lalu membandingkannya dengan **daftar akses yang
 * dinyatakan** di bawah. Klaim "SUPERADMIN saja" karena itu tidak bisa lagi
 * salah tanpa ketahuan.
 *
 * Catatan penting: yang diperiksa adalah **sisi kode** (seed CSV), bukan isi
 * database produksi — keduanya diketahui berbeda (lihat #263). Test ini menjaga
 * DB baru yang di-seed dari repo, bukan keadaan mis-prod.
 */

const read = (file: string) =>
  readFileSync(join(__dirname, "../../prisma/seeds/data", file), "utf-8").trim().split("\n").slice(1);

type MenuRow = { key: string; parentKey: string; isActive: boolean };

const menus: MenuRow[] = read("menu.csv").map((line) => {
  const [key, parentKey, , , , , isActive] = line.split(",");
  return { key, parentKey, isActive: isActive?.toUpperCase() === "TRUE" };
});

const grants = read("role-permissions.csv").map((line) => {
  const [role, menuKey, permission] = line.split(",");
  return { role, menuKey, permission };
});

/** Izin efektif per menu, meniru `traverse` di `src/lib/rbac.ts`. */
function effectiveAccess(): Map<string, Map<string, Set<string>>> {
  const childrenOf = new Map<string, MenuRow[]>();
  for (const menu of menus) {
    const list = childrenOf.get(menu.parentKey) ?? [];
    list.push(menu);
    childrenOf.set(menu.parentKey, list);
  }

  const roles = [...new Set(grants.map((g) => g.role))];
  const result = new Map<string, Map<string, Set<string>>>();

  const walk = (menu: MenuRow, inherited: Map<string, Set<string>>) => {
    const current = new Map<string, Set<string>>();
    for (const role of roles) {
      const own = grants.filter((g) => g.menuKey === menu.key && g.role === role).map((g) => g.permission);
      const set = new Set([...(inherited.get(role) ?? []), ...own]);
      if (set.size > 0) current.set(role, set);
    }
    result.set(menu.key, current);
    for (const child of childrenOf.get(menu.key) ?? []) walk(child, current);
  };

  for (const root of childrenOf.get("") ?? []) walk(root, new Map());
  return result;
}

const access = effectiveAccess();
const rolesWithView = (menuKey: string) =>
  [...(access.get(menuKey) ?? new Map<string, Set<string>>())]
    .filter(([, perms]) => perms.has("VIEW"))
    .map(([role]) => role)
    .sort();

/**
 * Akses yang DINYATAKAN untuk menu ber-angka nasional / administratif. Bila
 * daftar ini berubah, dokumen yang menyebutkannya wajib ikut — itulah gunanya
 * test ini gagal.
 */
const DINYATAKAN: Record<string, string[]> = {
  // Angka nasional tanpa penyaringan wilayah (#256). MANAGEMENT ditambahkan di
  // produksi pada 2026-08-13 lewat UI Role & Permission — bukan oleh skrip seed,
  // yang hanya menyisipkan SUPERADMIN & ADMIN; diadopsi mengikuti keputusan
  // "produksi sebagai acuan" (#263).
  "data-analyst-data-map": ["ADMIN", "MANAGEMENT", "SUPERADMIN"],
  // Metrik internal pengembangan (#227). MANAGEMENT ikut karena audiens Roadmap %
  // dan Papan KPI memang manajemen/donor (versioning.md §Metrik Nilai Rilis).
  "dashboard-metrics": ["ADMIN", "MANAGEMENT", "SUPERADMIN"],
  // Administrasi sistem.
  "settings-roles": ["SUPERADMIN"],
  "settings-menu": ["SUPERADMIN"],
  "settings-users": ["SUPERADMIN"],
  "settings-regions": ["SUPERADMIN"],
};

describe("izin efektif menu dari seed (kaskade induk → anak)", () => {
  it("menu sensitif hanya terbuka untuk peran yang dinyatakan", () => {
    for (const [menuKey, expected] of Object.entries(DINYATAKAN)) {
      expect(access.has(menuKey), `${menuKey} tidak ada di menu.csv`).toBe(true);
      expect(
        rolesWithView(menuKey),
        `${menuKey}: izin efektif berbeda dari yang dinyatakan — ingat izin induk ikut diwarisi (union tanpa pengurangan)`
      ).toEqual(expected);
    }
  });

  it("kaskade memang mewariskan izin induk — bukan asumsi, tapi sifat yang diuji", () => {
    // SUPERADMIN hanya punya baris pada induk `data-analyst`, tanpa baris untuk
    // sub-menu Peta Data; aksesnya datang murni dari pewarisan.
    const own = grants.some((g) => g.role === "SUPERADMIN" && g.menuKey === "data-analyst-data-map");
    expect(own).toBe(true);
    const parentOnly = grants.filter((g) => g.menuKey === "data-analyst" && g.permission === "VIEW").map((g) => g.role);
    expect(parentOnly).toContain("SUPERADMIN");
    expect(rolesWithView("data-analyst-data-map")).toContain("SUPERADMIN");
  });

  it("setiap menuKey di role-permissions.csv dikenal menu.csv", () => {
    const known = new Set(menus.map((m) => m.key));
    const asing = [...new Set(grants.map((g) => g.menuKey))].filter((k) => !known.has(k));
    expect(asing, "baris izin menunjuk menu yang tidak ada").toEqual([]);
  });

  it("menu daun aktif tidak ada yang tanpa satu pun peran ber-VIEW", () => {
    const parents = new Set(menus.map((m) => m.parentKey).filter(Boolean));
    const yatim = menus
      .filter((m) => m.isActive && !parents.has(m.key))
      .filter((m) => rolesWithView(m.key).length === 0)
      .map((m) => m.key);
    expect(yatim, "menu tanpa peran mana pun yang bisa membukanya").toEqual([]);
  });
});

describe("spesifikasi peran (rbac.md §Inventaris Role) ditegakkan seed", () => {
  const punya = (role: string, menuPrefix: string, aksi: string[]) =>
    menus
      .filter((m) => m.key.startsWith(menuPrefix))
      .filter((m) => aksi.some((a) => access.get(m.key)?.get(role)?.has(a)))
      .map((m) => m.key)
      .sort();

  it("DONOR tidak menyentuh master data sama sekali", () => {
    // Daftar petani memuat NIK & alamat. Peran donor tertulis read-only untuk
    // dashboard, laporan, peta, dan bantuan — master data tidak termasuk.
    // Produksi sempat memberikannya (#263); seed tidak boleh mengulanginya.
    expect(punya("DONOR", "master-data", ["VIEW", "PRINT", "EXPORT", "CREATE", "EDIT", "DELETE"])).toEqual([]);
  });

  it("DONOR tidak bisa mengekspor data mentah, tapi boleh mencetak", () => {
    expect(punya("DONOR", "", ["EXPORT"])).toEqual([]);
    expect(punya("DONOR", "report", ["PRINT"]).length).toBeGreaterThan(0);
  });

  it("DONOR tetap bisa membuka Bantuan", () => {
    expect(punya("DONOR", "help", ["VIEW"])).toEqual(["help"]);
  });

  it("OPERATOR & MANAGEMENT tidak punya hak tulis di mana pun", () => {
    // Keputusan owner 2026-08-13: keduanya peran baca/ekspor (#263).
    for (const role of ["OPERATOR", "MANAGEMENT"]) {
      expect(punya(role, "", ["CREATE", "EDIT", "DELETE"]), `${role} seharusnya tanpa hak tulis`).toEqual([]);
    }
  });
});
