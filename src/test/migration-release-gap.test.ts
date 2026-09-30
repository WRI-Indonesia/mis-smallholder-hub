import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  appliedMigrations,
  latestReleaseTag,
  migrationNames,
  migrationReleaseGap,
} from "@/lib/migration-release-gap";

// #376 / TD-045 — tanpa DB & tanpa git: fixture checksum + daftar migrasi tag.

describe("latestReleaseTag", () => {
  it("memilih SemVer tertinggi, bukan urutan leksikal", () => {
    expect(latestReleaseTag(["v1.2.0", "v1.10.0", "v1.9.3", "v0.38.0"])).toBe("v1.10.0");
    expect(latestReleaseTag(["v2.0.0", "v1.99.99"])).toBe("v2.0.0");
  });

  it("mengabaikan tag non-rilis (v1.8-complete, rc) dan baris kosong", () => {
    expect(latestReleaseTag(["v1.8-complete", "v1.2.0", "v1.3.0-rc1", "", "  v1.1.0  "])).toBe("v1.2.0");
    expect(latestReleaseTag(["v1.8-complete", ""])).toBeNull();
  });
});

describe("migrationNames", () => {
  it("hanya folder migrasi Prisma; abaikan berkas pendamping & path", () => {
    expect(
      migrationNames([
        "prisma/migrations/20260923120000_external_id_shared_code/",
        "20260521232859_init",
        "applied-checksums.json",
        "migration_lock.toml",
        "",
      ])
    ).toEqual(["20260521232859_init", "20260923120000_external_id_shared_code"]);
  });

  it("nama tak lazim tetap dihitung — tidak hilang diam-diam dari perbandingan", () => {
    expect(migrationNames(["20261001000000_AddIndex-Produksi"])).toEqual(["20261001000000_AddIndex-Produksi"]);
  });
});

describe("appliedMigrations", () => {
  it("membaca nama dari `checksums` snapshot + sumber & tanggalnya", () => {
    const json = JSON.stringify({
      source: "mis-prod",
      refreshedAt: "2026-09-23",
      checksums: { "20260923120000_external_id_shared_code": "b", "20260521232859_init": "a" },
    });
    expect(appliedMigrations(json)).toEqual({
      names: ["20260521232859_init", "20260923120000_external_id_shared_code"],
      source: "mis-prod",
      refreshedAt: "2026-09-23",
    });
  });

  it("gagal keras bila format snapshot berubah", () => {
    expect(() => appliedMigrations(JSON.stringify({ source: "mis-prod" }))).toThrow(/checksums/);
  });

  it("applied-checksums.json nyata terbaca dan tidak kosong", () => {
    const real = appliedMigrations(readFileSync(join(process.cwd(), "prisma", "migrations", "applied-checksums.json"), "utf8"));
    expect(real.source).toBe("mis-prod");
    expect(real.names.length).toBeGreaterThan(30);
  });
});

describe("migrationReleaseGap", () => {
  const base = ["20260521232859_init", "20260914100000_land_parcel_geom"];

  it("kasus #373: migrasi applied di prod sebelum tag rilis memuatnya → appliedNotInTag", () => {
    const gap = migrationReleaseGap([...base, "20260923120000_external_id_shared_code"], base);
    expect(gap).toEqual({ appliedNotInTag: ["20260923120000_external_id_shared_code"], inTagNotApplied: [] });
  });

  it("tag memuat migrasi yang belum applied (atau snapshot basi) → inTagNotApplied", () => {
    const gap = migrationReleaseGap(base, [...base, "20261001000000_production_index"]);
    expect(gap).toEqual({ appliedNotInTag: [], inTagNotApplied: ["20261001000000_production_index"] });
  });

  it("sama persis → tidak ada jendela terbuka", () => {
    expect(migrationReleaseGap(base, [...base].reverse())).toEqual({ appliedNotInTag: [], inTagNotApplied: [] });
  });
});
