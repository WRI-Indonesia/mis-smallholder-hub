/**
 * Seed boundary lembaga (ICS) dari shapefile ZIP → tbl_farmer_group_boundary.
 * Issue #266 — Dashboard Risk Management / Fire Alert.
 *
 * Sumber:
 *   - Groups-Boundary.zip  : shapefile poligon ICS (atribut hanya nama `ICS`);
 *     shpjs mereproyeksi ke WGS84 dari file .prj (UTM 47S). Berkas DATA — TIDAK
 *     ada di repo (lihat #279): letaknya di `scripts/local/` yang gitignored,
 *     atau di mana pun lewat `--data=<dir>` / env `SEED_DATA_DIR`.
 *   - boundary-mapping.csv : pemetaan manual nama ICS → FarmerGroup.code —
 *     nama di shapefile tidak sama persis dengan nama di DB. Satu poligon bisa
 *     dimiliki BEBERAPA lembaga (kode dipisah "+", mis. KBJ+KSJ yang wilayahnya
 *     sama — keputusan owner 2026-08-19): satu baris boundary per lembaga
 *     dengan geometri identik; klasifikasi titik mengatribusikan ke semuanya.
 *     Ini bukan data mentah melainkan hasil pemetaan manual yang paling mahal
 *     dibuat ulang, dan bebas PII — jadi DI-TRACK bersama skrip ini.
 *
 * Perilaku:
 *   - SEMUA nama ICS wajib terpetakan dan semua code wajib ada & aktif di DB;
 *     bila tidak, script berhenti dengan laporan (tidak ada skip diam-diam).
 *   - Idempotent: boundary aktif lama milik lembaga yang di-seed di-soft-delete
 *     (is_active=false), lalu baris baru disisipkan.
 *   - Dual-column: `geojson` diisi via Prisma, `geom` (PostGIS) via
 *     ST_GeomFromGeoJSON pada baris yang sama.
 *
 * Jalankan (dry-run default, tulis dengan --apply):
 *   npx dotenv -e .env -- npx tsx scripts/seed/seed-boundary-lembaga.ts
 *   npx dotenv -e .env -- npx tsx scripts/seed/seed-boundary-lembaga.ts --apply
 *   ... --data=/path/ke/folder-zip     (bila data tidak di lokasi bawaan)
 */
import "dotenv/config";
import { existsSync, readFileSync } from "fs";
import { isAbsolute, join, resolve } from "path";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { parse } from "csv-parse/sync";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";

// shpjs (build CJS) merujuk global `self` milik browser — shim dulu, baru impor
// dinamis, karena impor statis akan mengeksekusi modulnya sebelum shim terpasang.
(globalThis as { self?: unknown }).self = globalThis;

/** Lokasi bawaan berkas data (gitignored) — bisa ditimpa --data / SEED_DATA_DIR. */
const DEFAULT_DATA_DIR = "scripts/local/seed/data-boundary-lembaga";
const ZIP_FILE = "Groups-Boundary.zip";
const APPLY = process.argv.includes("--apply");

/** Mapping ICS→kode ikut ter-track bersama skrip (bebas PII), jadi relatif ke skrip. */
const MAPPING_FILE = join(__dirname, "data", "boundary-mapping.csv");

function resolveDataDir(): string {
  const flag = process.argv.find((a) => a.startsWith("--data="))?.slice("--data=".length);
  const dir = flag || process.env.SEED_DATA_DIR || DEFAULT_DATA_DIR;
  return isAbsolute(dir) ? dir : resolve(process.cwd(), dir);
}

/** Berhenti berpesan jelas — berkas data memang sengaja tidak ada di repo (#279). */
function requireFile(path: string, what: string): string {
  if (existsSync(path)) return path;
  console.error(`❌ ${what} tidak ditemukan:\n   ${path}\n`);
  console.error("   Berkas data tidak disertakan di repo (lihat #279). Taruh di lokasi");
  console.error(`   bawaan "${DEFAULT_DATA_DIR}", atau tunjuk foldernya:`);
  console.error("     --data=/path/ke/folder      atau      SEED_DATA_DIR=/path/ke/folder");
  process.exit(1);
}

function dbLabel(url: string | undefined): string {
  if (!url) return "(DATABASE_URL kosong)";
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "5432"}/${u.pathname.replace("/", "")}`;
  } catch {
    return "(DATABASE_URL tidak valid)";
  }
}

/** Polygon → MultiPolygon agar seragam dengan tipe kolom geometry(MultiPolygon). */
function toMultiPolygon(geom: Polygon | MultiPolygon): MultiPolygon {
  return geom.type === "MultiPolygon"
    ? geom
    : { type: "MultiPolygon", coordinates: [geom.coordinates] };
}

async function main() {
  const dataDir = resolveDataDir();
  console.log(`DB efektif : ${dbLabel(process.env.DATABASE_URL)}`);
  console.log(`Data       : ${dataDir}`);
  console.log(`Mode       : ${APPLY ? "APPLY (menulis DB)" : "DRY-RUN (tanpa menulis; tambah --apply untuk menulis)"}\n`);

  // ── Parse shapefile ──────────────────────────────────────────────────────
  const { default: shp } = await import("shpjs");
  const zip = readFileSync(requireFile(join(dataDir, ZIP_FILE), `Shapefile "${ZIP_FILE}"`));
  const parsed = await shp(zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength));
  const fc = (Array.isArray(parsed) ? parsed[0] : parsed) as FeatureCollection;
  console.log(`Shapefile  : ${fc.features.length} poligon dari ${ZIP_FILE}`);

  // ── Parse mapping ────────────────────────────────────────────────────────
  const csv = readFileSync(requireFile(MAPPING_FILE, "boundary-mapping.csv"), "utf-8");
  const mappingRows = parse(csv, { columns: true, skip_empty_lines: true }) as {
    ics: string;
    farmer_group_code: string;
  }[];
  const mapping = new Map(mappingRows.map((r) => [r.ics.trim(), r.farmer_group_code.trim()]));

  // ── Validasi: semua fitur terpetakan, semua code ada di DB ───────────────
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  try {
    const groups = await prisma.farmerGroup.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
    });
    const groupByCode = new Map(groups.map((g) => [g.code, g]));

    const errors: string[] = [];
    const plan: { ics: string; code: string; groupId: string; groupName: string; geometry: MultiPolygon }[] = [];
    const seenCodes = new Map<string, string>(); // code → ics (deteksi duplikat)

    for (const f of fc.features) {
      const ics = String((f.properties as Record<string, unknown> | null)?.ICS ?? "").trim();
      if (!ics) {
        errors.push("Fitur tanpa atribut ICS.");
        continue;
      }
      const codesRaw = mapping.get(ics);
      if (!codesRaw) {
        errors.push(`ICS "${ics}" tidak ada di boundary-mapping.csv.`);
        continue;
      }
      const geom = f.geometry;
      if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) {
        errors.push(`ICS "${ics}" bergeometri ${geom?.type ?? "kosong"} (harus Polygon/MultiPolygon).`);
        continue;
      }
      // Multi-pemilik: kode dipisah "+" → satu baris boundary per lembaga.
      for (const code of codesRaw.split("+").map((c) => c.trim()).filter(Boolean)) {
        const group = groupByCode.get(code);
        if (!group) {
          errors.push(`ICS "${ics}" → code "${code}" tidak ditemukan / nonaktif di tbl_farmer_group.`);
          continue;
        }
        const dup = seenCodes.get(code);
        if (dup) {
          errors.push(`Code "${code}" dipakai dua fitur: "${dup}" dan "${ics}".`);
          continue;
        }
        seenCodes.set(code, ics);
        plan.push({ ics, code, groupId: group.id, groupName: group.name, geometry: toMultiPolygon(geom) });
      }
    }

    // Sanity reproyeksi: koordinat harus lon/lat Riau, bukan meter UTM.
    for (const p of plan) {
      // Poligon/ring kosong itu GeoJSON yang sah dan bisa lahir dari shapefile
      // terpotong — tanpa guard, akses [0][0][0] melempar TypeError yang lolos
      // dari laporan errors[] dan muncul sebagai "❌ Gagal: TypeError" tanpa
      // menyebut fitur mana yang bermasalah.
      const first = p.geometry.coordinates[0]?.[0]?.[0];
      if (!first) {
        errors.push(`ICS "${p.ics}" bergeometri kosong (poligon/ring tanpa titik).`);
        continue;
      }
      const [lng, lat] = first;
      if (Math.abs(lng) > 180 || Math.abs(lat) > 90) {
        errors.push(`ICS "${p.ics}" koordinat di luar WGS84 (${lng}, ${lat}) — reproyeksi gagal?`);
      }
    }

    if (errors.length > 0) {
      console.error(`\n❌ Validasi gagal (${errors.length} masalah) — tidak ada yang ditulis:`);
      for (const e of errors) console.error(`   - ${e}`);
      process.exit(1);
    }

    console.log(`Rencana    : ${plan.length} boundary → ${plan.length} lembaga\n`);
    for (const p of plan) console.log(`   ${p.ics}  →  ${p.code}  (${p.groupName})`);
    const unmatched = groups.filter((g) => g.code && !seenCodes.has(g.code));
    if (unmatched.length > 0) {
      console.log(`\n⚠️  Lembaga aktif tanpa boundary (${unmatched.length}):`);
      for (const g of unmatched) console.log(`   - ${g.code} ${g.name}`);
    }

    if (!APPLY) {
      console.log("\nDRY-RUN selesai. Jalankan ulang dengan --apply untuk menulis.");
      return;
    }

    // ── Tulis: soft-delete boundary aktif lama, insert baru, isi geom ────────
    let inserted = 0;
    for (const p of plan) {
      await prisma.$transaction(async (tx) => {
        await tx.farmerGroupBoundary.updateMany({
          where: { farmerGroupId: p.groupId, isActive: true },
          data: { isActive: false, modifiedBy: "seed-boundary-lembaga" },
        });
        const row = await tx.farmerGroupBoundary.create({
          data: {
            farmerGroupId: p.groupId,
            geojson: p.geometry as unknown as Prisma.InputJsonValue,
            source: ZIP_FILE,
            createdBy: "seed-boundary-lembaga",
            modifiedBy: "seed-boundary-lembaga",
          },
        });
        await tx.$executeRaw`
          UPDATE "tbl_farmer_group_boundary"
          SET "geom" = ST_SetSRID(ST_Multi(ST_GeomFromGeoJSON(${JSON.stringify(p.geometry)})), 4326)
          WHERE "id" = ${row.id}`;
      }, { timeout: 600_000, maxWait: 60_000 });
      inserted++;
    }
    console.log(`\n✅ Selesai: ${inserted} boundary tersimpan (geojson + geom PostGIS).`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("❌ Gagal:", e);
  process.exit(1);
});
