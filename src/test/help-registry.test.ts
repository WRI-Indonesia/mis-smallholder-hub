import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

/**
 * Penjaga registrasi & cakupan Bantuan (#257) — statis, tanpa memuat berkas
 * `.md` lewat webpack (vitest tidak punya loader `asset/source`).
 *
 * Tiga hal yang selama ini dihitung tangan tiap rilis dan pernah salah
 * (32/32 dilaporkan, 30/33 terukur — #257):
 * 1. Setiap berkas materi di `src/content/help/**` benar-benar diimpor DAN
 *    dipasang di `CHAPTER_SOURCES` (`help-content.ts`) — berkas yang lupa
 *    didaftarkan tidak pernah tampil di Bantuan tanpa ada yang tahu.
 * 2. Frontmatter tutorial (`menuKey`, `href`, `permission`) menunjuk menu &
 *    URL yang benar-benar ada di `prisma/seeds/data/menu.csv` — tombol
 *    "Buka …" ke halaman yang salah lebih buruk daripada tanpa tombol.
 * 3. Cakupan tutorial per menu daun aktif: menu baru TANPA tutorial membuat
 *    gate merah, kecuali dinyatakan eksplisit di `TANPA_TUTORIAL` beserta alasannya.
 */

const ROOT = join(__dirname, "..");
const HELP_DIR = join(ROOT, "content/help");
const REGISTRY = readFileSync(join(ROOT, "lib/help-content.ts"), "utf-8");

/** Semua berkas `.md` materi (bukan README) relatif terhadap `src/content/help/`. */
function contentFiles(dir = HELP_DIR, prefix = ""): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return contentFiles(full, `${prefix}${name}/`);
    return name.endsWith(".md") && name !== "README.md" ? [`${prefix}${name}`] : [];
  });
}

/** `import alias from "@/content/help/<path>";` → Map path → alias. */
const imports = new Map<string, string>();
for (const m of REGISTRY.matchAll(/^import (\w+) from "@\/content\/help\/([^"]+)";/gm)) imports.set(m[2], m[1]);
/** Alias yang dipasang sebagai `source:` di CHAPTER_SOURCES. */
const registered = new Set([...REGISTRY.matchAll(/source: (\w+)\b/g)].map((m) => m[1]));

function frontmatter(text: string): Record<string, string> {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const out: Record<string, string> = {};
  if (!m) return out;
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z]+):\s*(.*)$/);
    if (kv) out[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

type MenuRow = { key: string; parentKey: string; url: string; isActive: boolean };
const menus: MenuRow[] = readFileSync(join(ROOT, "../prisma/seeds/data/menu.csv"), "utf-8")
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => {
    const [key, parentKey, , url, , , isActive] = line.split(",");
    return { key, parentKey, url, isActive: isActive?.toUpperCase() === "TRUE" };
  });
const menuByKey = new Map(menus.map((m) => [m.key, m]));

const tutorials = contentFiles()
  .filter((f) => f.startsWith("tutorial/"))
  .map((f) => ({ file: f, fm: frontmatter(readFileSync(join(HELP_DIR, f), "utf-8")) }));

/**
 * Menu daun aktif yang DINYATAKAN belum punya tutorial (#257). Menghapus baris
 * dari sini = menulis tutorialnya (atau menambah `menuKey` pada tutorial yang
 * sudah mencakupnya); menambah baris di sini wajib disertai alasan.
 */
const TANPA_TUTORIAL: Record<string, string> = {
  "report-kelompok-tani-detail": "#257 — l-6 hanya ber-menuKey Summary; alur Detail (flat per KT) belum ditulis",
  "dashboard-snapshot-bmp": "#257 — l-3 hanya ber-menuKey dashboard-snapshot; Snapshot BMP punya struktur data sendiri",
  help: "#257 — topik konsep 1-4 'Cara Memakai Bantuan' ada, tetapi bukan tutorial ber-menuKey (keputusan: kecualikan atau beri menuKey)",
};

describe("registrasi materi Bantuan ↔ CHAPTER_SOURCES (help-content.ts)", () => {
  it("setiap berkas .md materi diimpor dan dipasang sebagai topik", () => {
    const files = contentFiles();
    expect(files.length).toBeGreaterThan(40);
    const tidakDiimpor = files.filter((f) => !imports.has(f));
    expect(tidakDiimpor, "berkas materi tanpa baris import — tak pernah tampil di Bantuan").toEqual([]);
    const diimporTapiTakDipasang = files.filter((f) => imports.has(f) && !registered.has(imports.get(f)!));
    expect(diimporTapiTakDipasang, "diimpor tetapi tidak ada di topics[] bab mana pun").toEqual([]);
  });

  it("tidak ada import yang menunjuk berkas yang sudah tidak ada", () => {
    const files = new Set(contentFiles());
    const yatim = [...imports.keys()].filter((f) => !files.has(f));
    expect(yatim, "import ke berkas yang hilang — build akan gagal").toEqual([]);
  });

  it("40 tutorial · 4 referensi · 13 konsep (angka di katalog docs/product/pages/bantuan/README.md)", () => {
    const files = contentFiles();
    expect(files.filter((f) => f.startsWith("tutorial/")).length).toBe(40);
    expect(files.filter((f) => f.startsWith("referensi/")).length).toBe(4);
    expect(files.filter((f) => /^\d-/.test(f)).length).toBe(13);
  });
});

describe("frontmatter tutorial ↔ menu.csv", () => {
  it("setiap tutorial punya title, menuKey, permission, href, hrefLabel, duration, goal", () => {
    for (const t of tutorials) {
      for (const key of ["title", "menuKey", "permission", "href", "hrefLabel", "duration", "goal"]) {
        expect(t.fm[key], `${t.file}: frontmatter "${key}" kosong`).toBeTruthy();
      }
    }
  });

  it("menuKey dikenal menu.csv dan href berada di bawah URL menu itu", () => {
    for (const t of tutorials) {
      const keys = t.fm.menuKey.split(/[,\s]+/).filter(Boolean);
      for (const key of keys) {
        const menu = menuByKey.get(key);
        expect(menu, `${t.file}: menuKey "${key}" tidak ada di menu.csv`).toBeDefined();
      }
      // href mengikuti menu PERTAMA (menu utama tutorial); menu.csv memakai URL tanpa query.
      const primary = menuByKey.get(keys[0])!;
      const hrefPath = t.fm.href.split("?")[0];
      expect(hrefPath === primary.url || hrefPath.startsWith(`${primary.url}/`), `${t.file}: href "${t.fm.href}" bukan di bawah URL menu ${primary.key} (${primary.url})`).toBe(true);
    }
  });

  it("permission memakai level izin yang dikenal RBAC", () => {
    const levels = new Set(["VIEW", "CREATE", "EDIT", "DELETE", "EXPORT", "PRINT"]);
    for (const t of tutorials) expect(levels.has(t.fm.permission), `${t.file}: permission "${t.fm.permission}"`).toBe(true);
  });
});

describe("cakupan tutorial per menu daun aktif (#257)", () => {
  const parents = new Set(menus.map((m) => m.parentKey).filter(Boolean));
  const leaves = menus.filter((m) => m.isActive && !parents.has(m.key));
  const covered = new Set(tutorials.flatMap((t) => t.fm.menuKey.split(/[,\s]+/).filter(Boolean)));

  it("menu daun tanpa tutorial = persis yang dinyatakan di TANPA_TUTORIAL", () => {
    const missing = leaves.filter((m) => !covered.has(m.key)).map((m) => m.key).sort();
    expect(missing, "menu baru tanpa tutorial — tulis tutorialnya atau nyatakan di TANPA_TUTORIAL beserta alasan").toEqual(Object.keys(TANPA_TUTORIAL).sort());
  });

  it("TANPA_TUTORIAL tidak menyebut menu yang sudah tercakup atau tidak ada", () => {
    for (const key of Object.keys(TANPA_TUTORIAL)) {
      expect(menuByKey.has(key), `${key} tidak ada di menu.csv — hapus dari TANPA_TUTORIAL`).toBe(true);
      expect(covered.has(key), `${key} sudah punya tutorial — hapus dari TANPA_TUTORIAL`).toBe(false);
    }
  });

  it("angka cakupan = 34/37 (metrics.md & versioning.md §Metrik Nilai Rilis)", () => {
    expect([leaves.length - Object.keys(TANPA_TUTORIAL).length, leaves.length]).toEqual([34, 37]);
  });
});
