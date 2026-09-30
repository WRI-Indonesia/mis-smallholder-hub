# 05 · Sign-off v1.2.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

| Peran | Nama | Tanggal | Keputusan | Syarat / catatan |
|---|---|---|---|---|
| Developer | Claude (Opus 5.5) | 2026-09-29 | **Go — terbatas** | Gate lokal hijau (lint 0 · build ✓ · tsc 0 · test 2.363). Review: `/audit`, review rentang penuh + lintas-issue (semua temuan valid diperbaiki; sisa kecil = TD-053). Run **lokal** 22/22 kasus uji Pass lintas SUPERADMIN, ADMIN, OPERATOR, DONOR. Tidak ada temuan blocker/major. |
| QA | — | 2026-09-29 | **Dilewati** | Deploy **staging gagal** (run `36568520490`: `next build` OOM — heap ±960 MB, RAM server 1,97 GB, #363); staging kemungkinan rusak sebagian sampai diperbaiki DevOps. Tidak ada run staging. |
| Owner | Sofyan Agus Salim | 2026-09-29 | **Go** | "lanjut main dulu aja gpp, nanti saya minta solve staging dengan dev ops". QA staging dilewati dengan sadar; known issues di `README.md` diterima. |

## Status sebenarnya

| Prasyarat | Status |
|---|---|
| Gate otomatis 5 langkah hijau | ✅ lint 0 · build ✓ · tsc 0 · test 2.363 · docs sinkron |
| Migrasi prod | ✅ **tidak berlaku** — nol migrasi |
| Seed menu prod (TC-PREP-01) | ⏳ sesudah deploy prod: `seed-menu-key.mjs` 2 menu (dry-run → persetujuan owner → `--apply`), `data-qc` G1/G2 |
| `rbac:compare` | ✅ 2026-09-29 vs mis-prod (baca-saja): selisih **11 baris = izin 2 menu baru** (di-seed sesudah deploy); 0 selisih lain — DONOR & peran lain = prod |
| Run **staging** semua P0 | ⚠️ **DILEWATI** — deploy staging OOM (#363); preseden v0.35.0 · v0.36.0 · v1.0.0 |
| Run **prod** `--only P0` ≤ 1 jam setelah deploy | ⏳ menyusul deploy prod |

## Risiko yang diterima karena staging dilewati

1. Build produksi berjalan di server prod (RAM 4 GB) — belum pernah membangun kode v1.2.0 di server; build lokal hijau.
2. Perubahan `getAccessContext` (#252) berlaku untuk semua halaman ber-scope; diuji lokal (OPERATOR, ADMIN ber-Lembaga, DONOR) terhadap snapshot prod 2026-09-28, belum di server.
3. Angka "Aktivitas ber-bukti" Ketersediaan Data turun untuk Lembaga ber-import `evidence_key = ''` (mis-prod 26) — disengaja (#385), perlu dikabarkan ke pengguna yang memantau angka itu.
