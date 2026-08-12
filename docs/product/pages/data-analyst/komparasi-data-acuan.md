# Komparasi Data Acuan

[← Menu Data Analyst](./README.md) · [← Katalog halaman](../README.md)

Sub menu `data-analyst-benchmark-comparison`, satu halaman: `/admin/data-analyst/benchmark-comparison` (#243).

Menggantikan komparasi manual di Excel (sheet "Comparasi MIS vs MD1stSOW GDriv" di rekap GDrive): angka **acuan** (MD 1st SOW) dientry ke tabel `ReferenceBenchmark`, angka **MIS** dihitung live saat halaman dibuka, **selisih = acuan − MIS** per 8 metrik. Sel selisih ≠ 0 diblok oranye — itulah daftar kejar data.

## Diagram objek

```text
Halaman: Komparasi Data Acuan (/admin/data-analyst/benchmark-comparison)
├── Header (judul + HelpHint + deskripsi)
├── Kartu ringkas (jumlah Lembaga dalam scope · jumlah masih selisih) + tombol Ekspor Excel
├── Toolbar (filter tersimpan di URL via useUrlFilters, TD-021)
│   ├── Tabs mode: Ringkas (default) | Detail
│   ├── Select distrik · Select urutan (kode | paling bermasalah)
│   ├── Switch "Hanya yang masih selisih" · Input cari lembaga
│   └── Legenda warna (mode Ringkas)
├── Tabel per distrik (satu Card collapsible per distrik — header: nama distrik +
│   │   ringkasan "N lembaga · N masih selisih · N tanpa acuan" + badge jumlah selisih;
│   │   empty state bila filter tidak cocok)
│   ├── Baris per Lembaga: nama + kode + badge ("cocok" / "acuan belum diisi")
│   │   + catatan sebagai pill kuning (baris pertama; isi lengkap via tooltip)
│   ├── Mode Ringkas: matriks Δ — satu sel per metrik (✓ hijau cocok · kuning ≤20% ·
│   │   merah >20% · abu "—" tanpa acuan), isi sel = selisih + % capaian;
│   │   tooltip terstruktur (StatTooltipContent, pola #213): Acuan/MIS/Selisih + bar capaian
│   ├── Mode Detail: 8 blok metrik × kolom (Acuan | MIS | Δ)
│   │   └── Metrik: Petani, Persil, Luas (ha), Training P1/P2-MK/P2-K3/P3&4, Produksi (petani)
│   ├── Tombol edit per baris (hanya bila punya EDIT)
│   └── Baris TOTAL distrik (acuan hanya menjumlah yang terisi; tooltip sama)
└── Modal entry acuan (BenchmarkFormModal)
    ├── 8 input angka terkontrol — tiap field menampilkan MIS live + preview Δ saat mengetik
    │   (kosong = tidak dibandingkan, bukan nol)
    ├── Textarea catatan
    └── onSaved → update optimistis: `applySavedBenchmark` me-rebuild view di client dengan
        perhitungan yang sama persis, `router.refresh()` menyelaraskan dengan server

```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/data-analyst/benchmark-comparison/page.tsx` |
| Tipe | Server Component → `BenchmarkComparisonClient` (Client Component) |
| Komponen anak | `benchmark-comparison-client.tsx`, `benchmark-form-modal.tsx`, `loading.tsx` |
| Guard | `requirePermission("data-analyst-benchmark-comparison")` (halaman); `hasPermission(..., "VIEW"/"EDIT")` + `getAccessContext()` di action |
| Server action | `getBenchmarkComparisonView()` (VIEW, live query) dan `upsertReferenceBenchmark()` (EDIT, upsert per `farmerGroupId` + `revalidatePath`) dari `src/server/actions/benchmark-comparison.ts` |
| Logika murni | `aggregateMisMetrics` + `buildComparisonView` + `applySavedBenchmark` (update optimistis) di `src/lib/benchmark-comparison.ts` (teruji di `src/test/benchmark-comparison.test.ts`) |
| Model | `ReferenceBenchmark` (`prisma/schema/reference-benchmark.prisma`, tabel `tbl_reference_benchmark`) — 1 baris per Lembaga (`farmerGroupId` unique), 8 metrik nullable + `notes`; "hapus" = soft delete, entry ulang mengaktifkan kembali baris yang sama |
| Konvensi angka MIS | Identik dashboard: petani/persil/luas aktif; training **distinct petani per paket** dengan `farmer.farmerGroupId` = `activity.farmerGroupId` (pola `dashboard-training.ts`); produksi = distinct petani ber-record aktif |
| Validasi | `referenceBenchmarkSchema` di `src/validations/reference-benchmark.schema.ts` (angka ≥ 0, bulat kecuali luas, notes ≤ 2000) |
| Icon menu | `GitCompare` (order 4 di menu Data Analyst) |
| Permission (seed) | VIEW: SUPERADMIN, ADMIN, OPERATOR, MANAGEMENT (tanpa DONOR, mengikuti sub menu Data Analyst lain); EDIT (entry acuan): SUPERADMIN, ADMIN |
| Data awal | Import sekali dari sheet GDrive via `scripts/local/other/import-reference-benchmark.mjs` (dry-run default, `--apply`); note per metrik digabung ke `notes` berprefix nama metrik |

## Aturan selisih

- Selisih dihitung hanya untuk metrik yang acuannya terisi; kosong = "—" (tidak dibandingkan, bukan nol).
- Toleransi pembulatan luas 0,005 ha — di bawah itu dianggap 0 (cocok).
- Baris TOTAL menjumlahkan kolom acuan hanya dari lembaga yang terisi, jadi total acuan bisa lebih kecil dari total MIS bila banyak lembaga belum dientry.
- Band warna mode Ringkas dari gap relatif |Δ|/acuan: cocok (0) · kuning ≤5% · kuning tua ≤20% · merah >20%; % capaian = MIS/acuan (bisa >100% bila MIS melebihi acuan).
- Urutan "paling bermasalah": jumlah metrik selisih terbanyak dulu, seri dipecah gap relatif terbesar.
- Ekspor Excel **mengikuti filter & urutan yang sedang tampil** (WYSIWYG, #247 — semula semua lembaga tanpa filter) — tombol digate izin `EXPORT` (#245).
