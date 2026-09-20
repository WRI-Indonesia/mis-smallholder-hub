/**
 * QC data & DB per rilis (docs/qa/<versi>/03-data-qc.md) — READ-ONLY.
 *
 * Menjalankan seluruh cek SQL dan mencetak tabel markdown `ID · maksud ·
 * harapan · aktual · status` siap tempel ke lembar run. Tidak ada pernyataan
 * tulis apa pun; koneksi dibuka dengan `default_transaction_read_only = on`.
 *
 *   npx dotenv -e .env.staging -- npx tsx scripts/qa/data-qc.ts
 *   npx dotenv -e .env.prod    -- npx tsx scripts/qa/data-qc.ts --section A,B
 *   npx dotenv -e .env.staging -- npx tsx scripts/qa/data-qc.ts --section B --parcel HJP.0001.A.14.01.10.2002
 *
 * Menambah cek: tambah entri di CHECKS (id, bagian, maksud, sql, expect) lalu
 * perbarui baris di 03-data-qc.md. `expect` = nilai persis, fungsi predikat,
 * atau null (cetak saja — dibandingkan antar run oleh manusia).
 */
import "dotenv/config";
import { Pool } from "pg";

type Row = Record<string, unknown>;
type Expect = string | number | null | ((v: string, rows: Row[]) => boolean);
interface Check {
  id: string;
  section: "A" | "B" | "C" | "D" | "E";
  purpose: string;
  sql: string;
  /** Kolom yang ditampilkan sebagai "aktual" (bawaan: seluruh kolom baris pertama digabung " · "). */
  pick?: (rows: Row[]) => string;
  expect: Expect;
  expectLabel: string;
  /** Butuh --parcel. */
  needsParcel?: boolean;
}

const args = process.argv.slice(2);
const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const sections = (opt("--section") ?? "A,B,C,D,E").split(",").map((s) => s.trim().toUpperCase());
const parcelId = opt("--parcel") ?? null;

function dbLabel(url: string | undefined): string {
  if (!url) return "(DATABASE_URL kosong)";
  try { const u = new URL(url); return `${u.hostname}:${u.port || "5432"}/${u.pathname.replace("/", "")}`; }
  catch { return "(DATABASE_URL tidak valid)"; }
}

const MIGRATIONS = [
  "20260914100000_land_parcel_geom",
  "20260914100100_land_parcel_border",
  "20260914150000_land_parcel_nkt",
  "20260914170000_land_marker",
  "20260914200000_land_marker_code",
];
/** v0.36.0 — Monev BMP (#344, #346). */
const MIGRATIONS_MONEV = ["20260918120000_bmp_assessment", "20260920100000_bmp_assessment_unique_active", "20260920120000_bmp_indicator_detail"];
const joinRow = (rows: Row[]) => (rows[0] ? Object.values(rows[0]).map((v) => String(v)).join(" · ") : "(tidak ada baris)");

const CHECKS: Check[] = [
  {
    id: "A1", section: "A", purpose: "5 migrasi 20260914* applied",
    sql: `select count(*)::int as n from _prisma_migrations where migration_name = any($1::text[]) and finished_at is not null`,
    expect: (v) => v === "5", expectLabel: "5 (sesudah) · 0 (sebelum)",
  },
  {
    id: "A2", section: "A", purpose: "tbl_land_parcel.geom = kolom GENERATED",
    sql: `select count(*)::int as n from information_schema.columns where table_name='tbl_land_parcel' and column_name='geom' and is_generated='ALWAYS'`,
    expect: "1", expectLabel: "1",
  },
  {
    id: "A3", section: "A", purpose: "geom NULL pada baris ber-geometry",
    sql: `select count(*) filter (where geom is null)::int as geom_null, count(*)::int as total from tbl_land_parcel where geometry is not null`,
    pick: (r) => `${r[0]?.geom_null} NULL dari ${r[0]?.total}`,
    expect: (_v, rows) => Number(rows[0]?.geom_null) === 0, expectLabel: "0 NULL",
  },
  {
    id: "A4", section: "A", purpose: "GiST tbl_land_parcel_geom_idx & tbl_land_marker_geom_idx",
    sql: `select count(*)::int as n from pg_indexes where indexname in ('tbl_land_parcel_geom_idx','tbl_land_marker_geom_idx')`,
    expect: "2", expectLabel: "2",
  },
  {
    id: "A5", section: "A", purpose: "partial unique uniq_land_parcel_marker_seq WHERE is_active",
    sql: `select coalesce((select indexdef from pg_indexes where indexname='uniq_land_parcel_marker_seq'), '(tidak ada)') as def`,
    pick: (r) => String(r[0]?.def).includes("WHERE") ? "ada, ber-WHERE" : String(r[0]?.def),
    expect: (_v, rows) => /WHERE\s*\(?\s*is_active/i.test(String(rows[0]?.def)), expectLabel: "ada, WHERE is_active",
  },
  {
    id: "A6", section: "A", purpose: "5 enum baru",
    sql: `select count(*)::int as n from pg_type where typname in ('LandNktStatus','NktCategory','LandMarkerCondition','LandMarkerType','LandMarkerSource')`,
    expect: "5", expectLabel: "5",
  },
  { id: "B1", section: "B", purpose: "lahan aktif", sql: `select count(*)::int as n from tbl_land_parcel where is_active`, expect: null, expectLabel: "= run sebelum" },
  { id: "B2", section: "B", purpose: "petani aktif", sql: `select count(*)::int as n from tbl_farmer where is_active`, expect: null, expectLabel: "= run sebelum" },
  { id: "B3", section: "B", purpose: "Lembaga aktif", sql: `select count(*)::int as n from tbl_farmer_group where is_active`, expect: null, expectLabel: "= run sebelum" },
  { id: "B4", section: "B", purpose: "identitas lahan", sql: `select count(*)::int as n from tbl_land_parcel_identity`, expect: null, expectLabel: "= run sebelum" },
  {
    id: "B5", section: "B", purpose: "5 tabel baru: border · nkt · marker · link · counter",
    sql: `select (select count(*) from tbl_land_parcel_border)::int as border, (select count(*) from tbl_land_parcel_nkt)::int as nkt, (select count(*) from tbl_land_marker)::int as marker, (select count(*) from tbl_land_parcel_marker)::int as link, (select count(*) from tbl_land_marker_counter)::int as counter`,
    expect: null, expectLabel: "0·0·0·0·0 pasca-migrasi; terisi setelah TC-PREP",
  },
  {
    id: "B6", section: "B", purpose: "sepadan lahan --parcel: baris ada, kolom kosong setelah 'hapus'", needsParcel: true,
    sql: `select count(*)::int as rows, count(*) filter (where north is null and east is null and south is null and west is null)::int as empty from tbl_land_parcel_border b join tbl_land_parcel_identity i on i.id=b.parcel_uid where i.parcel_id=$1`,
    pick: (r) => `${r[0]?.rows} baris · ${r[0]?.empty} kosong`, expect: null, expectLabel: "1 baris · 1 kosong (setelah TC-326-02)",
  },
  {
    id: "B7", section: "B", purpose: "NKT lahan --parcel: baris hilang setelah 'hapus'", needsParcel: true,
    sql: `select count(*)::int as n from tbl_land_parcel_nkt n join tbl_land_parcel_identity i on i.id=n.parcel_uid where i.parcel_id=$1`,
    expect: null, expectLabel: "0 (setelah TC-328-03)",
  },
  {
    id: "B8", section: "B", purpose: "kode patok unik & ber-awalan",
    sql: `select count(*)::int as total, count(distinct code)::int as distinct_code, min(code) as min_code, max(code) as max_code from tbl_land_marker`,
    pick: (r) => `${r[0]?.total} patok · ${r[0]?.distinct_code} kode unik · ${r[0]?.min_code ?? "—"} … ${r[0]?.max_code ?? "—"}`,
    expect: (_v, rows) => Number(rows[0]?.total) === Number(rows[0]?.distinct_code), expectLabel: "total = kode unik",
  },
  {
    id: "B9", section: "B", purpose: "counter = nomor terbesar per awalan",
    sql: `select coalesce(bool_and(c.last_no = m.max_no), true) as ok, count(*)::int as prefixes from tbl_land_marker_counter c join (select split_part(code,'-PTK-',1) as prefix, max(split_part(code,'-PTK-',2)::int) as max_no from tbl_land_marker group by 1) m on m.prefix=c.prefix`,
    pick: (r) => `${r[0]?.ok ? "sama" : "BEDA"} (${r[0]?.prefixes} awalan)`, expect: (_v, rows) => rows[0]?.ok === true, expectLabel: "sama",
  },
  {
    id: "C2", section: "C", purpose: "menu report-marker + izin per peran",
    sql: `select (select count(*) from tbl_menu_item where key='report-marker' and is_active)::int as menu, (select count(*) from rbac_role_permission where menu_key='report-marker' and is_active)::int as perms, (select string_agg(role || ':' || n, ' ') from (select role::text, count(*)::int as n from rbac_role_permission where menu_key='report-marker' and is_active group by role order by role) x) as per_role`,
    pick: (r) => `${r[0]?.menu} menu · ${r[0]?.perms} izin · ${r[0]?.per_role ?? "—"}`,
    expect: (_v, rows) => Number(rows[0]?.menu) === 1 && Number(rows[0]?.perms) === 16, expectLabel: "1 menu · 16 izin (ADMIN 5 · OPERATOR/MANAGEMENT/SUPERADMIN 3 · DONOR 2)",
  },
  {
    id: "C4", section: "C", purpose: "urutan sidebar Report (Patok terakhir)",
    sql: `select string_agg(key, ' → ' order by "order") as seq from tbl_menu_item where parent_key='report' and is_active`,
    pick: (r) => String(r[0]?.seq), expect: (_v, rows) => String(rows[0]?.seq).endsWith("report-marker"), expectLabel: "… → report-marker",
  },
  {
    id: "D1", section: "D", purpose: "baris NKT per status (setelah TC-PREP-01)",
    sql: `select coalesce(string_agg(status || ':' || n, ' '), '(kosong)') as s from (select status::text, count(*)::int as n from tbl_land_parcel_nkt group by status order by status) x`,
    expect: null, expectLabel: "AFFECTED:21 (tanpa INCLUDED)",
  },
  {
    id: "D2", section: "D", purpose: "patok aktif / tautan aktif",
    sql: `select (select count(*) from tbl_land_marker where is_active)::int as patok, (select count(*) from tbl_land_parcel_marker where is_active)::int as tautan`,
    pick: (r) => `${r[0]?.patok} patok / ${r[0]?.tautan} tautan`, expect: null, expectLabel: "≥ 8 / ≥ 12 setelah TC-PREP-02/03",
  },
  // D3 (patok NKT turunan) dihapus bersama konsepnya — #345 tahap 1.
  // ── E · Monev BMP (v0.36.0: #344 + #346) ─────────────────────────────────
  {
    id: "E1", section: "E", purpose: "3 migrasi Monev BMP applied",
    sql: `select count(*)::int as n from _prisma_migrations where migration_name = any($1::text[]) and finished_at is not null`,
    expect: (v) => v === "3", expectLabel: "3 (sesudah) · 0 (sebelum)",
  },
  {
    id: "E2", section: "E", purpose: "5 tabel Monev: ref_bmp_indicator · tbl_bmp_assessment · _detail · tbl_bmp_group_assessment · _detail",
    sql: `select count(*)::int as n from information_schema.tables where table_schema='public' and table_name in ('ref_bmp_indicator','tbl_bmp_assessment','tbl_bmp_assessment_detail','tbl_bmp_group_assessment','tbl_bmp_group_assessment_detail')`,
    expect: "5", expectLabel: "5",
  },
  {
    id: "E3", section: "E", purpose: "partial unique satu aktif per petani-tahun & per Lembaga-tahun (WHERE is_active)",
    sql: `select string_agg(indexname || case when indexdef ilike '%where%is_active%' then ' ✓' else ' ✗' end, ' · ' order by indexname) as s from pg_indexes where indexname in ('uniq_bmp_assessment_farmer_year_active','uniq_bmp_group_assessment_group_year_active')`,
    pick: (r) => String(r[0]?.s ?? "(tidak ada)"),
    expect: (v) => v.split(" · ").length === 2 && !v.includes("✗"), expectLabel: "2 index, keduanya ber-WHERE",
  },
  {
    id: "E4", section: "E", purpose: "master indikator ter-seed: 32 baris = 18 INDIVIDU + 14 LEMBAGA, 21 berbobot",
    sql: `select count(*)::int as total, count(*) filter (where level='INDIVIDU')::int as individu, count(*) filter (where level='LEMBAGA')::int as lembaga, count(*) filter (where in_final_score and weight is not null)::int as weighted from ref_bmp_indicator where is_active`,
    pick: (r) => `${r[0]?.total} · ${r[0]?.individu} · ${r[0]?.lembaga} · ${r[0]?.weighted}`,
    expect: (v) => v === "32 · 18 · 14 · 21", expectLabel: "32 · 18 · 14 · 21 (sebelum seed: 0)",
  },
  {
    id: "E5", section: "E", purpose: "menu master-data-bmp-monev + dashboard-bmp-monev + 33 izin (cermin Pelatihan)",
    sql: `select (select count(*) from tbl_menu_item where key in ('master-data-bmp-monev','dashboard-bmp-monev') and is_active)::int as menu, (select count(*) from rbac_role_permission where menu_key in ('master-data-bmp-monev','dashboard-bmp-monev') and is_active)::int as perms, (select string_agg(role || ':' || n, ' ') from (select role::text, count(*)::int as n from rbac_role_permission where menu_key in ('master-data-bmp-monev','dashboard-bmp-monev') and is_active group by role order by role) x) as per_role`,
    pick: (r) => `${r[0]?.menu} menu · ${r[0]?.perms} izin · ${r[0]?.per_role ?? "—"}`,
    expect: (_v, rows) => Number(rows[0]?.menu) === 2 && Number(rows[0]?.perms) === 33, expectLabel: "2 menu · 33 izin (ADMIN 10 · SUPERADMIN 9 · OPERATOR/MANAGEMENT 6 · DONOR 2)",
  },
  {
    id: "E6", section: "E", purpose: "urutan sidebar Dashboard (Monev BMP ke-3, Pelatihan 4, Risk 5)",
    sql: `select string_agg(key, ' → ' order by "order") as seq from tbl_menu_item where parent_key='dashboard' and is_active`,
    pick: (r) => String(r[0]?.seq), expect: (_v, rows) => /dashboard-bmp\b.*dashboard-bmp-monev.*dashboard-training.*dashboard-risk/.test(String(rows[0]?.seq)), expectLabel: "… → dashboard-bmp → dashboard-bmp-monev → dashboard-training → dashboard-risk",
  },
  {
    id: "E7", section: "E", purpose: "tidak ada dua penilaian AKTIF untuk petani-tahun yang sama (dijaga E3)",
    sql: `select count(*)::int as n from (select farmer_id, survey_year from tbl_bmp_assessment where is_active group by 1,2 having count(*) > 1) d`,
    expect: "0", expectLabel: "0",
  },
  {
    id: "E8", section: "E", purpose: "penilaian aktif · ber-rincian · penilaian Lembaga aktif · skor di luar 0–3",
    sql: `select (select count(*) from tbl_bmp_assessment where is_active)::int as a, (select count(distinct assessment_id) from tbl_bmp_assessment_detail where is_active)::int as d, (select count(*) from tbl_bmp_group_assessment where is_active)::int as g, (select count(*) from tbl_bmp_assessment where is_active and (score < 0 or score > 3))::int as oor`,
    pick: (r) => `${r[0]?.a} · ${r[0]?.d} · ${r[0]?.g} · ${r[0]?.oor} di luar 0–3`, expect: null, expectLabel: "prod: 0 sebelum import UI; mis-dev 188 · 184 · 8 · 0",
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  console.log(`DB efektif : ${dbLabel(url)}`);
  console.log(`Bagian     : ${sections.join(",")}${parcelId ? ` · --parcel ${parcelId}` : ""}`);
  console.log(`Mode       : READ-ONLY (default_transaction_read_only = on)\n`);
  const pool = new Pool({ connectionString: url, options: "-c default_transaction_read_only=on" });
  const out: string[] = ["| ID | Maksud | Harapan | Aktual | Status |", "|---|---|---|---|---|"];
  let fails = 0;
  try {
    for (const c of CHECKS) {
      if (!sections.includes(c.section)) continue;
      if (c.needsParcel && !parcelId) { out.push(`| ${c.id} | ${c.purpose} | ${c.expectLabel} | _(butuh --parcel)_ | – |`); continue; }
      let rows: Row[] = [];
      let actual: string;
      try {
        const res = await pool.query(c.sql, c.needsParcel ? [parcelId] : c.id === "A1" ? [MIGRATIONS] : c.id === "E1" ? [MIGRATIONS_MONEV] : []);
        rows = res.rows as Row[];
        actual = c.pick ? c.pick(rows) : joinRow(rows);
      } catch (e) {
        actual = `ERROR: ${(e as Error).message.split("\n")[0]}`;
        out.push(`| ${c.id} | ${c.purpose} | ${c.expectLabel} | ${actual} | ✗ |`); fails++; continue;
      }
      let status = "–";
      if (c.expect !== null) {
        const ok = typeof c.expect === "function" ? c.expect(actual, rows) : String(c.expect) === actual;
        status = ok ? "✓" : "✗"; if (!ok) fails++;
      }
      out.push(`| ${c.id} | ${c.purpose} | ${c.expectLabel} | ${actual} | ${status} |`);
    }
  } finally {
    await pool.end();
  }
  console.log(out.join("\n"));
  console.log(`\n${fails === 0 ? "✓ tidak ada cek yang gagal" : `✗ ${fails} cek gagal`} · "–" = cetak saja, bandingkan dengan run sebelumnya · cek manual: A7 (checksum), C1 (seed dry-run), C3 (rbac:compare)`);
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => { console.error("❌ Gagal:", e); process.exit(1); });
