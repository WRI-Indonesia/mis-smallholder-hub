# QA/QC v1.0.0

| | |
|---|---|
| Versi | **v1.0.0** (MAJOR — **milestone MVP**, keputusan owner 2026-09-23; bukan breaking change teknis. §Aturan Pre-1.0 `versioning.md` dicabut di rilis ini) |
| Rentang | `v0.38.0..HEAD` (17 commit) |
| Migrasi | **tidak ada** — rilis kode murni; tanpa perubahan `prisma/schema`, `menu.csv`, seed, maupun izin |
| Run | lihat `runs/` — satu berkas per eksekusi |

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v1.0.0`)

_(belum ada run)_

## Keputusan

**Go / No-go:** … (tanggal, oleh siapa) — syarat: …

**Syarat khusus rilis ini — wajib dicek sebelum Go:**

1. **`AdministrativeBoundary.geom` terisi 12/12 di `mis-prod`.** `getRiauOutline()` (#280) membaca kolom itu; bila kosong, fungsi mengembalikan `null` dan kedua halaman **diam-diam kembali ke perilaku lama** tanpa satu pun pesan galat — perbaikannya tidak aktif di produksi dan tak ada yang tahu. Query baca-saja: `SELECT count(*) FILTER (WHERE geom IS NOT NULL), count(*) FROM tbl_administrative_boundary WHERE is_active AND level='KABUPATEN';` (lokal 12/12 ✓, prod **belum dicek** — butuh persetujuan owner).
2. **Angka titik api akan naik tipis** di Fire Alert dan Peta Lahan dibanding v0.38.0. Itu **disengaja** (#280 menutup celah 9,4 km²), bukan regresi. Penguji yang membandingkan dengan angka lama harus diberi tahu lebih dulu.

## Pernyataan MVP (khusus v1.0.0)

`1.0.0` menyatakan cakupan minimum yang dianggap layak dipakai, **bukan** roadmap 100%.

| | |
|---|---|
| Roadmap saat rilis | **88,2%** (`roadmap.md` Phase Status) |
| Bug terbuka dibawa | 4 (lihat tabel di bawah) |
| Tech debt aktif | 20 (`tech-debt.md`) |
| Cakupan tutorial Bantuan | **37/37** menu daun |
| Test otomatis | 1.807 |

Sisa fase roadmap tetap berjalan dan akan terbit sebagai MINOR di atas `1.x`. Kriteria bump MAJOR pasca-1.0 ada di `docs/standards/versioning.md` §Aturan Pasca-1.0.

## Known issues yang dibawa

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| #286 butir 1–3 | Musim karhutla: cache Next menolak entri >2 MB sehingga tiap permintaan 30 hari menembak ulang FIRMS (6 transaksi kuota), dan payload tanpa cap bisa puluhan MB | Perubahan arsitektur cache (cacheHandler/Redis/disk) yang butuh keputusan deploy — replika & volume. Butir 4–6 sudah selesai di rilis ini |
| #286 butir 2 (keamanan) | Peringatan cache Next mencetak URL upstream **berisi `FIRMS_MAP_KEY_FREE`** ke log container | Sama dengan di atas; anggap key ter-ekspos log → rotasi key adalah mitigasi jangka pendek, solusi struktural = cache milik sendiri |
| #277 | Deploy staging tanpa `migrate deploy` — rilis ber-migrasi mendarat di skema lama | **Tidak menggigit rilis ini** (tanpa migrasi), tetapi tetap jebakan untuk rilis berikutnya yang bermigrasi |
| #342 | Perubahan role/nonaktif tidak berlaku pada sesi aktif sampai login ulang | Butuh perubahan alur JWT/sesi; berisiko untuk rilis milestone |
| #237 | Tombol "Aktifkan kembali" di Menu Management justru menonaktifkan | Jalur reaktivasi yang benar ada lewat Edit dan sudah tertulis di tutorial `a-5` |
| #364 | Label menu prod diubah akun demo ("Data — All Lembaga"), berbeda dari Bantuan/docs | Menunggu keputusan owner: pulihkan ke CSV atau terima label baru lalu sinkronkan ±30 kalimat |
| #363 | Server staging RAM 1,97 GB | Sudah diredam (type-check dipisah dari build di v0.38.0); pengerasan lanjutan belum |
| #311 | `perf.test.ts` berambang jam-dinding — gate wajib bisa merah karena beban mesin | Terjadi **lagi** saat wrap-up rilis ini (5 test merah, hijau pada run ulang). Tidak memblokir, tapi membuat gate tak bisa dipercaya sepenuhnya |
