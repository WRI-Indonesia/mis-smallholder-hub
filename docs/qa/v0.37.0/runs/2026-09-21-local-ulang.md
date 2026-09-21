# Run — v0.37.0 · local · 2026-09-21 · ulang

| | |
|---|---|
| Commit `mvp` | `a784dfd` |
| Deploy run | — (dev server `:3000`) |
| DB | `mis-local` · migrasi applied `<ya/tidak>` · seed menu `<ya/tidak>` |
| Browser | Chrome (ekstensi Claude in Chrome) / macOS · lebar 1467 |
| Tester | owner login peran di tab QA · Claude (dev) menjalankan langkah |
| Akun dipakai | OPERATOR `qa-operator@localhost.test` (Rokan Hulu) · DONOR `qa-donor@localhost.test` |
| Lingkup | `ulang: SM-12,SM-21,SM-22,SM-28,SM-29,TC-352-10,TC-352-11,TC-352-20,TC-352-21,TC-SEED-02` |

Status: Pass · Fail · Blocked · N/A. Fail **wajib** punya baris di `04-findings.md`. Kolom Konsol: `-` bersih, atau pesan error pertama.

## Smoke

| ID | Halaman | Status | Konsol | Catatan · bukti |
|---|---|---|---|---|
| SM-12 | Report › Patok [P0] | Pass | - | DONOR: Report › Patok terbuka **tanpa** tombol Excel |
| SM-21 | Data Analyst › Ketersediaan Data — Semua Lembaga [P0] | Pass | - | OPERATOR: 10 Lembaga Rokan Hulu · skor 65 · 1/7/2/0 · aksi lintas Lembaga 9 Lembaga; radar/heatmap/modul hanya Lembaga scope |
| SM-22 | Data Analyst › Ketersediaan Data — Per Lembaga [P0] | Pass | - | OPERATOR: Lembaga luar scope tidak ada di dropdown; KPUD Tujuh Permata Index 64 teranalisa |
| SM-28 | Scope OPERATOR [P0] | Pass | - | OPERATOR: dropdown Distrik hanya Rokan Hulu; Lembaga 10 (semua Rokan Hulu); Master Data › Lembaga 10 baris Rokan Hulu, Petani 1.340, NIK tersensor, filter Status disembunyikan |
| SM-29 | Menu DONOR [P0] | Pass | - | DONOR: sidebar tanpa Master Data/Bulk Upload/Settings/Tools/Data Analyst; Report & Map tampil |

## Kasus uji

| ID | Kasus | Status | Catatan · bukti |
|---|---|---|---|
| TC-352-10 | Scope OPERATOR di Semua Lembaga [P0] | Pass | ?lembaga=ICS-1401-02&distrik=1401 (Kampar) diabaikan → tetap 10 Lembaga Rokan Hulu, 'Semua Distrik'; anomali sistemik hanya Lembaga ICS-1406-* |
| TC-352-11 | Menu DONOR: Semua Lembaga tidak tampil; Per Lembaga sesuai izin [P0] | Pass | DONOR tanpa menu Ketersediaan Data; URL manual /data-availability & /data-completeness → dialihkan ke /admin/dashboard/main (bukan data, bukan error) |
| TC-352-20 | Scope OPERATOR di Per Lembaga: `?lembaga=` di luar akses [P0] | Pass | OPERATOR ?lembaga=ICS-1401-02 → 'Lembaga Petani pada tautan ini tidak ditemukan atau di luar akses Anda'; dropdown Rokan Hulu saja; ganti KPUD Intan Makmur → KPUD Tujuh Permata cepat: hasil benar, tanpa toast error basi |
| TC-352-21 | Bantuan: tutorial a-1, p-6, referensi r-5 [P1] | Pass | DONOR: p-6 terbaca dengan banner 'Menu ini di luar hak akses akun Anda' + catatan izin EXPORT (desain: tutorial tetap boleh dibaca) — spesifikasi disesuaikan |
| TC-SEED-02 | Sidebar setelah seed: urutan tampak tidak berubah kecuali Data Analyst [P0] | Pass | DONOR: urutan grup Dashboard · Report · Map · Bantuan tetap; Data Analyst tidak tampil (sesuai izin) |

## Regresi

| ID | Kasus | Status | Catatan · bukti |
|---|---|---|---|

## QC data (tempel keluaran `data-qc.ts`)

