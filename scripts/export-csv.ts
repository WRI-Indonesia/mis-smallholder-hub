/**
 * Export all database tables to CSV files.
 *
 * Usage:
 *   npx tsx scripts/export-csv.ts
 *
 * Output: ./tmp-export-csv/<table_name>.csv
 */

import "dotenv/config";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "..", "tmp-export-csv");
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL not set in .env");
  process.exit(1);
}

// Parse the connection string
const url = new URL(DATABASE_URL);
const sslMode = url.searchParams.get("sslmode");

async function main() {
  const { default: pg } = await import("pg");

  const pool = new pg.Pool({
    host: url.hostname,
    port: parseInt(url.port || "5432"),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    ssl: sslMode === "require" || sslMode === "prefer" ? { rejectUnauthorized: false } : false,
  });

  let client;
  try {
    client = await pool.connect();
    console.log(
      "✓ Connected to database:",
      url.hostname + ":" + url.port + "/" + url.pathname.replace(/^\//, ""),
    );

    // Get all table names (excluding prisma migrations)
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '%prisma%'
      ORDER BY table_name
    `);

    const tables = tablesResult.rows.map((r) => r.table_name);
    console.log(`\nFound ${tables.length} tables to export:\n`);

    // Create output directory
    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    let totalRows = 0;

    // Export each table to CSV
    for (const table of tables) {
      const filePath = join(OUTPUT_DIR, `${table}.csv`);

      try {
        // Get column names
        const colsResult = await client.query(
          `
          SELECT column_name, ordinal_position
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `,
          [table],
        );

        const columns = colsResult.rows.map((r) => r.column_name);

        // Fetch all data
        const dataResult = await client.query(`SELECT * FROM "${table}" ORDER BY 1`);

        // Build CSV content
        const header = columns.map(escapeCsvField).join(",");
        const rows = dataResult.rows.map((row) =>
          columns
            .map((col) => {
              const val = row[col];
              if (val === null || val === undefined) return "";
              if (typeof val === "object" && val.toISOString) {
                return escapeCsvField(val.toISOString());
              }
              if (typeof val === "object") {
                return escapeCsvField(JSON.stringify(val));
              }
              return escapeCsvField(String(val));
            })
            .join(","),
        );

        const csvContent = [header, ...rows].join("\n") + "\n";
        writeFileSync(filePath, csvContent, "utf-8");

        const rowCount = dataResult.rows.length;
        totalRows += rowCount;
        console.log(`  ✓ ${padRight(table, 40)} ${String(rowCount).padStart(6)} rows`);
      } catch (err: any) {
        console.error(`  ✗ ${padRight(table, 40)} ERROR: ${err.message}`);
      }
    }

    console.log(`\n✅ Done! ${tables.length} tables, ${totalRows} total rows exported.`);
    console.log(`   Output folder: ${OUTPUT_DIR}/`);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function padRight(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
