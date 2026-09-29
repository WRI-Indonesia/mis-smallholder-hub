# 04 · Temuan — v0.36.0

| # | Run | Kasus | Temuan | Tingkat | Tindakan / issue |
|---|---|---|---|---|---|
| F-01 | 2026-09-20-local | TC-346-04 | Pratinjau import form survei menghitung ulang **tanpa** penilaian Lembaga tersimpan (berkas tanpa sheet Lembaga → pratinjau 1,76, server menyimpan 2,21) — angka di pratinjau ≠ yang tersimpan | P1 | ✅ diperbaiki di run: panel memuat `getBmpGroupAssessments` untuk Lembaga terpilih, fallback per tahun + aturan "berkas pertama" seperti server; catatan "Penilaian Lembaga tersimpan tahun ini dipakai untuk hitung ulang" di kolom peringatan |
| F-02 | 2026-09-20-local | TC-344-04 | Pemicu filter Status (SUPERADMIN) menampilkan nilai mentah `active`/`inactive` — perilaku lama di 6 halaman daftar, bukan regresi | P2 | **#350** |
| — | 2026-09-20-local | TC-346-09 | Revisi owner: rincian inline tab Petani → radar kiri (tanpa legenda, 300 px) + daftar indikator dilipat per kegiatan di kanan | — | ✅ diterapkan di run (komponen radar bersama + `Collapsible`) |
| — | 2026-09-20-local | SM-13 | Revisi owner: label legenda "Lahan NKT (termasuk/terdampak)" → **"Lahan terdampak NKT"** (Peta Lahan, PDF legenda, tooltip peta sebaran, Bantuan, docs) | — | ✅ diterapkan |
