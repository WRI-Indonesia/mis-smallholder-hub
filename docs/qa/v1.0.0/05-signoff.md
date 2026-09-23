# 05 · Sign-off v1.0.0

| Peran | Nama | Tanggal | Keputusan | Syarat / catatan |
|---|---|---|---|---|
| Developer | Claude (Opus 5) | 2026-09-23 | **Go — terbatas** | Gate lokal hijau (lint 0 · build ✓ · tsc 0 · test 1.807). `02-test-cases.md` lengkap. Review pra-rilis rentang penuh 6 temuan: 5 diperbaiki, 1 diputuskan owner. **Tidak ada temuan blocker/major tersisa.** Syarat: dua baris di bawah terisi sebelum tag. |
| QA | — | 2026-09-23 | **Dilewati** | **Run staging TIDAK dijalankan** — atas keputusan owner, pola v0.35.0 & v0.36.0. Bukan "Go": tidak ada QA yang menilai rilis ini di staging. Satu-satunya bukti uji adalah run lokal `runs/2026-09-23-local.md` (5 Pass · 0 Fail · 4 Blocked, SUPERADMIN saja). |
| Owner | Sofyan Agus Salim | 2026-09-23 | **Go** | Known issues di `README.md` diterima, termasuk `FIRMS_MAP_KEY_FREE` tercetak ke log (#286 butir 2). QA staging dilewati dengan sadar. |

## Status sebenarnya — dibaca dulu sebelum mengisi dua baris kosong di atas

Rilis ini **belum memenuhi prasyarat tag** menurut `standards/versioning.md` §Alur Rilis. Yang sudah dan belum:

| Prasyarat | Status |
|---|---|
| Gate otomatis 5 langkah hijau | ✅ lint 0 · build ✓ · tsc 0 · test 1.807 · docs sinkron |
| `geom` kabupaten terisi di prod (syarat Go #1 rilis ini) | ✅ 12/12 di dev, staging, **dan prod**; outline prod 84 polygon / 75 kB |
| Migrasi prod applied + checksum disegarkan | ✅ **tidak berlaku** — rilis kode murni, nol migrasi |
| `rbac:compare` selaras | ✅ **tidak dijalankan, dan memang tidak perlu** — nol berkas RBAC/menu/seed/prisma tersentuh di rentang |
| Run **staging** dengan semua P0 Pass | ⚠️ **DILEWATI** atas keputusan owner 2026-09-23 (preseden v0.35.0 #340 & v0.36.0) |
| Run **prod** `--only P0` ≤ 1 jam setelah deploy | ⏳ menyusul deploy prod |
| Ketiga baris sign-off | ⚠️ Developer **Go terbatas** · QA **dilewati** · Owner **Go** |

## Batasan run lokal 2026-09-23 — kenapa ini bukan QA rilis

Dijalankan otomatis (Claude in Chrome) terhadap `mis-dev` + dev server lokal. Yang **tidak** tercakup:

1. **Peran OPERATOR & DONOR tidak diuji sama sekali** — hanya SUPERADMIN. `01-smoke.md` sendiri menulis: *"Peran non-SUPERADMIN wajib: bug scope tidak terlihat dari SUPERADMIN."* Ini lubang terbesar run ini.
2. **Smoke 31 kasus dan regresi 9 kasus tidak dijalankan** — regresi butuh berkas uji (shapefile patok, Excel NKT) yang tidak disiapkan.
3. **Cap 500 baris (#286 butir 5–6) tidak pernah terpicu** — titik < 15 km dari Lembaga = 0 pada rentang yang tersedia. Fitur ini hanya bekerja saat musim karhutla, dan **belum pernah terlihat bekerja pada data nyata**. Bukan Pass; dicatat Blocked.
4. **Lokal ≠ staging** — build produksi, RAM server, dan latensi tunnel tidak terwakili. #363 (OOM staging) khususnya hanya terbukti saat deploy staging sungguhan.

Yang **sudah** terbukti dan tidak perlu diulang identik di staging: invarian "Dalam Boundary" konsisten di kedua dokumen PDF (TC-365-02), kesamaan angka Fire Alert ↔ Peta Lahan (TC-280-02), dan pemilihan sumber arsip SP vs NRT (TC-365-01).

## Keputusan owner: QA staging dilewati (2026-09-23)

Owner memilih merilis tanpa menunggu run staging. Sah dan berpreseden (v0.35.0 saat OOM #340, v0.36.0 saat sidebar prod sudah menampilkan menu yang belum ter-deploy), tetapi **konsekuensinya harus tercatat**, bukan dikaburkan:

**Yang masuk produksi tanpa pernah diuji siapa pun:**

1. **Peran OPERATOR & DONOR** — tidak diuji di lingkungan mana pun pada rilis ini. `01-smoke.md` sendiri menulis *"bug scope tidak terlihat dari SUPERADMIN"*. Bila #280 atau #365 punya cacat cakupan, inilah tempatnya bersembunyi.
2. **Cap 500 baris (#286 butir 5–6)** — belum pernah terlihat bekerja pada data nyata. Terpicu hanya saat musim karhutla; kalau salah, gejalanya justru muncul di saat halaman ini paling dibutuhkan.
3. **Smoke 31 kasus + regresi 9 kasus** — tidak dijalankan.

**Mitigasi yang sudah ada:**

- Deploy staging **hijau** 6m26s (kode yang sama persis dengan yang akan ke prod).
- Syarat Go #1 diverifikasi langsung **di prod**: `geom` 12/12, outline 84 polygon / 75 kB.
- Rilis kode murni — nol migrasi, nol seed, nol perubahan izin. Rollback = deploy commit sebelumnya, tanpa urusan data.
- Gate otomatis hijau, test 1.807.

**Tindak lanjut wajib, bukan opsional:** jalankan run prod `--only P0` ≤ 1 jam setelah deploy, dan jalankan `TC-286-01/02` pada bulan padat begitu ada kesempatan. Kalau ditemukan cacat, ia sampai ke pengguna lebih dulu daripada ke penguji — itu harga yang dibayar keputusan ini.

## Setelah perbaikan temuan — apa yang diulang

Bukan seluruh suite: run ulang (`new-run.mjs --label ulang --only <ID,ID,…>`) memuat **kasus yang Fail** + **smoke P0 halaman yang tersentuh perbaikan** + `regression.md`. Seluruh suite diulang hanya bila perbaikan menyentuh lapisan bersama (RBAC, DataTable, PDF builder, migrasi).

Prasyarat tag `v1.0.0`: ketiga baris **Go**; migrasi prod applied + checksum disegarkan (**N/A** rilis ini); run prod (`--only P0`) diisi ≤ 1 jam setelah deploy.
