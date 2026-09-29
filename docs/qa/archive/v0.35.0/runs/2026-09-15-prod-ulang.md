# Run — v0.35.0 · prod · 2026-09-15 · ulang

| | |
|---|---|
| Commit `mvp` | `main` `af6e30b` (v0.35.0) |
| Deploy run | `deploy-main.yml` 34967254710 |
| DB | `mis-prod` · migrasi applied ya · seed menu ya |
| Browser | Chrome (ekstensi) / macOS · 1456 |
| Tester | Claude (permintaan Sofyan) — ulang 2 smoke yang Blocked pada run 21:20 |
| Akun dipakai | SUPERADMIN `demo@wri.org` — **setelah logout/login ulang di profil Chrome yang sama**; `/api/auth/session` → `role: "SUPERADMIN"` (sebelumnya `OPERATOR` walau token baru dirotasi — #342 terkonfirmasi) |
| Lingkup | `ulang: SM-24,SM-26` |

Status: Pass · Fail · Blocked · N/A. Fail **wajib** punya baris di `04-findings.md`. Kolom Konsol: `-` bersih, atau pesan error pertama.

## Smoke

| ID | Halaman | Status | Konsol | Catatan · bukti |
|---|---|---|---|---|
| SM-24 | Bulk Upload › Petani · Produksi · Lahan (tiap tab) · Pohon [P0] | Pass | - | Petani · Produksi · Pohon: heading + input berkas tampil. Lahan: 3 tab — Poligon (ZIP), Detail Lahan (Excel, tombol "Daftar lahan terdampak NKT (pola Lampiran asesmen)" = Template NKT), Patok (Excel/CSV/shapefile titik, Unduh Template Excel). Tidak ada berkas diunggah |
| SM-26 | Settings › Users · Menu · Roles · Regions [P0] | Pass | - | Menu: `report-marker` · Patok · order 7 · Aktif di bawah Report, ikon Milestone. Roles: baris Patok ADMIN ●●●○●● (5) · OPERATOR ○●○○●● (3) · MANAGEMENT (3) · DONOR ○●○○○● (2) = seed. Users & Regions: tabel termuat. Tanpa perubahan apa pun |

## Kasus uji

| ID | Kasus | Status | Catatan · bukti |
|---|---|---|---|

## Regresi

| ID | Kasus | Status | Catatan · bukti |
|---|---|---|---|

## QC data (tempel keluaran `data-qc.ts`)

