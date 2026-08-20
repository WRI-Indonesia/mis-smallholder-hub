/**
 * Seed batas administrasi (BIG) → tbl_administrative_boundary. Issue #266.
 *
 * Config-driven per level: menambah level (KECAMATAN/DESA) = tambah entri
 * LEVELS + file zip-nya di data-batas-administrasi/, tanpa ubah struktur.
 * File BIG memakai skema atribut seragam: NAMOBJ (nama), KDBPUM (kode),
 * WADMKK/WADMKC (nama wilayah induk). Shapefile sudah WGS84 (PolygonZ —
 * koordinat Z dibuang saat konversi).
 *
 * Perilaku: idempotent per level (soft-delete semua baris aktif level tsb,
 * lalu insert baru); nama kabupaten dicocokkan ke reg_district (case-
 * insensitive) untuk mengisi FK district_id bila wilayahnya wilayah program.
 *
 * Berkas ZIP-nya adalah DATA — TIDAK ada di repo (#279): letaknya di
 * `scripts/local/` yang gitignored, atau di mana pun lewat `--data=<dir>` /
 * env `SEED_DATA_DIR`.
 *
 * Jalankan (dry-run default, tulis dengan --apply):
 *   npx dotenv -e .env -- npx tsx scripts/seed/seed-batas-administrasi.ts
 *   npx dotenv -e .env -- npx tsx scripts/seed/seed-batas-administrasi.ts --apply
 *   ... --data=/path/ke/folder-zip     (bila data tidak di lokasi bawaan)
 */
import "dotenv/config";
import { readFileSync, existsSync } from "fs";
import { isAbsolute, join, resolve } from "path";
import { PrismaClient, Prisma, type AdminBoundaryLevel } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import type { FeatureCollection, MultiPolygon, Polygon, Position } from "geojson";

// shpjs (build CJS) merujuk global `self` milik browser — shim sebelum impor dinamis.
(globalThis as { self?: unknown }).self = globalThis;

/** Lokasi bawaan berkas data (gitignored) — bisa ditimpa --data / SEED_DATA_DIR. */
const DEFAULT_DATA_DIR = "scripts/local/seed/data-batas-administrasi";
const APPLY = process.argv.includes("--apply");

function resolveDataDir(): string {
  const flag = process.argv.find((a) => a.startsWith("--data="))?.slice("--data=".length);
  const dir = flag || process.env.SEED_DATA_DIR || DEFAULT_DATA_DIR;
  return isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
}

type LevelConfig = {
  level: AdminBoundaryLevel;
  file: string;
  /** Atribut nama induk pada skema BIG (kecamatan → WADMKK, desa → WADMKC). */
  parentField: string | null;
};

const LEVELS: LevelConfig[] = [
  { level: "KABUPATEN", file: "Batas_Administrasi_Kabupaten_Riau.zip", parentField: "WADMPR" },
  // { level: "KECAMATAN", file: "...", parentField: "WADMKK" },
  // { level: "DESA", file: "...", parentField: "WADMKC" },
];

function dbLabel(url: string | undefined): string {
  if (!url) return "(DATABASE_URL kosong)";
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "5432"}/${u.pathname.replace("/", "")}`;
  } catch {
    return "(DATABASE_URL tidak valid)";
  }
}

/** Polygon/PolygonZ → MultiPolygon 2D (buang koordinat Z shapefile BIG). */
function toMultiPolygon2D(geom: Polygon | MultiPolygon): MultiPolygon {
  const strip = (ring: Position[]) => ring.map((p) => [p[0], p[1]] as Position);
  const coords =
    geom.type === "MultiPolygon"
      ? geom.coordinates.map((poly) => poly.map(strip))
      : [geom.coordinates.map(strip)];
  return { type: "MultiPolygon", coordinates: coords };
}

async function main() {
  const dataDir = resolveDataDir();
  console.log(`DB efektif : ${dbLabel(process.env.DATABASE_URL)}`);
  console.log(`Data       : ${dataDir}`);
  console.log(`Mode       : ${APPLY ? "APPLY (menulis DB)" : "DRY-RUN (tanpa menulis; tambah --apply untuk menulis)"}\n`);

  const { default: shp } = await import("shpjs");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const districts = await prisma.district.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
    });
    const districtByName = new Map(districts.map((d) => [d.name.trim().toLowerCase(), d.id]));
    // Kedua sisi punya kunci numerik yang stabil: BIG `KDBPUM` ("14.01") dan
    // `District.code` ("1401"). Kode dicoba LEBIH DULU karena kecocokan nama
    // rapuh — "Kab. Kampar" atau distrik yang di-rename membuat district_id
    // null tanpa error, dan `programAreas` di klien kini bergantung penuh
    // padanya (cetak per distrik langsung gagal, tooltip runtuh ke "Lainnya").
    const districtByCode = new Map(
      districts.map((d) => [d.code.replace(/\D/g, ""), d.id])
    );

    let found = 0;
    for (const cfg of LEVELS) {
      const path = join(dataDir, cfg.file);
      if (!existsSync(path)) {
        console.log(`— ${cfg.level}: ${cfg.file} tidak ada, dilewati.`);
        continue;
      }
      found++;
      const zip = readFileSync(path);
      const parsed = await shp(zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength));
      const fc = (Array.isArray(parsed) ? parsed[0] : parsed) as FeatureCollection;

      const errors: string[] = [];
      const plan: {
        name: string;
        code: string | null;
        parentName: string | null;
        districtId: string | null;
        geometry: MultiPolygon;
      }[] = [];

      for (const f of fc.features) {
        const props = (f.properties ?? {}) as Record<string, unknown>;
        const name = String(props.NAMOBJ ?? "").trim();
        if (!name) {
          errors.push("Fitur tanpa atribut NAMOBJ.");
          continue;
        }
        const geom = f.geometry;
        if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) {
          errors.push(`"${name}" bergeometri ${geom?.type ?? "kosong"} (harus Polygon/MultiPolygon).`);
          continue;
        }
        const geometry = toMultiPolygon2D(geom);
        // Ring kosong = GeoJSON sah; tanpa guard, [0][0][0] melempar TypeError
        // yang melewati laporan errors[] dan menyembunyikan fitur penyebabnya.
        const first = geometry.coordinates[0]?.[0]?.[0];
        if (!first) {
          errors.push(`"${name}" bergeometri kosong (poligon/ring tanpa titik).`);
          continue;
        }
        const [lng, lat] = first;
        if (Math.abs(lng) > 180 || Math.abs(lat) > 90) {
          errors.push(`"${name}" koordinat di luar WGS84 (${lng}, ${lat}).`);
          continue;
        }
        // Kode dulu (stabil), lalu nama sebagai cadangan: "Kota Pekanbaru" vs
        // district "Pekanbaru" dkk. — coba nama utuh lalu tanpa prefiks "Kota ".
        const key = name.toLowerCase();
        const codeKey = props.KDBPUM ? String(props.KDBPUM).replace(/\D/g, "") : "";
        const districtId =
          (codeKey ? districtByCode.get(codeKey) : undefined) ??
          districtByName.get(key) ??
          districtByName.get(key.replace(/^kota\s+/, "")) ??
          null;
        plan.push({
          name,
          code: props.KDBPUM ? String(props.KDBPUM).trim() || null : null,
          parentName: cfg.parentField
            ? String(props[cfg.parentField] ?? "").trim() || null
            : null,
          districtId,
          geometry,
        });
      }

      if (errors.length > 0) {
        console.error(`\n❌ ${cfg.level}: validasi gagal (${errors.length}) — level ini tidak ditulis:`);
        for (const e of errors) console.error(`   - ${e}`);
        process.exitCode = 1;
        continue;
      }

      console.log(`${cfg.level}: ${plan.length} wilayah dari ${cfg.file}`);
      for (const p of plan) {
        console.log(
          `   ${p.code ?? "—"}  ${p.name}${p.districtId ? "  ↔ District program" : ""}`
        );
      }

      if (!APPLY) continue;

      // Payload geometri besar + koneksi via tunnel (prod) bisa jauh melampaui
      // default timeout transaksi interaktif Prisma (5 dtk) — longgarkan.
      await prisma.$transaction(async (tx) => {
        await tx.administrativeBoundary.updateMany({
          where: { level: cfg.level, isActive: true },
          data: { isActive: false, modifiedBy: "seed-batas-administrasi" },
        });
        for (const p of plan) {
          const row = await tx.administrativeBoundary.create({
            data: {
              level: cfg.level,
              name: p.name,
              code: p.code,
              parentName: p.parentName,
              districtId: p.districtId,
              geojson: p.geometry as unknown as Prisma.InputJsonValue,
              source: cfg.file,
              createdBy: "seed-batas-administrasi",
              modifiedBy: "seed-batas-administrasi",
            },
          });
          await tx.$executeRaw`
            UPDATE "tbl_administrative_boundary"
            SET "geom" = ST_SetSRID(ST_Multi(ST_GeomFromGeoJSON(${JSON.stringify(p.geometry)})), 4326)
            WHERE "id" = ${row.id}`;
          // Cache `geojson` disimpan TERSIMPLIFIKASI (0,001° ≈ 111 m): file BIG
          // full-res ~10 MB per level — terlalu berat dikirim ke browser untuk
          // garis konteks; analisa presisi tetap pakai kolom `geom` full-res.
          await tx.$executeRaw`
            UPDATE "tbl_administrative_boundary"
            SET "geojson" = ST_AsGeoJSON(ST_Multi(ST_SimplifyPreserveTopology("geom", 0.001)))::jsonb
            WHERE "id" = ${row.id}`;
        }
      }, { timeout: 600_000, maxWait: 60_000 });
      console.log(`   ✅ ${plan.length} baris ${cfg.level} tersimpan (geojson + geom PostGIS).`);
    }

    // Tanpa satu pun berkas, skrip akan "selesai" tanpa mengerjakan apa pun —
    // berkas data memang tidak disertakan di repo (#279), jadi katakan terang.
    if (found === 0) {
      console.error(`\n❌ Tidak ada satu pun berkas level yang ditemukan di:\n   ${dataDir}\n`);
      console.error("   Berkas data tidak disertakan di repo (lihat #279). Taruh di lokasi");
      console.error(`   bawaan "${DEFAULT_DATA_DIR}", atau tunjuk foldernya:`);
      console.error("     --data=/path/ke/folder      atau      SEED_DATA_DIR=/path/ke/folder");
      process.exit(1);
    }
    if (!APPLY) console.log("\nDRY-RUN selesai. Jalankan ulang dengan --apply untuk menulis.");
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("❌ Gagal:", e);
  process.exit(1);
});
