import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import { scanSchema } from "../../scripts/schema-scan";
import { DATA_SCHEMA } from "@/lib/data-schema.generated";
import { countableFields, entitiesByDomain, findEntity, relationsOf } from "@/lib/data-schema";

/**
 * Dua lapis penjagaan:
 * 1. **Kesegaran** — pindai ulang `prisma/schema/*.prisma` lalu bandingkan
 *    dengan artefak yang di-commit; basi = gagal.
 * 2. **Silang sumber** — nama model & field hasil pindai harus cocok dengan
 *    `Prisma.dmmf` (metadata yang ikut ter-generate bersama Prisma Client).
 *    Parser buatan sendiri jadi tidak pernah menyimpang diam-diam dari yang
 *    benar-benar dipakai aplikasi.
 */

const scan = scanSchema(process.cwd());
const REGENERATE = "jalankan `npm run build:schema` lalu commit ulang berkas turunannya";

const entity = (name: string) => scan.entities.find((e) => e.name === name);
const relation = (from: string, to: string) => scan.relations.filter((r) => r.from === from && r.to === to);

describe("data-schema.generated.ts — kesegaran artefak", () => {
  it("entitas, relasi, dan enum sama dengan hasil pindai skema saat ini", () => {
    expect(scan.entities.map((e) => e.name), REGENERATE).toEqual(DATA_SCHEMA.entities.map((e) => e.name));
    for (const e of scan.entities) {
      expect(DATA_SCHEMA.entities.find((x) => x.name === e.name), `${e.name}: ${REGENERATE}`).toEqual(e);
    }
    expect(scan.relations, REGENERATE).toEqual(DATA_SCHEMA.relations);
    expect(scan.enums, REGENERATE).toEqual(DATA_SCHEMA.enums);
  });
});

describe("schema-scan — silang dengan Prisma.dmmf", () => {
  it("daftar model identik dengan yang dibawa Prisma Client", () => {
    const fromDmmf = Prisma.dmmf.datamodel.models.map((m) => m.name).sort();
    expect(scan.entities.map((e) => e.name)).toEqual(fromDmmf);
  });

  it("daftar field tiap model identik, termasuk nama kolom @map", () => {
    for (const model of Prisma.dmmf.datamodel.models) {
      const scanned = entity(model.name);
      expect(scanned, `${model.name} tidak terbaca pemindai`).toBeDefined();
      expect(scanned!.fields.map((f) => f.name).sort(), model.name).toEqual(
        model.fields.map((f) => f.name).sort()
      );
      expect(scanned!.tableName, `${model.name}: @@map`).toBe(model.dbName ?? null);
      for (const field of model.fields) {
        const s = scanned!.fields.find((f) => f.name === field.name);
        expect(s!.type, `${model.name}.${field.name}`).toBe(field.type);
        expect(s!.dbName ?? undefined, `${model.name}.${field.name}: @map`).toBe(field.dbName ?? undefined);
      }
    }
  });
});

describe("schema-scan — penafsiran skema", () => {
  it("membaca penanda yang tidak ada di DMMF: wajib/opsional, @id, @unique", () => {
    const farmer = entity("Farmer");
    expect(farmer?.fields.find((f) => f.name === "id")?.isId).toBe(true);
    expect(farmer?.fields.find((f) => f.name === "name")?.isRequired).toBe(true);
    expect(farmer?.fields.find((f) => f.name === "nik")?.isRequired).toBe(false);
    // Keunikan ID Petani berlaku per Lembaga (TD-024) — sebagai @@unique gabungan.
    expect(farmer?.compoundUnique).toContainEqual(["farmerGroupId", "farmerId"]);
  });

  it("arah 1:n memakai sisi 'memiliki banyak' sebagai induk", () => {
    expect(relation("Province", "District").map((r) => r.kind)).toContain("1:n");
    expect(relation("FarmerGroup", "Farmer").map((r) => r.kind)).toContain("1:n");
    expect(relation("Farmer", "LandParcel").map((r) => r.kind)).toContain("1:n");
    expect(relation("LandParcel", "Tree").map((r) => r.kind)).toContain("1:n");
    // Arah terbalik tidak boleh ikut tergambar sebagai edge terpisah.
    expect(relation("District", "Province")).toEqual([]);
  });

  it("relasi bernama dipasangkan lewat namanya, termasuk relasi ke diri sendiri", () => {
    const hierarchy = scan.relations.find((r) => r.key === "MenuHierarchy");
    expect(hierarchy?.isSelf).toBe(true);
    expect(hierarchy?.from).toBe("MenuItem");
    // Dua relasi berbeda ke User tidak boleh tertukar jadi satu edge.
    const snapshots = scan.relations.filter((r) => r.key.endsWith("DashboardSnapshots"));
    expect(snapshots.map((r) => r.key).sort()).toEqual(["BmpDashboardSnapshots", "MainDashboardSnapshots"]);
  });

  it("setiap relasi menunjuk entitas yang ada, dan kuncinya unik", () => {
    const known = new Set(scan.entities.map((e) => e.name));
    const keys = scan.relations.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const r of scan.relations) {
      expect(known, `${r.key}: ${r.from}`).toContain(r.from);
      expect(known, `${r.key}: ${r.to}`).toContain(r.to);
    }
  });

  it("enum terbaca beserta nilainya", () => {
    const role = scan.enums.find((e) => e.name === "Role");
    expect(role?.values).toContain("SUPERADMIN");
    expect(role?.values).toContain("DONOR");
  });

  it("domain diambil dari nama berkas skema", () => {
    expect(entity("Farmer")?.domain).toBe("farmer");
    expect(entity("Province")?.domain).toBe("geography");
    expect(entity("RolePermission")?.domain).toBe("rbac");
    expect(entitiesByDomain(scan).length).toBeGreaterThan(5);
  });
});

describe("pembantu data-schema", () => {
  it("findEntity menerima nama model maupun nama properti client", () => {
    expect(findEntity("FarmerGroup")?.name).toBe("FarmerGroup");
    expect(findEntity("farmerGroup")?.name).toBe("FarmerGroup");
  });

  it("countableFields membuang relasi dan kolom Json", () => {
    const parcel = findEntity("LandParcel");
    const names = countableFields(parcel!).map((f) => f.name);
    expect(names).toContain("parcelId");
    expect(names).not.toContain("geometry"); // Json — tidak bisa di-_count
    expect(names).not.toContain("farmer"); // relasi
  });

  it("relationsOf mengambil relasi dari kedua arah", () => {
    const keys = relationsOf("LandParcel").map((r) => `${r.from}→${r.to}`);
    expect(keys).toContain("Farmer→LandParcel");
    expect(keys).toContain("LandParcel→Tree");
  });
});
