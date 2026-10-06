# Standar — Versioning & Release

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Terkait: [workflow.md](./workflow.md) · [principles.md](./principles.md) · [../project/roadmap.md](../project/roadmap.md) · [../project/changelog.md](../project/changelog.md)

## Skema Versi

Menggunakan **Semantic Versioning** (`MAJOR.MINOR.PATCH`) yang diadaptasi untuk aplikasi: "breaking change" didefinisikan dari sisi **pengguna dan operasional**, bukan API library. Tag Git berformat `vX.Y.Z` dan hanya dibuat di branch `main`.

### Kriteria Bump

| Bump | Kapan dianggap naik versi | Contoh |
| --- | --- | --- |
| **MAJOR** | Perubahan yang memutus kompatibilitas: migrasi DB yang butuh intervensi manual/berisiko data, perombakan RBAC/alur login, perubahan struktur data yang membuat data lama tidak kompatibel, atau milestone besar (`1.0.0` = MVP, dirilis 2026-09-23) | Penggantian mekanisme autentikasi yang memutus semua sesi/integrasi login, atau perubahan skema breaking pasca-1.0 yang butuh migrasi manual. (Catatan: restrukturisasi hierarki #189 memenuhi kriteria ini, tapi dirilis sebagai MINOR `0.16.0` sesuai aturan Pre-1.0.) |
| **MINOR** | Fitur baru yang terlihat pengguna: satu phase roadmap berstatus ✅ Done, modul/menu baru, kolom atau alur baru di UI | Phase MAP-01 selesai, bulk upload region baru, report baru |
| **PATCH** | Perbaikan tanpa fitur baru: bugfix, perbaikan performa, penyesuaian UI kecil, koreksi validasi | Perbaikan performa list action (#163) |

**Tidak memicu naik versi:** perubahan `docs:`, `chore:`, refactor internal tanpa dampak perilaku, dan perubahan seed/script dev. Perubahan seperti ini menumpang di rilis berikutnya.

### Hubungan dengan Conventional Commits

Prefix commit menentukan bump minimal pada rilis berikutnya:

- Ada `feat:` sejak rilis terakhir → minimal **MINOR**
- Hanya `fix:` / `perf:` → **PATCH**
- Hanya `docs:` / `chore:` / `refactor:` → tidak perlu rilis
- Breaking change (lihat kriteria MAJOR) → **MAJOR** — tandai di body commit dengan `BREAKING CHANGE:`

### Aturan Pre-1.0 — **DICABUT 2026-09-23 (v1.0.0)**

Berlaku untuk rilis `0.1.0`–`0.38.0` dan disimpan di sini agar riwayat versi lama tetap terbaca: MAJOR ditahan di `0`, sehingga perubahan breaking cukup menaikkan MINOR (mis. `0.5.0` → `0.6.0`) — itulah sebabnya restrukturisasi hierarki #189 terbit sebagai `0.16.0`, bukan `1.0.0`. `1.0.0` disimpan untuk milestone.

Aturan ini **tidak berlaku lagi** sejak `1.0.0`.

### Aturan Pasca-1.0

`1.0.0` dirilis **2026-09-23** atas keputusan owner: sistem dinyatakan mencapai **MVP**. Yang perlu dicatat supaya angka ini tidak salah dibaca kemudian:

- **MVP ≠ roadmap 100%.** Roadmap saat `1.0.0` terbit ada di **88,5%** (`roadmap.md` Phase Status). `1.0.0` menyatakan *cakupan minimum yang dianggap layak dipakai*, bukan *seluruh fase selesai*. Sisa fase tetap berjalan dan akan terbit sebagai MINOR di atas `1.x`.
- **MAJOR sekarang benar-benar berarti breaking.** Sejak `1.0.0`, kriteria MAJOR di tabel di atas dipakai apa adanya — tidak ada lagi pengecualian yang menurunkannya menjadi MINOR. Yang memicu `2.0.0`: migrasi DB yang butuh intervensi manual atau berisiko data, perombakan RBAC/alur login yang memutus sesi/integrasi, dan perubahan struktur data yang membuat data lama tidak kompatibel. Commit-nya wajib menandai `BREAKING CHANGE:` di body.
- **Ragu antara MAJOR dan MINOR?** Pertanyaannya bukan "seberapa besar pekerjaannya" melainkan "apakah operator/data yang ada hari ini tetap jalan tanpa langkah manual". Bila butuh langkah manual, itu MAJOR.

## Alur Rilis

Versi mengikuti governance roadmap: status phase hanya naik jika terverifikasi lewat code, dan rilis mengikuti status tersebut.

1. **Kerja harian di branch aktif** (`mvp`) dengan conventional commits — sesuai [workflow.md](./workflow.md).
2. **Titik rilis** — setiap **phase roadmap Done** ([roadmap.md](../project/roadmap.md)) atau setiap **ringkasan dua mingguan** di [changelog.md](../project/changelog.md), mana yang lebih dulu terasa utuh. Tidak rilis per commit.
   - **Maksimal satu rilis per hari.** Bila ada beberapa pemicu dalam sehari (beberapa phase Done / beberapa `feat:`), gabungkan menjadi **satu rilis di akhir hari** dengan bump tertinggi yang berlaku — jangan rilis beruntun seperti 2026-07-15 (v0.9.0 → v0.10.0 → v0.11.0 dalam sehari). Satu-satunya pengecualian: **hotfix kritis produksi** setelah rilis hari itu.
3. **Gate lokal**: `npm run lint`, `npm run build`, `npm run typecheck`, dan `npm test` lulus (Pre-Commit Gate di [workflow.md](./workflow.md)) — keempatnya **tidak** dijalankan CI, jadi harus dipastikan lokal. Di PR, CI menjalankan `gitleaks` & `semgrep`; periksa `gh pr checks <nomor>` hijau sebelum merge.
4. **QA/QC manual di staging** — setelah migrasi + seed diterapkan ke `mis-staging` dan `mvp → staging` di-deploy, jalankan `docs/qa/vX.Y.Z/` (smoke per menu, kasus uji per issue, QC angka DB); temuan blocker/major menahan rilis. `05-signoff.md` (dev · QA · owner) adalah prasyarat langkah berikutnya. Lihat [../qa/README.md](../qa/README.md).
5. **Bump versi**: update `version` di `package.json`, tambah entri rilis di berkas bulan berjalan [changelog/](../project/changelog.md) (`YYYY-MM.md`), commit dengan pesan `chore(release): vX.Y.Z`.
6. **PR `staging` → `main`** (`staging` sudah berisi `mvp` dari langkah 4), merge setelah approval. ⚠️ **Merge ke `main` memicu deploy produksi otomatis** (`deploy-main.yml`) — pastikan migrasi DB yang dibutuhkan sudah diterapkan lebih dulu (bila terlupa, guard `migrate status` di `deploy-main.yml` menghentikan deploy sebelum build dan aplikasi lama tetap jalan, #394 — terapkan migrasi lalu *re-run* job), lalu segarkan `prisma/migrations/applied-checksums.json` (skrip `scripts/migrations/refresh-applied-checksums.ts`, #303) dan ikutkan di commit rilis. **Migrasi prod di luar rilis** (untuk kebutuhan data, mendahului kode) hanya bila kompatibel mundur dengan tag yang live atau rilisnya menyusul hari yang sama — aturan lengkap di [database/migrations.md](../database/migrations.md) §Migrasi prod di luar rilis (#376, TD-045). Bila rilis harus dibatalkan: [rollback.md](./rollback.md).
7. **Tag & Release di `main`**:
   - Annotated tag: `git tag -a vX.Y.Z -m "vX.Y.Z"` pada merge commit di `main`, lalu `git push origin vX.Y.Z`.
   - GitHub Release: `gh release create vX.Y.Z` dengan release notes diambil dari ringkasan changelog — **bukan** auto-generate dari commit mentah, agar konsisten dengan changelog sebagai catatan historis.
8. **Pengumuman Telegram** — teks **compact**, maks ±6 baris: judul versi, 2–3 poin fitur/perbaikan dalam bahasa awam (tanpa nomor issue/istilah teknis), tutup dengan progres roadmap. Metrik internal (RVS/KPI/jumlah test) **tidak** ikut — cukup di changelog & release notes.

### Checklist Rilis

- [ ] Belum ada rilis lain di hari yang sama (aturan **maks. 1 rilis/hari**; kecuali hotfix kritis)
- [ ] Semua commit sejak rilis terakhir sudah ter-review (issue workflow selesai)
- [ ] Lint, build, typecheck, dan test lulus lokal
- [ ] **QA/QC manual** `docs/qa/vX.Y.Z/` selesai di staging: `01-smoke` + `02-test-cases` + `03-data-qc`, temuan blocker/major tuntas, **`05-signoff.md` terisi** (dev · QA · owner)
- [ ] `npm run rbac:compare` — selisih izin seed ↔ produksi ditinjau (lihat #263; selisih yang disengaja dicatat, bukan diabaikan)
- [ ] Check CI di PR hijau (`gitleaks`, `semgrep`) — `gh pr checks <nomor>`
- [ ] Migrasi DB yang dibutuhkan sudah diterapkan **sebelum** merge (merge = deploy produksi)
- [ ] Bila ada migrasi: **snapshot checksum disegarkan** setelah `migrate deploy` — `npx dotenv -e .env.prod -- npx tsx scripts/migrations/refresh-applied-checksums.ts` → commit `prisma/migrations/applied-checksums.json` (guard #303; lihat [database/migrations.md](../database/migrations.md) §Checklist Pra-Deploy). Tanpa ini, gate lokal mesin lain akan merah pada migrasi baru.
- [ ] `npm run migrations:release-gap` — tanpa DB; sebelum rilis boleh menunjuk migrasi yang memang akan dibawa rilis ini (ada di `mvp`, belum di tag). Sesudah tag baru di-push, jalankan ulang (`git fetch --tags`): harus **✓ tidak ada jendela terbuka**. Selisih lain = migrasi prod di luar rilis yang belum tertutup (#376)
- [ ] `package.json` `version` sudah di-bump sesuai kriteria
- [ ] Entri rilis tercatat di `docs/project/changelog/YYYY-MM.md`
- [ ] **Metrik Nilai Rilis dihitung** → baris baru di [`project/metrics.md`](../project/metrics.md) (lihat §Metrik Nilai Rilis)
- [ ] PR `staging` → `main` merged
- [ ] Annotated tag `vX.Y.Z` dibuat di `main` dan di-push
- [ ] GitHub Release dibuat dengan notes dari changelog
- [ ] Teks pengumuman Telegram (compact, §langkah 8) disiapkan

## Catatan Historis

- Tag lama `v1.8-complete` (April 2026) **tidak mengikuti skema ini** dan tidak dipakai sebagai acuan; dibiarkan apa adanya karena menghapus tag yang sudah di-push berisiko membingungkan.
- Skema ini mulai bersih dari tag SemVer pertama (`v0.x.0`); penentuan angka awal dicatat di Decision Log ([changelog.md](../project/changelog.md)) saat rilis pertama dibuat.

## Metrik Nilai Rilis

> Diputuskan 2026-08-05 (#226) — cara mengkuantifikasi nilai tiap rilis **berbasis artefak terverifikasi** (Phase Status, issue, pengukuran, test), bukan perasaan. Tiga metrik saling melengkapi; ketiganya dihitung **saat rilis** dan dicatat sebagai **satu baris di [`project/metrics.md`](../project/metrics.md)** (tabel riwayat seluruh rilis; entri rilis changelog cukup menyebut ringkas). Baca **trennya antar rilis**, bukan angka absolutnya — metrik begini mudah di-game bila dijadikan target individu; posisikan sebagai alat komunikasi, bukan KPI orang.

### 1. Progres Roadmap Tertimbang (audiens: manajemen/donor)

Persentase kelengkapan fase, dihitung dari tabel **Phase Status** di [roadmap.md](../project/roadmap.md). **Reset 2026-09-30:** metrik ini dulu dibaca sebagai "progres menuju `1.0.0`"; `1.0.0` terbit pada **88,5%**, lalu baseline itu dibekukan di [roadmap-mvp.md](../project/roadmap-mvp.md). Sejak reset, Roadmap % mengukur **Roadmap 2026–2027** (fase pasca-MVP, horizon kuartal) dan dimulai dari **8,6%**. Angka lintas dua baseline tidak boleh dibandingkan:

- **Bobot phase** — dibaca dari kolom **`Bobot`** pada tabel Phase Status roadmap.md, satu baris satu fase: `inti` = **2** (komitmen roadmap 2026–2027 yang dilaporkan ke manajemen/donor), `pendukung` = **1** (pelengkap/operasional). Arti rinci di roadmap.md §Bobot Definition. Kolom itu **satu-satunya sumber klasifikasi**; daftar stream di sini hanya glosarium, bukan acuan.
- **Nilai status** — ✅ Done = 1 · 🟠 Partial = 0,5 · lainnya = 0.
- **Skor** = Σ(bobot × nilai) ÷ Σbobot.

Baseline awal (dihitung 2026-08-05, 46 phase): inti 35 phase (34 ✅ + BULK-02 belum) = 68/70; pendukung 11 phase (3 🟠) = 1,5/11 → **69,5 / 81 = 85,8%**. Baseline berjalan sejak v0.24.0 (48 phase): inti 37 = 72/74; pendukung 11 = 2/11 → **74 / 85 = 87,1%**. Baseline MVP beku (v1.2.0, 51 phase): **80,5 / 91 = 88,5%**. **Baseline Roadmap 2026–2027** (2026-09-30, 26 phase): inti 9 = 2/18; pendukung 17 = 1/17 → **3 / 35 = 8,6%**.

Sejak #250 angka ini **tidak lagi hanya dihitung tangan**: `src/lib/roadmap.ts` memparse tabel Phase Status saat build, dan unit test menghitung ulang Roadmap % lalu membandingkannya dengan baris rilis terakhir di `project/metrics.md` (toleransi **0,1 pp**). Konsekuensinya, **menambah atau mengubah fase mengubah penyebut** — baris metrics.md pada rilis yang sama wajib ikut, kalau tidak gate lokal gagal. Perubahan bobot/klasifikasi phase tetap wajib dicatat di Decision Log; rinciannya bisa dibaca langsung di section **Detail roadmap** pada dashboard Metrik Rilis.

### 2. Papan KPI Produk (audiens: manajemen — "makin baik atau tidak")

Lima metrik tetap, diukur ulang tiap rilis; laporkan sebagai tabel delta (tanpa agregat tunggal):

| # | KPI | Cara ukur | Baseline v0.21.0 |
| - | --- | --------- | ---------------- |
| 1 | Payload peta distrik terbesar | Proyeksi `getMapData` distrik ber-persil terbanyak (sampel ≥500 persil nyata) | 2,67 MB |
| 2 | Cakupan tutorial Bantuan | Menu **daun** ber-tutorial ÷ total menu daun aktif — dihitung dari frontmatter `menuKey` pada `src/content/help/**`, bukan ditaksir. Menu induk (wadah grup) tidak dihitung karena tak punya halaman. Sejak #339 (2026-09-15) angkanya **dijaga `src/test/help-registry.test.ts`**: menu daun baru tanpa tutorial membuat gate merah kecuali dinyatakan eksplisit di `TANPA_TUTORIAL` (per 2026-09-15: 32/35; per 2026-09-18: 34/37 — +2 menu Monev BMP #344, keduanya ber-tutorial; per 2026-09-23: **39/39** (per 2026-09-29; 37/37 saat #257 ditutup) ; per 2026-10-06: **41/41** — +2 menu prototipe Rantai Pasok #379, keduanya ber-tutorial — `TANPA_TUTORIAL` **kosong**, #257 tuntas: menu `help` ditutup topik konsep 1-4 "Cara Memakai Bantuan" yang diberi `menuKey`, lalu `report-kelompok-tani-detail` (`l-10`) dan `dashboard-snapshot-bmp` (`l-11`) ditulis tutorialnya). Sesuai definisi di atas (frontmatter `src/content/help/**`), yang dihitung adalah **setiap** materi ber-`menuKey`, bukan hanya lapis `tutorial/` — halaman Bantuan tak bisa punya tutorial ke dirinya sendiri. | 23/28 (82%) |
| 3 | Test otomatis | Jumlah test `npm test` | 748 |
| 4 | Bug terbuka | Issue open berlabel `bug` | 0 |
| 5 | Tech debt aktif | Item aktif di [tech-debt.md](../project/tech-debt.md) | 12 (10 per 07-28 + TD-030/031) |

### 3. Release Value Score / RVS (audiens: tim — narasi nilai per rilis)

Skor kumulatif per rilis; anchor **v0.9.0 (rilis SemVer pertama) = 1000**, tiap rilis menambahkan poin dari artefak siklusnya. Riwayat lengkap (termasuk rekonstruksi retrospektif v0.9.0–v0.21.0 ≈ 1774, bertanda ± karena diestimasi dari changelog) ada di [`project/metrics.md`](../project/metrics.md):

| Komponen | Poin | Sumber |
| --- | --- | --- |
| Fitur/UX per issue (S / M / L) | 5 / 15 / 40 | issue + retro |
| Bug fix (minor / sedang / kritis) | 3 / 8 / 20 | severity di issue |
| Perbaikan performa **terukur** | 0,5 × % perbaikan (cap 25/item) | angka di issue |
| Test baru | 0,5 per test (cap 15/rilis) | delta `npm test` |
| Audit/review menyeluruh terverifikasi | 5 | retro |
| Tech debt ditutup | 3 per TD | tech-debt.md |

Ukuran fitur S/M/L dinilai saat menutup issue (S = satu komponen/halaman; M = lintas beberapa file/halaman; L = modul baru). Rilis kualitas (hanya `fix:`/`perf:`) tetap menghasilkan poin — itu memang tujuannya. RVS **tidak** menggantikan kriteria bump SemVer.

Contoh perhitungan siklus pasca-v0.21.0 (#222–#225): bug sedang 8 + UX-S 5 + perf 37,4%→18,7 + UX-S lazy point 5 + 3 perbaikan degradasi 24 + audit 5 + 10 test 5 ≈ **+71** (dari ±1774 → ±1845).
