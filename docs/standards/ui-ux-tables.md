# Standar — UI/UX: Tabel

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Induk: [ui-ux.md](./ui-ux.md) · Terkait: [ui-ux-tables.md](./ui-ux-tables.md) · [ui-ux-map.md](./ui-ux-map.md) · [ui-ux-bulk-upload.md](./ui-ux-bulk-upload.md) · [ui-ux-help.md](./ui-ux-help.md)

## Tipografi Tabel

| Element | Styling |
|---------|---------|
| Header | `bg-muted/70 border-b-2` · `text-xs font-semibold uppercase tracking-wider text-muted-foreground` |
| Data utama | `text-sm font-medium` |
| Kode/ID | `text-sm font-mono text-muted-foreground` |
| Data sekunder | `text-sm text-muted-foreground` |
| Angka | `text-sm tabular-nums` |
| Kosong/null | `—` + `text-muted-foreground` |
| Status | `<Badge>` |

## Aksi Tabel

Untuk aksi dalam tabel (tombol Edit, Lihat, Hapus, Nonaktifkan, dll), ikuti aturan berikut untuk konsistensi:
- **Posisi Kolom**: Kolom **Aksi** wajib diletakkan di bagian paling kiri tabel (kolom pertama).
- **Lebar Kolom (Autofit)**: Kolom **Aksi** wajib memiliki lebar seminimal mungkin (autofit) agar tidak memakan ruang kolom lainnya. Gunakan kelas `w-[1%] whitespace-nowrap` pada `TableHead` dan `TableCell` pembungkus kolom Aksi.
- **Format Tombol**: Gunakan tombol berbasis icon tanpa teks dengan properti `<Button variant="ghost" size="icon">`.
- **Desain Icon & Tooltip**:
  - Setiap tombol wajib memiliki properti `title` untuk aksesibilitas dan penjelasan singkat aksi.
  - Aksi **Lihat**: Gunakan icon `<Eye className="h-4 w-4" />` dengan `title="Lihat"`.
  - Aksi **Edit**: Gunakan icon `<Pencil className="h-4 w-4" />` dengan `title="Edit"`.
  - Aksi **Nonaktifkan**: Gunakan icon `<Trash2 className="h-4 w-4" />` dengan `title="Nonaktifkan"`.
  - Aksi **Cetak/PDF per baris** (#343): Gunakan icon `<Printer className="h-4 w-4" />` dengan `title` yang menyebut dokumennya (mis. `"Profil Petani (PDF)"`); saat baris itu diproses ikon berganti `<Loader2 className="h-4 w-4 animate-spin" />` dan tombolnya nonaktif — **baris lain tetap aktif** (satu state id baris yang sedang diproses — `loadingId` di Daftar Petani, `pdfLoadingId` di Detail Petani).
- **Visibilitas Berbasis Izin (Role & Permission)**: Semua tombol aksi dan tombol penambahan data (Tambah/Create) harus dilindungi (show/hide) secara dinamis menggunakan daftar izin (`permissions`) yang diperoleh dari backend:
  - Tombol **Tambah / Create** di atas tabel di-render jika: `permissions.includes("CREATE")`.
  - Tombol **Lihat / View** di-render jika: `permissions.includes("VIEW")`.
  - Tombol **Edit** di-render jika: `permissions.includes("EDIT")`.
  - Tombol **Nonaktifkan / Aktifkan kembali (Delete/Restore)** di-render jika: `permissions.includes("DELETE")`.
  - Tombol **Cetak/PDF** di-render jika: `permissions.includes("PRINT")` — sama dengan tombol PDF di halaman detail (#245).
- **Abstraksi Komponen (`TableActions`)**: Gunakan komponen pembungkus `<TableActions>` dari `@/components/shared` untuk merender seluruh tombol aksi baris tabel secara otomatis berdasarkan daftar izin (`permissions`) dan array konfigurasi `actions` untuk menghindari pengulangan kode inline. Tipe aksi: `view` · `edit` · `delete` (+ `isActive`) · **`print`** (#343: `title`, `loading` — generik, dipakai Daftar Petani untuk Profil Petani; menu lain tinggal menambah entri, bukan tombol inline).
- **Loading Placeholder (`TableSkeleton`)**: Gunakan komponen `<TableSkeleton>` pada file `loading.tsx` dari menu tabel bersangkutan untuk menampilkan placeholder table-row loading saat data sedang dimuat secara asinkron, guna meminimalkan layout shift.
- **Combobox filter (STANDAR — #211/#212/#217)**: filter dropdown ber-pencarian memakai primitif `FilterCombobox` (`src/components/shared/filter-combobox.tsx`; Popover + Command). Dua semantik: `allLabel` = filter opsional dengan item teratas "Semua …", `placeholder` = pilihan wajib gaya "Pilih …" (+ `disabled` untuk dependensi antar-filter). Teks empty baku: "{Entitas} tidak ditemukan." Pasangan **Distrik → Lembaga Petani cascade** (pilih distrik menyaring lembaga; lembaga di luar distrik baru di-reset ke "Semua") memakai komposisi `DistrictGroupFilter` (`district-group-filter.tsx`). Jangan menulis ulang markup Popover+Command per halaman — itu sumber drift yang diperbaiki #212.
- **Tooltip data (STANDAR — #213)**: sel/bar yang membawa **angka** memakai tooltip terstruktur `StatTooltipContent` + `StatTooltipRow` (`src/components/shared/stat-tooltip.tsx`; judul + subtitle konteks + baris chip/label/angka/persen + footer bergaris) — bukan `title` native. `title` native tetap dipakai untuk hint aksi/label & helper truncate, serta grid ber-ratusan sel (mis. titik bulanan matriks BMP) demi performa render.

## Paginasi Tabel

Untuk tabel dengan pagination, ikuti aturan layout dan state berikut untuk konsistensi:
- **State Halaman**: Gunakan 0-based index untuk variabel state `page` (halaman pertama = `0`).
- **Reset Halaman**: Selalu reset `page` kembali ke `0` ketika input pencarian (`search`) atau dropdown filter berubah.
- **Batas Indeks Aman**: Hitung indeks halaman aman (`safePage = Math.min(page, totalPages - 1)`) untuk mencegah tampilan halaman kosong jika jumlah data berkurang secara dinamis.
- **Pilihan Ukuran Halaman**: Sediakan pilihan ukuran halaman (`[10, 25, 50, 100]`) menggunakan dropdown `<Select>` Shadcn UI.
- **Layout Kontrol**:
  - Bagian Kiri: Dropdown pemilihan ukuran halaman ("Tampilkan [dropdown] dari [total] data").
  - Bagian Kanan: Indikator halaman ("Halaman [aktif] dari [total_halaman]") beserta tombol navigasi sebelumnya/selanjutnya menggunakan `<Button variant="outline" size="icon" className="h-8 w-8">` dan icon `<ChevronLeft>` / `<ChevronRight>` berukuran `h-4 w-4`.

## Ekspor & Pilihan Kolom Tabel (DataTable)

Untuk tabel yang menggunakan komponen `<DataTable>`, konfigurasi berikut harus didukung:
- **Show/Hide Kolom**: Disediakan tombol dropdown "Kolom" untuk memilih visibilitas kolom.
- **Pintasan pilih kolom (target, sejak 2026-08-29; rollout ke `<DataTable>` masih terbuka di #308)**: setiap dropdown "Kolom" — baik lewat `<DataTable>` maupun selektor bespoke di halaman report — wajib menyediakan **Pilih semua · Kosongkan · Bawaan** di bawah label, plus penghitung `aktif/total` di label. Alasannya: begitu daftar kolomnya panjang (Laporan Lahan sudah 13 sejak #305), mengubah tampilan berarti belasan klik, dan pengguna kehilangan jalan pulang ke tampilan awal setelah bereksperimen — "Bawaan" itulah jalan pulangnya, jadi ia **bukan** pelengkap opsional dari dua tombol lain.
  - Kolom identitas yang selalu tampil (mis. No / Lembaga / Nama Petani) berada **di luar** daftar toggleable, sehingga "Kosongkan" tidak pernah menghasilkan tabel tanpa kolom.
  - Item ceklisnya memakai `onSelect={(e) => e.preventDefault()}` agar dropdown tidak menutup tiap satu kolom di-toggle.
  - Referensi implementasi: `land-parcel-report-client.tsx` (#305). Rollout ke selektor lain: issue #308.
- **Export Excel**:
  - Disediakan tombol "Excel" untuk mengunduh data tabel saat ini (hasil pencarian/filter aktif).
  - Diaktifkan dengan menyertakan prop `exportFilename` (misalnya `exportFilename="data-users"`) **dan** `canExport` (bawaan `false`; isi dari izin EXPORT menu).
  - Kustomisasi mapping baris dilakukan melalui prop `getExportRow(row, index)` untuk meratakan relasi atau data kompleks.
  - **Kunci `getExportRow` WAJIB sama dengan `column.key`** (wajib, sejak 2026-09-02 / #323). Nilai dipetik per kolom, bukan per baris. Kunci yang tidak dikembalikan jatuh ke nilai mentah baris dan **diperingatkan di console mode dev**, sekali per ekspor. Sebelum #323 kolom yang namanya tak cocok terbit **kosong tanpa satu pun tanda** — bukan error, bukan nilai salah, berkasnya terlihat sah dan bisa diedarkan. Pola ini menggigit tiga kali (dua di #160, lalu empat kolom paket Laporan Pelatihan) sebelum ditutup sebagai TD-015; **empat kolom di tiga halaman lain ternyata sudah lama kosong tanpa pernah dilaporkan siapa pun**.
  - **Kolom kontrol wajib `exportable: false`** — kolom "Aksi" yang meminjam `key: "id"` demi memenuhi `keyof T` bukan data; tanpa penanda ini ia terbawa ke Excel berisi CUID.
  - Kolom **turunan** (nilainya dihitung `render`, tanpa padanan mentah di baris) tetap perlu entri di `getExportRow` — fallback nilai mentah tidak bisa menghitungnya, dan fallback itu **hanya berlaku untuk nilai primitif**: kunci turunan yang meminjam field bernilai objek akan tetap kosong, tidak ditulis sebagai `[object Object]`.
  - Parameter `index` adalah posisi dalam data **terurut & tersaring**, bukan nomor baris stabil. Untuk kolom nomor urut yang sudah tersimpan di baris, pakai nilai baris itu — kalau tidak, Excel menomori ulang 1..N mengikuti urutan tampilan sementara layar dan PDF menampilkan nomor aslinya.
- **Posisi Tombol Tambah**: Tombol "Tambah / Create" di-render secara konsisten di paling kanan toolbar menggunakan prop `toolbarRight` dari `<DataTable>`.
