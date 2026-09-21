# QA/QC v0.37.0 — Ketersediaan Data DA-02/DA-03 (#352) + audit dead code (#353) + #350/#288 + seed menu

| | |
|---|---|
| Versi | v0.37.0 (MINOR — fitur baru DA-02/DA-03, tanpa breaking) |
| Rentang | `c7d9fb9` (v0.36.0) .. `mvp` HEAD |
| Migrasi | 1 (`20260921120000_drop_activity_status_tree_surveyed_at`, #353 E) + seed menu (`seed-menu-only.ts --apply`, diff 3 baris) — applied **lokal saja**; staging/prod → **#357** |
| Berkas | [00-scope](./00-scope.md) · [01-smoke](./01-smoke.md) · [02-test-cases](./02-test-cases.md) · [03-data-qc](./03-data-qc.md) · [04-findings](./04-findings.md) · [05-signoff](./05-signoff.md) · [runs/](./runs/) |

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v0.37.0`)

| Run | Bagian | Pass | Fail | Blocked | N/A | Belum diisi |
|---|---|---:|---:|---:|---:|---:|
| 2026-09-21-local.md | Smoke | 26 | 0 | 5 | 0 | 0 |
| 2026-09-21-local.md | Kasus uji | 25 | 0 | 6 | 0 | 0 |
| 2026-09-21-local.md | Regresi | 0 | 0 | 8 | 0 | 0 |

**Run lokal 2026-09-21 (mis-dev, SUPERADMIN)** — sebelum #357. Seluruh kasus #352 (DA-02/DA-03), #353 E (QC A/B/F), #350, #288, seed menu dieksekusi: **25 Pass · 0 Fail**. Blocked = kasus peran OPERATOR/DONOR (menunggu owner login `qa-operator`/`qa-donor` di tab QA), unduhan Excel/PDF (izin unduh browser), dan 8 kasus regresi patok/NKT yang butuh berkas uji `scripts/local/QA-QC/`. Ditemukan & diperbaiki saat run: (1) `seedMenu` tidak memperbarui baris yang ada → label/order P4 tak akan sampai ke prod (`67c4f26`); (2) `menu.csv` usang 15 baris vs prod (admin mengubah lewat UI) → keputusan owner: prod = sumber kebenaran, CSV + 31 kalimat Bantuan/docs disamakan (`e3e4c7f`); (3) #350 ternyata ±20 Select — diperbaiki di wrapper (`50d22d2`).

## Keputusan

**Go / No-go (lokal):** **Go bersyarat** untuk lanjut #357 (deploy staging) — jalur inti #352 & QC skema terbukti; syarat: kasus OPERATOR/DONOR (TC-352-10/11/20, SM-28/29) dijalankan bersama owner sebelum sign-off, atau dijalankan di staging dengan akun QA peran.

## Known issues yang dibawa

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| #354 | ~5.400 tanggal lahir ≠ NIK tampil sebagai daftar kerja kualitas (informatif) | perbaikan massal butuh skrip ber-dry-run + persetujuan |
| #311 | `perf.test.ts` kadang merah di beban paralel | DevX |
