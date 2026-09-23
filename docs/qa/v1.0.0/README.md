# QA/QC v1.0.0

| | |
|---|---|
| Versi | **v1.0.0** (MAJOR — **milestone MVP**, keputusan owner 2026-09-23; bukan breaking change teknis. §Aturan Pre-1.0 `versioning.md` dicabut di rilis ini) |
| Rentang | `v0.38.0..HEAD` (17 commit) |
| Migrasi | **tidak ada** — rilis kode murni; tanpa perubahan `prisma/schema`, `menu.csv`, seed, maupun izin |
| Run | lihat `runs/` — satu berkas per eksekusi |

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v1.0.0`)

| Run | Bagian | Pass | Fail | Blocked | N/A | Belum diisi |
|---|---|---:|---:|---:|---:|---:|
| 2026-09-23-local.md | Smoke | 0 | 0 | 0 | 0 | 31 |
| 2026-09-23-local.md | Kasus uji | 5 | 0 | 4 | 0 | 0 |
| 2026-09-23-local.md | Regresi | 0 | 0 | 0 | 0 | 9 |

**Run lokal 2026-09-23 — 5 Pass · 0 Fail · 4 Blocked.** Dijalankan otomatis (Claude in Chrome), SUPERADMIN saja, lingkup sempit. **Bukan pengganti QA manusia**: smoke 31 kasus dan regresi 9 kasus belum dijalankan, begitu pula peran OPERATOR & DONOR — dan justru dari peran ter-scope itulah bug cakupan biasanya terlihat.

QC data lokal (`scripts/qa/data-qc.ts`, read-only): **20 ✓ · 1 ✗ · 9 cetak-saja**. Yang ✗ adalah **F3** — label menu masih `Data — All Lembaga`, yaitu #364; DB lokal disegarkan dari prod sehingga ikut terbawa. Bukan regresi rilis ini.

## Keputusan

**Go / No-go:** **GO** (owner, 2026-09-23) — Developer *Go terbatas* · QA **dilewati** · Owner *Go*. **QA staging sengaja tidak dijalankan** atas keputusan owner (preseden v0.35.0 & v0.36.0). Konsekuensinya tercatat di `05-signoff.md`: peran **OPERATOR & DONOR tidak diuji di lingkungan mana pun**, dan **cap 500 baris #286 belum pernah terlihat bekerja pada data nyata**. Mitigasi: deploy staging hijau dengan kode identik, syarat Go #1 diverifikasi langsung di prod, rilis tanpa migrasi/seed/izin sehingga rollback = deploy commit sebelumnya.

**Syarat khusus rilis ini — wajib dicek sebelum Go:**

1. ✅ **`AdministrativeBoundary.geom` terisi 12/12** — diverifikasi baca-saja 2026-09-23 di **`mis-dev` 12/12**, **`mis-staging` 12/12**, dan **`mis-prod` 12/12**; outline prod terbentuk **84 polygon / 75 kB**, identik dengan lokal. `getRiauOutline()` (#280) karena itu **aktif di produksi**, bukan jatuh diam-diam ke fallback.

   Celah yang ditutup, diukur **pada data produksi**: **9,399 km²** dari 90.049,1 km² wilayah Riau berada di luar semua poligon kabupaten tersimplifikasi — angka yang sama persis dengan pengukuran lokal, karena batas BIG-nya memang data yang sama.
2. **Angka titik api akan naik tipis** di Fire Alert dan Peta Lahan dibanding v0.38.0. Itu **disengaja** (#280 menutup celah 9,4 km²), bukan regresi. Penguji yang membandingkan dengan angka lama harus diberi tahu lebih dulu.

## Deploy

| Tahap | Detail |
|---|---|
| `staging` | PR **#367** `mvp → staging`, merge `b59d471`. Run [35825084675](https://github.com/WRI-Indonesia/mis-smallholder-hub/actions/runs/35825084675) **success 6m26s** (2026-09-23 06:04→06:10 UTC). `✓ Compiled successfully in 2.0min`. Pemeriksaan pra-merge: `gitleaks` pass, `semgrep/ci` pass 2m13s — ditunggu selesai, tidak di-merge menggantung. |
| Memori server staging | `free -m` sebelum build **1.253 / 1.973 MB** terpakai · sesudah **841 MB** · swap 585 → **825 MB**. #363 tidak menggigit; margin tipis, issue tetap terbuka. |
| Migrasi diterapkan | **tidak ada** — rilis kode murni |
| Checksum disegarkan | **N/A** (tanpa migrasi) |
| `prod` | belum — menunggu sign-off QA & Owner |

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
