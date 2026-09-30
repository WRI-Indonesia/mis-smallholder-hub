# 02 · Kasus uji per issue — v1.3.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Satu **blok** per kasus. Ditulis dev saat menutup issue; dijalankan QA di staging; hasil di `runs/`. Data uji memakai **kode** (Lembaga/lahan), bukan nama orang. Tag: `[P0]` wajib tiap run · `[P1]` · `[P2]`; `[regresi]` = disalin ke `../regression.md` saat rilis ditutup.

Format: `### TC-<issue>-<nn> · <judul> [P0] [regresi] (<menit> mnt)` lalu `Prasyarat:` · `Langkah:` (bernomor) · `Harapan:` (bullet) · opsional `Baseline dev:`.

## #392 — Metrik Rilis disesuaikan dengan reset roadmap

### TC-392-01 · Grafik Progres roadmap terputus per baseline [P1] [regresi] (3 mnt)
Prasyarat: akun SUPERADMIN atau MANAGEMENT; `metrics.md` memuat baris bercatatan "Roadmap direset" (siklus pasca-v1.2.0).
Langkah:
1. Buka **Data Analyst › Metrik Rilis**, rentang waktu **Semua**.
2. Amati grafik **Progres roadmap**; arahkan kursor ke titik terakhir baseline lama lalu ke titik sesudah reset.
3. Pilih rentang **1 Minggu**.
Harapan:
- Tidak ada garis vertikal yang "jatuh" dari ±88% ke ±9%; baseline lama tampil pudar dengan label "baseline lama beku 88,5%", ada garis putus-putus vertikal "reset 30 Sep 2026" dan label "baseline baru 8,6%"; sumbu Y 0–100%.
- Tooltip menyebut baseline titiknya: "baseline lama (dibekukan)" / "awal baseline baru".
- Bila rentang hanya memuat satu baseline, garis tak terputus dan sumbu Y kembali mengikuti data.
Baseline dev: localhost 2026-09-30 sesuai harapan.

### TC-392-02 · Kartu KPI membandingkan dengan rilis terakhir [P1] (2 mnt)
Prasyarat: sama dengan TC-392-01.
Langkah:
1. Baca baris kecil di bawah angka tiga kartu teratas.
2. Arahkan kursor ke kartu Roadmap dan tautan "lihat rincian" di grafik roadmap.
Harapan:
- RVS: "+<Δ> di <rilis terakhir> · anchor v0.9.0 = 1.000"; Test: "+<N> di <rilis terakhir> · awal ≈440"; Roadmap: "<poin>/<maks> poin · <n> fase · baseline lama beku 88,5%".
- Tidak ada lagi "pt sejak v0.9.0", "% dari anchor", atau "48 fase"; jumlah fase di tooltip = jumlah fase di akordeon Detail roadmap.

### TC-392-03 · Sisa fase roadmap dikelompokkan per horizon [P1] (3 mnt)
Prasyarat: sama dengan TC-392-01.
Langkah:
1. Klik kartu **Roadmap** (akordeon Detail roadmap terbuka) lalu gulir ke **Sisa fase roadmap**.
2. Klik satu baris fase, lalu klik lagi.
3. Tekan Tab sampai fokus di sebuah baris lalu tekan Enter.
Harapan:
- Tiga blok berurutan **Now · Kuartal 4 2026 (Okt–Des)**, **Next · Semester 1 2027 (Jan–Jun)**, **Later · Semester 2 2027 (Jul–Des)**, masing-masing dengan jumlah fase · poin terbuka · +pp bila tuntas; di tiap blok fase inti tampil dulu.
- Klik/Enter membuka "Sudah ada" dan "Langkah berikutnya", klik lagi menutupnya.
- Pada layar sempit (ponsel), bobot dan "+pp" turun ke bawah deskripsi, deskripsi tidak terjepit dan tidak ada scroll horizontal.

## #342 — Role & status aktif dibaca ulang dari DB (bukan beku di JWT)

### TC-342-01 · Perubahan role & penonaktifan berlaku pada sesi aktif ≤ 1 menit [P0] [regresi] (10 mnt)
Prasyarat: akun SUPERADMIN di jendela biasa; akun OPERATOR ter-scope yang sedang login di **jendela privat/incognito** (sesi terpisah); satu halaman yang terbuka untuk OPERATOR tetapi tidak untuk DONOR (mis. Master Data › Produksi) dan satu yang hanya untuk SUPERADMIN (Settings › Users).
Langkah:
1. (OPERATOR) Buka `/api/auth/session` dan Master Data › Produksi. Catat role dan menu sidebar.
2. (SUPERADMIN) Settings › Users → ubah role akun OPERATOR menjadi **SUPERADMIN**.
3. (OPERATOR) Tunggu ± 1 menit, muat ulang `/admin` dan `/api/auth/session` — **tanpa** logout.
4. (SUPERADMIN) Ubah role akun itu menjadi **DONOR**. (OPERATOR) tunggu ± 1 menit, muat ulang Master Data › Produksi.
5. (SUPERADMIN) **Nonaktifkan** akun itu. (OPERATOR) tunggu ± 1 menit, muat ulang `/admin`.
6. (SUPERADMIN) Aktifkan kembali dan kembalikan role ke OPERATOR.
7. (OPERATOR) **Segera** (< 1 menit sesudah langkah 6) login lagi di jendela privat.
Harapan:
- Langkah 3: sesi menunjukkan `SUPERADMIN`, menu Settings/Bulk Upload tampil tanpa login ulang.
- Langkah 4: sesi `DONOR`; Master Data › Produksi dialihkan ke `/admin` dan menunya hilang dari sidebar.
- Langkah 5: sesi kosong, halaman dialihkan ke `/login` **tanpa loop redirect**; halaman login tampil normal.
- Langkah 7: login **langsung berhasil** dengan role `OPERATOR` — tidak tertolak diam-diam kembali ke `/login` oleh status nonaktif yang masih dimemo (temuan review wrap-up v1.3.0, `45a8fcc`).
- Perubahan tidak berlaku lebih lambat dari ± 1 menit (TTL memo per user di tiap proses Node).
Baseline dev: `mis-dev` 2026-09-30 — login `qa-operator` via curl: sesi `OPERATOR`, Master Data › Produksi 200, `/admin/settings/users` → `/admin`. Langkah 2–6 **belum** dijalankan di lokal (perubahan `tbl_user` tidak diizinkan untuk sesi dev); logika dijaga `src/test/auth-role-refresh.test.ts` (memo TTL, fail-open, akun nonaktif → sesi kosong).

## #277 — Guard migrasi di `deploy-staging.yml`

### TC-277-01 · Deploy staging berhenti bila migrasi belum diterapkan [P0] (5 mnt)
Prasyarat: rilis v1.3.0 dipush ke branch `staging`; akses baca log GitHub Actions (`gh run view <id> --log`).
Langkah:
1. Buka log run **Deploy Staging** untuk push v1.3.0.
2. Cari keluaran langkah guard sesudah `npm ci`.
3. (Bila rilis membawa migrasi dan migrasi `mis-staging` sengaja belum diterapkan) amati akhir job.
Harapan:
- Skema sudah sesuai: log memuat "Database schema is up to date!" lalu build & `pm2 reload` berjalan.
- Ada migrasi pending: job **gagal** dengan anotasi "Skema mis-staging belum sesuai kode …" dan daftar nama migrasi pending; `npm run build` dan `pm2 reload` **tidak** dijalankan; aplikasi staging tetap melayani versi sebelumnya.
Baseline dev: diuji lokal 2026-09-30 terhadap `mis-dev` — up to date (exit 0), migrasi palsu `29990101000000_fake_pending` (exit ≠ 0, namanya tercantum), DB tak terjangkau P1001 (exit ≠ 0).

## #394 — Guard migrasi di `deploy-main.yml`

### TC-394-01 · Deploy produksi melewati guard migrasi [P0] (3 mnt)
Prasyarat: migrasi v1.3.0 (`20260930120000_production_record_parcel_period_idx`) sudah diterapkan manual ke `mis-prod` sebelum merge `staging → main`; akses baca log GitHub Actions.
Langkah:
1. Sesudah merge, buka log run **Deploy Main** (`gh run view <id> --log`).
2. Cari keluaran guard sesudah `npm ci`.
Harapan:
- Log memuat "Database schema is up to date!", lalu `prisma generate`, build, dan `pm2 reload mis-main` berjalan; run hijau.
- Tidak ada anotasi `::error::` guard `.env` atau guard migrasi.
- (Bila guard ternyata berhenti) aplikasi prod tetap melayani versi sebelumnya; terapkan migrasi yang disebut di log, lalu *re-run* job — jangan menonaktifkan guard.
Baseline dev: 2026-09-30 — YAML valid (js-yaml), `bash -n` skrip SSH lolos, blok guard identik `deploy-staging.yml` selain nama DB; `migrate status` terhadap `mis-dev` → "up to date", exit 0. Jalur gagal sudah diuji pada guard yang sama di #277 (TC-277-01).

## #376 — Cek jendela migrasi prod ↔ tag rilis

### TC-376-01 · `migrations:release-gap` menutup jendela sesudah tag v1.3.0 [P1] (3 mnt)
Prasyarat: repo lokal ber-`git fetch --tags`; `applied-checksums.json` sudah disegarkan sesudah `migrate deploy` prod rilis ini.
Langkah:
1. Sebelum tag: `npm run migrations:release-gap`.
2. Sesudah tag `v1.3.0` di-push: `git fetch --tags && npm run migrations:release-gap`.
3. `npm run migrations:release-gap -- --tag v1.0.0`.
Harapan:
- Langkah 1: bila rilis membawa migrasi (mis. indeks produksi #251), migrasi itu tercantum sebagai "Applied di prod, BELUM ada di v1.2.0" — wajar sebelum tag; selain itu tidak ada nama lain.
- Langkah 2: "✓ Tidak ada jendela terbuka", exit 0.
- Langkah 3 (regresi insiden #373): tercantum `20260923120000_external_id_shared_code`, exit 1.
Baseline dev: 2026-09-30 — v1.2.0 ✓ exit 0; `--tag v1.0.0` menangkap #373 exit 1; tag tak dikenal → pesan `git fetch --tags`, exit 2.

## #232 — Prosedur rollback deploy

### TC-232-01 · Rollback aplikasi staging lewat revert + perilaku build gagal [P1] (15 mnt)
Prasyarat: v1.3.0 sudah ter-deploy di staging (TC-277-01 lolos); owner menyetujui dua deploy tambahan ke staging; tidak ada migrasi v1.3.0 yang memutus kode v1.2.0 (bila ada, jalur B dulu — `docs/standards/rollback.md`).
Langkah:
1. Di `staging`: `git revert -m 1 <merge commit mvp → staging v1.3.0>` → push → tunggu run **Deploy Staging**.
2. Buka staging: header/versi & satu menu baru v1.3.0 (mis. Metrik Rilis versi baru) harus kembali ke perilaku v1.2.0.
3. Batalkan revert (`git revert <commit-revert>`) → push → staging kembali ke v1.3.0.
4. Catat durasi tiap run dan apakah ada jeda halaman galat.
Harapan:
- Log langkah 1 & 3: guard "Database schema is up to date!" (DB yang lebih maju dari kode tetap lolos), build ✓, `pm2 reload` ✓.
- Staging melayani versi yang benar sesudah tiap run; tidak ada halaman galat selain jeda reload.
- Durasi dicatat di rollback.md §Bukti gladi (angka nyata pengganti estimasi).
Baseline dev: jalur migrasi (B1 roll-forward, B2 darurat, `resolve --rolled-back` ditolak untuk migrasi sukses) sudah digladi 2026-09-30 di `mis-staging-local`; jalur aplikasi belum pernah diuji.

## #251 — Indeks ProductionRecord

### TC-251-01 · Migrasi indeks produksi di staging + halaman pemakainya [P1] (5 mnt)
Prasyarat: migrasi `20260930120000_production_record_parcel_period_idx` sudah di-`migrate deploy` ke `mis-staging` (dump dulu); akun ADMIN.
Langkah:
1. Baca-saja: `select indexname from pg_indexes where tablename='tbl_production_record' order by 1;`
2. Buka **Map › Peta BMP**, pilih Lembaga dengan data produksi terbanyak; buka popup satu lahan.
3. Buka Detail Lahan lahan yang sama (tab produksi / Profil Lahan PDF) dan **Report › Produksi** untuk Lembaga itu.
4. Unggah berkas produksi kecil lewat **Bulk Upload › Produksi** (data uji, lalu hapus).
Harapan:
- Langkah 1: ada `tbl_production_record_parcel_id_period_idx`; tidak ada lagi `_parcel_id_idx` dan `_is_active_idx`; `_farmer_id_idx`, `_period_idx`, unique & pkey tetap.
- Angka produksi di Peta BMP, Detail Lahan, dan Report sama dengan sebelum migrasi (indeks tidak mengubah hasil).
- Bulk upload lolos; duplikat tetap terdeteksi.
Baseline dev: `mis-dev` & `mis-staging-local` 2026-09-30 — daftar indeks sesuai harapan, `migrate status` up to date, drift tabel produksi 0.

## #335 — Titik patok Detail Lembaga/Petani dimuat malas

### TC-335-01 · KPI Patok dari hitungan, titik dimuat saat layer dicentang [P1] (5 mnt)
Prasyarat: akun ADMIN; Lembaga ber-patok banyak (kode `ISH-1408-02`/`ICS-1408-02` di data snapshot) dan satu petaninya yang punya patok; DevTools → Network.
Langkah:
1. Buka Detail Lembaga → tab **Lahan**. Catat kartu **Patok** (jumlah · % terpasang) dan angka di baris legenda **Patok lahan**.
2. Centang **Patok lahan**.
3. Refresh halaman (F5), buka tab Lahan lagi, centang sekali lagi.
4. Ulangi 1–2 di Detail Petani (tab Lahan).
5. (Akun ber-scope `BY_FARMER_GROUP`) buka URL Detail Lembaga/Petani di luar cakupan.
Harapan:
- Langkah 1: payload halaman tidak memuat titik; kartu & legenda sudah menunjukkan jumlah (sama dengan Report › Patok untuk Lembaga itu).
- Langkah 2: label sempat "Memuat patok…", lalu titik kuning tampil; jumlah titik = angka legenda.
- Langkah 3: sesudah refresh checkbox tak tercentang; mencentang memuat ulang titik.
- Langkah 5: halaman "tidak ditemukan", tidak ada titik atau jumlah patok yang bocor.
Baseline dev: `mis-dev` 2026-09-30 — Lembaga 7.884 patok (0% terpasang), petani 74 patok, keduanya = hitungan SQL langsung; titik tergambar sesudah dicentang.

## #396 — Rencana Pengembangan per rilis (lanjutan #378/#389)

### TC-396-01 · Menu, tab, dan pemilih rilis Rencana Pengembangan [P1] (5 mnt)
Prasyarat: label menu `data-analyst-sprint` sudah di-seed lewat `seed-menu-only.ts` di staging; akun MANAGEMENT dan OPERATOR.
Langkah:
1. (MANAGEMENT) Buka sidebar **Data Analyst** → **Rencana Pengembangan**.
2. Baca strip ringkasan di atas tab (umur dokumen, rilis yang dikejar, keputusan menunggu).
3. Tab **Rilis**: pilih rilis lain lewat pemilih, lalu buka combobox **Riwayat** dan pilih `v1.2.0`.
4. Tab **Analisa**: arahkan kursor ke batang grafik beban per rilis paling kanan.
5. Tab **Semua Issue**: pilih satu rilis di combobox, filter status, ketik `#342` di pencarian.
6. Muat ulang halaman; lalu buka URL lama `/admin/data-analyst/sprint?sprint=1`.
7. (OPERATOR) buka `/admin/data-analyst/sprint`.
Harapan:
- Label sidebar dan judul halaman "Rencana Pengembangan" (bukan "Sprint Mingguan"); URL tetap `/admin/data-analyst/sprint`.
- Rilis berjalan = rilis pertama yang belum dirilis (v1.3.0); progres poin S/M/L dan kanban 4 kolom sesuai tabel di `docs/project/sprint.md`.
- Riwayat `v1.2.0` tampil sebagai rilis yang sudah dirilis.
- Tooltip grafik beban tidak terpotong di tepi kartu (desktop).
- Semua Issue memuat baris dari tabel Rilis + Backlog; pencarian `#342` menyisakan baris #342; tab & filter bertahan sesudah muat ulang; parameter `sprint` lama dibersihkan tanpa galat.
- OPERATOR dialihkan (menu tak tersedia untuk perannya).
Baseline dev: `mis-dev` 2026-09-30 — label menu "Rencana Pengembangan", ikon `CalendarRange`; parser dijaga `release-plan.test.ts` (27) + `plan-status.test.ts` (8).
