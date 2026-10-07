// Prototipe Supply Chain (#379): unggah tabel CSV hasil build-tables.mjs ke S3
// privat `<bucket>/prototype/supply-chain/` agar halaman prototipe di staging/prod
// punya data. Tabel berisi nama orang → TIDAK pernah masuk repo; skrip ini hanya
// memindahkan berkas dari folder lokal (gitignored) ke bucket env yang dipilih.
// Dry-run bawaan; --apply untuk menulis. Bucket ikut env (dev = local/staging, prod = prod).
//   npx dotenv -e .env.<env> -- node scripts/seed/upload-supply-chain-tables.mjs [--dir <folder>] [--apply]
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const APPLY = process.argv.includes("--apply");
const dirArg = process.argv.indexOf("--dir");
const DIR = path.resolve(dirArg > 0 ? process.argv[dirArg + 1] : "scripts/local/seed/data-supply-chain/tables");
// Sama dengan SUPPLY_CHAIN_S3_PREFIX / SUPPLY_CHAIN_TABLE_FILES di src/lib/supply-chain-tables.ts.
const PREFIX = "prototype/supply-chain/";
const FILES = ["mill.csv", "mill_buyer_program.csv", "offtaker.csv", "supply_chain_record.csv", "supply_chain_survey.csv"];

const bucket = process.env.S3_BUCKET_NAME;
if (!bucket || !process.env.S3_ENDPOINT) throw new Error("S3_BUCKET_NAME / S3_ENDPOINT kosong — jalankan lewat npx dotenv -e .env.<env> --");
console.log(`S3 efektif : ${process.env.S3_ENDPOINT} · bucket ${bucket} · prefix ${PREFIX}`);
console.log(`Sumber     : ${DIR}`);
console.log(`Mode       : ${APPLY ? "APPLY (menulis)" : "DRY-RUN (tidak menulis)"}\n`);

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "id-jkt-1",
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY_ID, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY },
  forcePathStyle: true,
});

for (const f of FILES) {
  const p = path.join(DIR, f);
  const size = statSync(p).size;
  const rows = readFileSync(p, "utf8").trim().split("\n").length - 1;
  console.log(`  ${f.padEnd(26)} ${String(rows).padStart(5)} baris · ${(size / 1024).toFixed(0)} KB`);
  // `supply_chain_record.csv` diunggah terakhir: ETag-nya penanda versi cache di server,
  // jadi server tak pernah melihat record baru dengan tabel pendukung lama.
}
if (!APPLY) {
  console.log("\nDRY-RUN — tidak ada yang ditulis. Jalankan ulang dengan --apply.");
  process.exit(0);
}
const order = [...FILES.filter((f) => f !== "supply_chain_record.csv"), "supply_chain_record.csv"];
for (const f of order) {
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: PREFIX + f, Body: readFileSync(path.join(DIR, f)), ContentType: "text/csv; charset=utf-8" }));
  console.log(`✓ ${PREFIX}${f}`);
}
console.log("\nSelesai. Objek privat (tanpa ACL publik); dibaca server lewat kredensial S3 env.");
