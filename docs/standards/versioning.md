# Standar — Versioning & Release

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Terkait: [workflow.md](./workflow.md) · [principles.md](./principles.md) · [../project/roadmap.md](../project/roadmap.md) · [../project/changelog.md](../project/changelog.md)

## Skema Versi

Menggunakan **Semantic Versioning** (`MAJOR.MINOR.PATCH`) yang diadaptasi untuk aplikasi: "breaking change" didefinisikan dari sisi **pengguna dan operasional**, bukan API library. Tag Git berformat `vX.Y.Z` dan hanya dibuat di branch `main`.

### Kriteria Bump

| Bump | Kapan dianggap naik versi | Contoh |
| --- | --- | --- |
| **MAJOR** | Perubahan yang memutus kompatibilitas: migrasi DB yang butuh intervensi manual/berisiko data, perombakan RBAC/alur login, perubahan struktur data yang membuat data lama tidak kompatibel, atau milestone besar (go-live produksi = `1.0.0`) | Penggantian mekanisme autentikasi yang memutus semua sesi/integrasi login, atau perubahan skema breaking pasca-1.0 yang butuh migrasi manual. (Catatan: restrukturisasi hierarki #189 memenuhi kriteria ini, tapi dirilis sebagai MINOR `0.16.0` sesuai aturan Pre-1.0.) |
| **MINOR** | Fitur baru yang terlihat pengguna: satu phase roadmap berstatus ✅ Done, modul/menu baru, kolom atau alur baru di UI | Phase MAP-01 selesai, bulk upload region baru, report baru |
| **PATCH** | Perbaikan tanpa fitur baru: bugfix, perbaikan performa, penyesuaian UI kecil, koreksi validasi | Perbaikan performa list action (#163) |

**Tidak memicu naik versi:** perubahan `docs:`, `chore:`, refactor internal tanpa dampak perilaku, dan perubahan seed/script dev. Perubahan seperti ini menumpang di rilis berikutnya.

### Hubungan dengan Conventional Commits

Prefix commit menentukan bump minimal pada rilis berikutnya:

- Ada `feat:` sejak rilis terakhir → minimal **MINOR**
- Hanya `fix:` / `perf:` → **PATCH**
- Hanya `docs:` / `chore:` / `refactor:` → tidak perlu rilis
- Breaking change (lihat kriteria MAJOR) → **MAJOR** — tandai di body commit dengan `BREAKING CHANGE:`

### Aturan Pre-1.0

Selama versi masih `0.x`:

- MAJOR ditahan di `0`; perubahan breaking cukup menaikkan MINOR (mis. `0.5.0` → `0.6.0`).
- `1.0.0` disimpan untuk **go-live produksi**.

## Alur Rilis

Versi mengikuti governance roadmap: status phase hanya naik jika terverifikasi lewat code, dan rilis mengikuti status tersebut.

1. **Kerja harian di branch aktif** (`mvp`) dengan conventional commits — sesuai [workflow.md](./workflow.md).
2. **Titik rilis** — setiap **phase roadmap Done** ([roadmap.md](../project/roadmap.md)) atau setiap **ringkasan dua mingguan** di [changelog.md](../project/changelog.md), mana yang lebih dulu terasa utuh. Tidak rilis per commit.
   - **Maksimal satu rilis per hari.** Bila ada beberapa pemicu dalam sehari (beberapa phase Done / beberapa `feat:`), gabungkan menjadi **satu rilis di akhir hari** dengan bump tertinggi yang berlaku — jangan rilis beruntun seperti 2026-07-15 (v0.9.0 → v0.10.0 → v0.11.0 dalam sehari). Satu-satunya pengecualian: **hotfix kritis produksi** setelah rilis hari itu.
3. **Gate lokal**: `npm run lint`, `npm run build`, dan `npm test` lulus (Pre-Commit Gate di [workflow.md](./workflow.md)) — ketiganya **tidak** dijalankan CI, jadi harus dipastikan lokal. Di PR, CI menjalankan `gitleaks` & `semgrep`; periksa `gh pr checks <nomor>` hijau sebelum merge.
4. **Bump versi**: update `version` di `package.json`, tambah entri rilis di [changelog.md](../project/changelog.md), commit dengan pesan `chore(release): vX.Y.Z`.
5. **PR `mvp` → `main`**, merge setelah approval. ⚠️ **Merge ke `main` memicu deploy produksi otomatis** (`deploy-main.yml`) — pastikan migrasi DB yang dibutuhkan sudah diterapkan lebih dulu.
6. **Tag & Release di `main`**:
   - Annotated tag: `git tag -a vX.Y.Z -m "vX.Y.Z"` pada merge commit di `main`, lalu `git push origin vX.Y.Z`.
   - GitHub Release: `gh release create vX.Y.Z` dengan release notes diambil dari ringkasan changelog — **bukan** auto-generate dari commit mentah, agar konsisten dengan changelog sebagai catatan historis.

### Checklist Rilis

- [ ] Belum ada rilis lain di hari yang sama (aturan **maks. 1 rilis/hari**; kecuali hotfix kritis)
- [ ] Semua commit sejak rilis terakhir sudah ter-review (issue workflow selesai)
- [ ] Lint, build, dan test lulus lokal
- [ ] Check CI di PR hijau (`gitleaks`, `semgrep`) — `gh pr checks <nomor>`
- [ ] Migrasi DB yang dibutuhkan sudah diterapkan **sebelum** merge (merge = deploy produksi)
- [ ] `package.json` `version` sudah di-bump sesuai kriteria
- [ ] Entri rilis tercatat di `docs/project/changelog.md`
- [ ] **Metrik Nilai Rilis dihitung** → baris baru di [`project/metrics.md`](../project/metrics.md) (lihat §Metrik Nilai Rilis)
- [ ] PR `mvp` → `main` merged
- [ ] Annotated tag `vX.Y.Z` dibuat di `main` dan di-push
- [ ] GitHub Release dibuat dengan notes dari changelog

## Catatan Historis

- Tag lama `v1.8-complete` (April 2026) **tidak mengikuti skema ini** dan tidak dipakai sebagai acuan; dibiarkan apa adanya karena menghapus tag yang sudah di-push berisiko membingungkan.
- Skema ini mulai bersih dari tag SemVer pertama (`v0.x.0`); penentuan angka awal dicatat di Decision Log ([changelog.md](../project/changelog.md)) saat rilis pertama dibuat.

## Metrik Nilai Rilis

> Diputuskan 2026-08-05 (#226) — cara mengkuantifikasi nilai tiap rilis **berbasis artefak terverifikasi** (Phase Status, issue, pengukuran, test), bukan perasaan. Tiga metrik saling melengkapi; ketiganya dihitung **saat rilis** dan dicatat sebagai **satu baris di [`project/metrics.md`](../project/metrics.md)** (tabel riwayat seluruh rilis; entri rilis changelog cukup menyebut ringkas). Baca **trennya antar rilis**, bukan angka absolutnya — metrik begini mudah di-game bila dijadikan target individu; posisikan sebagai alat komunikasi, bukan KPI orang.

### 1. Progres Roadmap Tertimbang (audiens: manajemen/donor)

Persentase menuju go-live `1.0.0`, dihitung dari tabel **Phase Status** di [roadmap.md](../project/roadmap.md):

- **Bobot phase** — Inti go-live = **2** (stream PLATFORM, MD-01…06, DASH, MAP, RPT, BULK, HELP, DA); Pendukung/pasca-go-live = **1** (MD-07…11, TOOLS, CMS, COMM, OPS).
- **Nilai status** — ✅ Done = 1 · 🟠 Partial = 0,5 · lainnya = 0.
- **Skor** = Σ(bobot × nilai) ÷ Σbobot.

Baseline (dihitung 2026-08-05, 46 phase): inti 35 phase (34 ✅ + BULK-02 belum) = 68/70; pendukung 11 phase (3 🟠) = 1,5/11 → **69,5 / 81 = 85,8%**. Perubahan bobot/klasifikasi phase wajib dicatat di Decision Log.

### 2. Papan KPI Produk (audiens: manajemen — "makin baik atau tidak")

Lima metrik tetap, diukur ulang tiap rilis; laporkan sebagai tabel delta (tanpa agregat tunggal):

| # | KPI | Cara ukur | Baseline v0.21.0 |
| - | --- | --------- | ---------------- |
| 1 | Payload peta distrik terbesar | Proyeksi `getMapData` distrik ber-persil terbanyak (sampel ≥500 persil nyata) | 2,67 MB |
| 2 | Cakupan tutorial Bantuan | Menu ber-tutorial ÷ total menu (audit #207) | 23/28 (82%) |
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
