# 00 · Lingkup rilis v1.0.0

Sumber: `git log v0.38.0..HEAD` (17 commit), `gh issue list --state closed`, `docs/project/changelog.md`.

**Rilis kode murni** — tanpa migrasi DB, tanpa perubahan `prisma/schema`, `menu.csv`, seed, maupun izin. `rbac:compare` **tidak dijalankan**: nol berkas RBAC/menu/seed/prisma tersentuh di rentang ini, jadi rilis ini tidak mungkin menimbulkan drift.

| # | Issue | Judul singkat | Menu › sub-menu terdampak | Migrasi | Izin/menu baru | Bantuan | Kasus uji |
|---|---|---|---|---|---|---|---|
| 1 | #280 | Klip titik api ke outline Riau ter-union | Dashboard › Fire Alert · Peta › Peta Lahan | — | — | — (klaim `p-11` justru jadi lebih benar) | `TC-280-01…03` |
| 2 | #365 | Laporan bulanan titik api (arsip FIRMS sejak 2020) | Dashboard › Fire Alert | — | — | `p-11` | `TC-365-01…03` |
| 3 | #286 (butir 4–6) | Cap 500 baris tabel titik api; indeks klip | Peta › Peta Lahan (modal + PDF) | — | — | `3-2-peta` (konsep) | `TC-286-01…02` |
| 4 | #257 | Cakupan tutorial Bantuan 34/37 → **37/37** | Bantuan · Report › KT (Detail) · Tools › Snapshot BMP | — | — | `l-10`, `l-11` baru; `1-4`, `l-3`, `l-6` diperbarui | `TC-V1-01` |
| 5 | #363 (sebagian) | Type-check dipisah dari `next build` (OOM staging) | — (build/deploy) | — | — | — | — (terbukti saat deploy staging) |

## Di luar lingkup pengujian (sengaja)

- **#286 butir 1–3** — cache Next >2 MB, `FIRMS_MAP_KEY_FREE` tercetak ke log, cap payload/`413`. Tidak dikerjakan di rilis ini; lihat *Known issues* di `README.md`.
- **Modul di luar titik api & Bantuan** — tak satu pun berkasnya tersentuh di rentang ini. Cukup smoke (`01-smoke.md`), bukan uji fungsional.
- **Laporan bulanan Full Riau vs Σ distrik** — sengaja tidak dituntut sama. Titik di celah antar-kabupaten dan kabupaten non-program hanya muncul di Full Riau.

## Akun uji (staging) — **tanpa password di sini**; password di berkas lokal tester

| Peran | Akun | Scope | Dipakai untuk |
|---|---|---|---|
| SUPERADMIN | | semua | TC-280-01 (query DB), cetak PDF, Bantuan |
| OPERATOR ter-scope | | 1 Distrik | TC-365-02 scope Distrik — asimetri "Dalam Boundary" hanya terlihat dari sini |
| DONOR | | — | smoke read-only, menu yang tidak boleh tampil |

## Persiapan data uji

**Tidak ada `TC-PREP-*`.** Rilis ini tidak menambah tabel maupun kolom; seluruh kasus uji memakai data titik api dari FIRMS dan data lahan yang sudah ada. Yang perlu disiapkan hanya **pilihan periode**: satu bulan arsip yang titiknya banyak (musim kering, mis. Februari–Maret) agar cap 500 baris (`TC-286-01/02`) benar-benar terpicu. Pada bulan sepi, kedua kasus itu hanya membuktikan "tidak ada keterangan potongan", yang juga sah tetapi tidak menguji pemotongannya.
