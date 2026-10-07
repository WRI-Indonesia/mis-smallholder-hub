# Target Program

[← Menu Master Data](README.md) · [← Katalog halaman](../README.md)

> #403 — angka kontrak / trayektori program (keputusan owner 2026-10-07, ditanya bertahap). Dipakai tampilan **vs Kontrak** di kartu Training Benefit per year ([dashboard/training.md](../dashboard/training.md)).

## Diagram objek

```text
Halaman: Target Program (/admin/master-data/program-target)
├── Header — judul + HelpHint (t-9) + deskripsi
└── Card grid
    ├── Tabel: baris = indikator kontrak (2) + baris "Total Farmers trained in the year" (dihitung)
    │   kolom = Start of the Program (s.d. <tahun>, tahun bisa diubah) · tahun target (× hapus kolom) · Total (dihitung)
    ├── Sel: input angka (izin EDIT) / angka saja (tanpa EDIT); bingkai merah bila bukan bilangan bulat
    ├── Tombol: Tambah tahun · Simpan target (seluruh grid sekali simpan)
    └── Catatan: definisi + "Terakhir diubah <waktu> oleh <nama>"
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Sub menu | Target Program (`master-data-program-target`, ikon `Target`, order 7) |
| Route | `/admin/master-data/program-target` |
| File | `page.tsx` + `program-target-client.tsx` |
| Guard | `requirePermission("master-data-program-target")` |
| Server action | `getProgramTargets()` (VIEW menu ini **atau** `dashboard-training`) · `saveProgramTargets(cells)` (EDIT; sel baru CREATE; mengosongkan DELETE) — `src/server/actions/program-target.ts` |
| Validasi | `src/validations/program-target.schema.ts` (tahun 2015–2050, nilai bulat ≥ 0, satu tahun Start untuk semua baris, tanpa sel ganda) |
| Helper murni | `src/lib/program-target.ts` (label, pemetaan indikator → paket, grid, total, perbandingan vs Kontrak) |
| Model | `ProgramTarget` → `tbl_program_target` (UNIQUE `indicator, period_type, year`) |
| Izin seed | VIEW/CREATE/EDIT/DELETE untuk SUPERADMIN & ADMIN. MANAGEMENT & OPERATOR **mewarisi VIEW** dari induk `master-data` (kaskade union) → bisa melihat, tak bisa mengubah. DONOR tidak |
| Scope | Tanpa scope akses — angka seluruh program ([access-context.md](../../access-context.md) §Pengecualian) |

## Aturan

| Hal | Aturan |
|---|---|
| Indikator | `TRAINING_BMP_GROUP_MANAGEMENT` (BMP & Reg. Ag., P&C RSPO, HCV, HSE, Group Management ↔ Paket 1) · `TRAINING_GEDSI_LIVELIHOOD` (GEDSI, Financial Literacy, BusDev, Alt. Livelihood ↔ Paket 3 & 4) |
| Start of the Program | `BASELINE` — kumulatif s.d. akhir tahun yang dipilih; satu tahun untuk semua baris (mengganti tahun menonaktifkan baseline tahun lain) |
| Tahunan | `ANNUAL` — target penerima manfaat baru pada tahun itu |
| Total | Baris: Start + Σ tahunan · Kolom tahun: Σ kedua baris — dihitung, tidak disimpan |
| Simpan | Sel berisi → upsert (baris nonaktif diaktifkan lagi, `modifiedBy`); sel kosong → soft delete; kolom tahun yang dihapus → target lamanya dikosongkan |
| Repo publik | Angka kontrak tidak ditulis di repo/issue — hanya di DB lewat halaman ini |
