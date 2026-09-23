# QA/QC v1.1.0

| | |
|---|---|
| Versi | **v1.1.0** (MINOR — fitur baru #370–#372 + perubahan aturan UL Parcel Code #373; **rilis hari yang sama dengan v1.0.0 sebagai hotfix kritis**, keputusan owner 2026-09-23 — lihat di bawah) |
| Rentang | `v1.0.0..HEAD` (di `mvp`: `55e6472`..HEAD, 33 commit per wrap-up) |
| Migrasi | **1** — `20260923120000_external_id_shared_code`, **sudah applied** di mis-prod, mis-staging, mis-dev, mis-staging-local (2026-09-23) · **data**: pembersihan KT/Blok "Tidak Ada" #374 (417 baris; staging ✅, prod **sesudah deploy**, approval owner) |
| Run | lihat `runs/` — satu berkas per eksekusi |

## Kenapa hotfix kritis (pengecualian maks. 1 rilis/hari)

Migrasi #373 sudah berjalan di mis-prod sementara aplikasi prod masih v1.0.0 (TD-045, #376). Kode lama tidak galat — `findUnique` pada kunci lama tetap berupa `SELECT … WHERE source AND code` — tetapi pada **82 kode yang kini dipakai >1 lahan**, jalur reaktivasi kode di v1.0.0 bisa menyasar baris yang salah, dan tanda "Juga dipakai — cek silang" belum terlihat oleh pengguna. v1.1.0 menutup jendela ini.

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v1.1.0`)

_(belum ada run)_

## Keputusan

**Go / No-go:** … (tanggal, oleh siapa) — syarat: run staging penuh oleh tester (keputusan owner 2026-09-23), termasuk **TC-373-02 sisi B** dengan akun OPERATOR ter-scope — satu-satunya perilaku yang belum pernah terlihat di layar (smoke lokal 2026-09-23 hanya SUPERADMIN).

**Syarat khusus rilis ini:**

1. **Pembersihan data #374 di prod dilakukan SESUDAH deploy** (keputusan owner): dump → dry-run (harapan 417 baris / 3 Lembaga) → `--write` → `03-data-qc` D2 = 0 → snapshot Main Dashboard baru. Sebelum langkah ini selesai, Dashboard/Laporan KT/Detail Lembaga prod masih menghitung "Tidak Ada" sebagai KT (TD-046).
2. **Tanpa seed, tanpa menu/izin baru** — `rbac:compare` tidak wajib (nol berkas RBAC/menu/seed tersentuh).

## Known issues yang dibawa

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| TD-046 | "Tidak Ada" dijaga di input saja; skrip/SQL manual bisa memasukkannya lagi dan Dashboard/Laporan KT ikut menghitungnya | Opsi B #374 dipilih owner (data + penjaga input); cek berkala/constraint menunggu keputusan |
| 82 kode UL ganda | Lahan yang kodenya keliru ikut terhitung "sudah didata" (TD-035) | Pekerjaan cek silang data, bukan uji rilis |
| #286 butir 1–3 | Cache Next >2 MB & key FIRMS ke log saat musim karhutla | Arsitektur cache — dibawa dari v1.0.0 |
| #277 | Deploy staging tanpa `migrate deploy` | Tidak menggigit: migrasi #373 sudah applied manual di semua env |
| #342 · #237 · #364 · #363 · #311 | Lihat `docs/qa/v1.0.0/README.md` | Dibawa dari v1.0.0, tidak berubah |
