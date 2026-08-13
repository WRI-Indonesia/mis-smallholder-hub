import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { scanLineage } from "../../scripts/lineage-scan";
import { DATA_LINEAGE, INFRA_MODELS, UNMAPPED_ROUTES } from "@/lib/data-lineage.generated";

/**
 * Penjaga artefak jalur data (#256): pindai ulang kode lalu bandingkan dengan
 * berkas turunan yang di-commit. Artefak basi = test gagal, sehingga "lupa
 * `npm run build:lineage`" ketahuan di gate lokal, bukan setelah halaman Peta
 * Data menampilkan jalur yang sudah tidak benar.
 */

const scan = scanLineage(process.cwd());

const REGENERATE = "jalankan `npm run build:lineage` lalu commit ulang berkas turunannya";

describe("data-lineage.generated.ts — kesegaran artefak", () => {
  it("daftar menu → entitas sama dengan hasil pindai kode saat ini", () => {
    // Bandingkan per menu supaya pesan gagalnya menunjuk menu yang berubah.
    expect(scan.entries.map((e) => e.menuKey), REGENERATE).toEqual(DATA_LINEAGE.map((e) => e.menuKey));
    for (const entry of scan.entries) {
      const stored = DATA_LINEAGE.find((e) => e.menuKey === entry.menuKey);
      expect(stored?.models, `${entry.menuKey}: ${REGENERATE}`).toEqual(entry.models);
      expect(stored?.modules, `${entry.menuKey}: ${REGENERATE}`).toEqual(entry.modules);
      expect(stored?.route, `${entry.menuKey}: ${REGENERATE}`).toBe(entry.route);
    }
  });

  it("entitas infrastruktur & rute tak terpetakan juga sama", () => {
    expect(scan.infraModels, REGENERATE).toEqual(INFRA_MODELS);
    expect(scan.unmapped, REGENERATE).toEqual(UNMAPPED_ROUTES);
  });
});

describe("data-lineage — invarian hasil pindai", () => {
  it("kunci menu unik dan jenis akses hanya R/W/RW", () => {
    const keys = scan.entries.map((e) => e.menuKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const entry of scan.entries) {
      for (const access of Object.values(entry.models)) {
        expect(["R", "W", "RW"]).toContain(access);
      }
    }
  });

  it("setiap entitas yang tercatat benar-benar ada di skema Prisma", () => {
    // Menangkap salah ketik dan model yang di-rename tanpa memperbarui pemindai:
    // nama di lineage adalah properti client (camelCase) dari model DMMF.
    const known = new Set(
      Prisma.dmmf.datamodel.models.map((m) => m.name[0].toLowerCase() + m.name.slice(1))
    );
    const seen = new Set([
      ...scan.entries.flatMap((e) => Object.keys(e.models)),
      ...Object.keys(scan.infraModels),
    ]);
    for (const model of seen) expect(known, `entitas tak dikenal: ${model}`).toContain(model);
  });

  it("menu yang jelas menulis tercatat sebagai W/RW, yang jelas membaca tidak menulis", () => {
    // Beberapa jangkar yang harus benar; kalau pemindai rusak, ini yang pertama pecah.
    const entry = (key: string) => scan.entries.find((e) => e.menuKey === key);
    expect(entry("settings-regions")?.models.province).toBe("RW");
    expect(entry("master-data-farmers")?.models.farmer).toBe("RW");
    expect(entry("bulk-upload-trees")?.models.tree).toBe("RW");
    // Laporan hanya membaca — tidak boleh ada satu pun W.
    for (const key of ["report-farmer", "report-production", "report-training"]) {
      const models = Object.values(entry(key)?.models ?? {});
      expect(models.length, `${key} tidak terpetakan`).toBeGreaterThan(0);
      expect(models.every((a) => a === "R"), `${key} seharusnya baca-saja`).toBe(true);
    }
  });

  it("halaman yang tidak menyentuh DB tercatat tanpa entitas domain", () => {
    // Metrik Rilis membaca berkas .md (#227/#250), bukan database — kalau suatu
    // saat ia menyentuh entitas, itu perubahan arsitektur yang harus disadari.
    expect(scan.entries.find((e) => e.menuKey === "dashboard-metrics")?.models).toEqual({});
  });

  it("guard RBAC terdeteksi sebagai infrastruktur, bukan milik satu menu", () => {
    expect(Object.keys(scan.infraModels)).toContain("rolePermission");
    // Entitas RBAC hanya boleh muncul di menu Settings yang memang mengelolanya
    // (settings-roles menulis matriks peran; settings-users membacanya untuk
    // menampilkan izin efektif sebelum override per-pengguna). Kalau ia bocor ke
    // menu domain, berarti pemisahan infrastruktur di pemindai rusak.
    const owners = scan.entries.filter((e) => "rolePermission" in e.models).map((e) => e.menuKey);
    expect(owners).toEqual(["settings-roles", "settings-users"]);
  });
});
