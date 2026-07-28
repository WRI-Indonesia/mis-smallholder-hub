# Analisa Ketersediaan Data

[← Menu Data Analyst](./README.md) · [← Katalog halaman](../README.md)

> Roll-up lintas Lembaga dari scoring halaman ini tersedia di [Dashboard Ketersediaan Data](./dashboard-ketersediaan-data.md) (DA-03, #193, satu menu ini juga) — skornya identik karena memakai `computeCompleteness` yang sama.

## Diagram objek

```text
Halaman: Analisa Ketersediaan Data (/admin/data-analyst/data-completeness)
├── Header
│   └── Judul + deskripsi
├── Filter
│   ├── Distrik (combobox + search)
│   ├── Lembaga Petani * (combobox + search, wajib)
│   └── Tombol Analisa
├── Empty state awal
├── Header hasil
│   ├── Kartu ringkasan Lembaga (nama + kode, District · petani · anomali)
│   ├── Index Ketersediaan Data (kartu KPI skor)
│   ├── Chip domain (Profil, Petani, Lahan, Pelatihan, Produksi)
│   └── Peringatan 0 petani
├── Seksi collapsible
│   ├── Profil Lembaga Petani (daftar cek)
│   ├── Petani (kartu + anomali → Tabel rincian anomali)
│   ├── Lahan (kartu + anomali → Tabel rincian anomali)
│   ├── Pelatihan
│   │   ├── Ringkasan per Paket
│   │   ├── Matriks Cakupan
│   │   └── Petani Belum Lengkap
│   └── Produksi (kartu + anomali → Tabel rincian anomali)
├── Tabel rincian anomali (dipakai semua domain)
│   ├── Kolom: ID Petani, Nama Petani, Detail
│   └── Batas render 50 baris + Tampilkan semua / Ringkas
└── Ekspor
    └── Excel multi-sheet (tanpa CSV/PDF)
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| Sub menu | Analisa Ketersediaan Data (`data-analyst-data-completeness`) |
| Route | `/admin/data-analyst/data-completeness` |
| File | `src/app/(admin)/admin/data-analyst/data-completeness/page.tsx` (Server Component) + `data-completeness-client.tsx` (Client Component) + `loading.tsx` |
| Tipe | Halaman analisis 1 Lembaga Petani (filter → Analisa → seksi collapsible per domain) |
| Guard | `requirePermission("data-analyst-data-completeness")` |
| Server action / data | `getDistrictsForCompleteness()`, `getFarmerGroupsForCompleteness(districtId)`, `analyzeFarmerGroupCompleteness(farmerGroupId)` — `src/server/actions/data-completeness.ts` (`MENU_KEY = "data-analyst-data-completeness"`, guard `hasPermission(MENU_KEY, "VIEW")` + `getAccessContext()`); logika skor/anomali di `src/lib/data-completeness.ts` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| "Analisa Ketersediaan Data" | Heading | `h1`; deskripsi: "Periksa kelengkapan dan anomali data satu Lembaga Petani (Petani, Lahan, Pelatihan, Produksi)" |
| "Distrik" | Filter (combobox + search) | Placeholder "Cari distrik..."; opsi "Semua Distrik"; empty "Distrik tidak ditemukan." |
| "Lembaga Petani" | Filter (combobox + search, **wajib**) | Placeholder tombol "Pilih Lembaga Petani"; placeholder cari "Cari lembaga petani..."; empty "Lembaga Petani tidak ditemukan."; tanpa opsi "semua" |
| "Analisa" | Tombol | Disabled sampai Lembaga Petani dipilih; label "Menganalisa..." saat pending |
| Empty state awal | Kartu | Ikon `ClipboardCheck` + "Pilih District dan Lembaga Petani, lalu klik Analisa" |
| Header hasil | Kartu ringkasan | Nama Lembaga + kode (mono), baris "`<District>` · `<n>` petani · `<n>` anomali" |
| "Index Ketersediaan Data" | Kartu KPI | Skor persen; warna: ≥85 hijau, ≥60 amber, <60 merah |
| "Excel" | Tombol ekspor | Ikon `Download`; multi-sheet, nama file `analisa-ketersediaan-<kode atau nama>-<yyyyMMdd>` |
| Chip domain | Badge skor | "Profil Lembaga Petani" + 4 domain (Petani, Lahan, Pelatihan, Produksi) masing-masing dengan badge skor % |
| Peringatan 0 petani | Kartu peringatan | "Lembaga Petani ini belum memiliki data petani aktif — domain Petani, Lahan, Pelatihan, dan Produksi kosong." |

## Aturan skor (per 2026-07-28, #193)

- **Bobot antar domain** (`DOMAIN_WEIGHTS`, `src/lib/data-completeness.ts`): profil 10%, petani 25%, lahan 25%, pelatihan 20%, produksi 20% → Index Ketersediaan Data.
- **Skor domain Petani & Lahan = GRADED per field** (keputusan owner #193, mengganti formula lama all-or-nothing yang membuat skor kolaps ke 0% padahal sebagian field terisi):
  - Petani: tiap petani dinilai dari proporsi 5 check yang lolos — NIK (terisi, 16 digit, tidak duplikat), ID Petani tidak duplikat, alamat, tanggal lahir, tahun bergabung — lalu dirata-rata lintas petani.
  - Lahan: tiap persil dinilai dari proporsi 5 atribut terisi — geometry, luas (>0), tahun tanam, jenis tanaman, status lahan — lalu dirata-rata lintas persil.
  - Daftar anomali **tidak berubah**; kartu "Petani Lengkap"/"Persil dengan Anomali" tetap memakai definisi tanpa-anomali-sama-sekali.
- Profil (proporsi 4 check), Pelatihan (rata-rata % cakupan paket per petani), dan Produksi (% petani ber-produksi) sudah graded sejak awal — tidak berubah.
- Skor di [Dashboard Ketersediaan Data](./dashboard-ketersediaan-data.md) otomatis mengikuti formula yang sama (satu sumber: `computeCompleteness`).

## Seksi collapsible

(masing-masing menampilkan badge "`<n>` anomali" / "Lengkap" + badge skor; terbuka otomatis bila ada anomali)

| Seksi | Isi |
|---|---|
| Profil Lembaga Petani | Daftar cek: "Kode Lembaga Petani", "Koordinat Lokasi", "Tahun Bergabung", "Singkatan (Abrv)" — tiap baris badge "Lengkap"/"Belum" |
| Petani | Kartu: "Total Petani", "Petani Lengkap", "Petani dengan Anomali", "% Kelengkapan Field". Anomali: "Petani tanpa NIK", "NIK tidak valid (bukan 16 digit)", "NIK duplikat dalam Lembaga Petani", "ID Petani duplikat dalam Lembaga Petani", "Petani tanpa alamat", "Petani tanpa tanggal lahir", "Petani tanpa tahun bergabung" |
| Lahan | Kartu: "Total Persil Aktif", "Petani Tanpa Lahan", "Persil dengan Anomali", "Total Luas (ha)". Anomali: "Petani tanpa lahan aktif", "Persil tanpa geometry", "Persil tanpa luas", "Persil tanpa tahun tanam", "Persil tanpa jenis tanaman", "Persil tanpa status lahan" |
| Pelatihan | Kartu: "Total Petani", "Petani Lengkap", "Belum Lengkap", "% Cakupan Paket". Tampilan khusus cakupan paket (lihat bawah). Anomali: "Belum ikut `<paket>`" per paket, "Peserta tanpa nilai pre-test", "Peserta tanpa nilai post-test", dan "Lembaga Petani belum memiliki aktivitas pelatihan" bila berlaku |
| Produksi | Kartu: "Total Petani", "Petani dengan Produksi", "Petani Tanpa Produksi", "Berlahan Tanpa Produksi". Anomali: "Petani tanpa data produksi", "Petani punya lahan tapi tanpa produksi", "Produksi tidak terhubung ke persil" |

## Tabel rincian anomali

(dipakai di semua domain)

| Kolom | Keterangan |
|---|---|
| ID Petani | mono |
| Nama Petani | |
| Detail | nilai yang menyerupai NIK disensor di layar (`maskIfNik`); Excel tetap penuh |

Paginasi: render dibatasi 50 baris awal, dengan tombol "Tampilkan semua (`<n>`)" / "Ringkas" dan teks "Menampilkan `<n>` dari `<n>` baris".

## Sub-seksi domain Pelatihan

| Sub-seksi | Objek |
|---|---|
| "Ringkasan per Paket" | Kartu per paket: label paket, "`<covered>`/`<total>` sudah ikut · `<n>` belum", badge % cakupan; expand → tabel "Petani belum ikut paket ini" |
| "Matriks Cakupan" | Tabel matriks: kolom "Petani" (sticky) + satu kolom per paket, sel centang/silang; badge "`<n>` petani"; batas render 50 baris + "Tampilkan semua" |
| "Petani Belum Lengkap" | Tabel kolom: ID Petani, Nama Petani, Cakupan (`done/total (pct%)`), Paket yang Masih Kurang; batas render 50 baris; bila kosong: "Semua petani sudah mengikuti seluruh paket wajib." |

Banner tambahan: "Belum ada aktivitas pelatihan di KT ini untuk paket: `<daftar paket>`." dan "Belum ada paket pelatihan wajib terdaftar." bila tidak ada paket wajib.

## Opsi ekspor

Excel multi-sheet (`exportMultiSheetToExcel`), tidak ada CSV/PDF:

| Sheet | Kolom |
|---|---|
| Ringkasan | Metrik, Nilai (Lembaga Petani, District, Index Ketersediaan Data, Total Petani, Total Anomali, Skor Profil Lembaga Petani, Skor per domain) |
| Petani / Lahan / Pelatihan / Produksi (satu sheet per domain) | Anomali, ID Petani, Nama Petani, Detail |
| Matriks Pelatihan | ID Petani, Nama Petani, satu kolom per paket (isi "Ya"/"Belum") |
| Petani Belum Lengkap | ID Petani, Nama Petani, Cakupan, Paket yang Masih Kurang |
