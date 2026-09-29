# Standar — UI/UX

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Terkait: [principles.md](./principles.md) · [workflow.md](./workflow.md) · [code-standards.md](./code-standards.md) · [rbac.md](./rbac.md) · [architecture.md](./architecture.md)

## UI/UX

### Sub-standar

| Berkas | Isi |
|---|---|
| [ui-ux-tables.md](./ui-ux-tables.md) | Tipografi, aksi baris, paginasi, ekspor & pilihan kolom `DataTable` |
| [ui-ux-map.md](./ui-ux-map.md) | Peta MapLibre: basemap, popup standar, layer titik api/overlay, cetak peta |
| [ui-ux-bulk-upload.md](./ui-ux-bulk-upload.md) | Alur & validasi bulk upload Excel dan shapefile |
| [ui-ux-help.md](./ui-ux-help.md) | Pola konten Bantuan (HELP-02) |
| [../database/dashboard-snapshots.md](../database/dashboard-snapshots.md) | Kapan dashboard memakai snapshot vs live query |

### Prinsip

- Komponen **Shadcn UI** + utility **Tailwind 4**
- Warna pakai variabel `oklch` di `globals.css`
- Font: **Acumin Pro Condensed** (brand WRI, lihat `brand.wri.org/fonts`) — dimuat via `@font-face` self-host di `public/fonts/` (`globals.css`, `font-display: swap`), fallback **Arial → Helvetica Neue → Helvetica → sans-serif** sesuai rekomendasi WRI; `--font-sans` diarahkan ke stack ini dan Geist Sans dilepas (Geist Mono tetap untuk `--font-mono`) — #130. Sebelumnya hanya deklarasi `font-family` tanpa `@font-face` sehingga jatuh ke fallback generik. File `.woff2` berlisensi ditaruh manual (`acumin-pro-condensed-regular/bold.woff2`; panduan: `public/fonts/README.md`).
- Mobile-first responsive

### Tata Letak Admin

- Header halaman (judul & deskripsi) wajib
- Pembungkus data pakai `<Card>`
- Form kompleks → pisah seksi, hindari scroll bertumpuk

### Pola UI Settings — Matriks & Tabel Bertingkat (#187B)

Standar reusable untuk halaman Settings bermatriks/bertingkat (contoh kanonis: `role-matrix-client.tsx`, juga dipakai `menu-list-client.tsx`):

- **Sticky header + sticky kolom pertama** di dalam scroll box (`overflow-auto max-h-[70vh]`): tabel `border-separate border-spacing-0`, header `sticky top-0`, kolom pertama `sticky left-0` — latar sel sticky **wajib opaque** (`bg-muted` / bg baris) agar sel di belakangnya tidak tembus saat scroll.
- **Pohon collapsible** dengan state per-halaman di `localStorage` via `useCollapseState` (`src/lib/use-collapse-state.ts`) — default collapsed, dibaca pasca-mount untuk mencegah hydration mismatch; tree helper dari `src/lib/menu-tree.ts`.
- **Chip selektor role** (toggle kolom per role) + tombol **"Semua"** untuk menampilkan kembali seluruh kolom.
- **Aksi kaskade** (induk → anak) selalu lewat **dialog konfirmasi** dengan pilihan eksplisit ("hanya induk" vs "termasuk sub-menu").
- **Update optimistis + rollback**: terapkan perubahan ke state lokal dulu, panggil server action, dan kembalikan state sebelumnya (`setGranted(prev)`) bila gagal + toast error.

### State & Umpan Balik

- Loading state wajib (skeleton/spinner)
- Toast setelah action berhasil/gagal

### Lebar Modal — selalu `sm:max-w-*`, dan timpa `w-full` bila > 640px (#292)

Kelas dasar `DialogContent` (`src/components/ui/dialog.tsx`) adalah **`w-full max-w-[calc(100%-2rem)] sm:max-w-sm`**. `cn()` di repo ini `twMerge(clsx())`, yang mengelompokkan utility per **(varian, jenis)** — jadi `max-w-*` dan `sm:max-w-*` adalah dua grup berbeda.

**❌ Tanpa prefiks — `className="max-w-3xl"`.** Yang terhapus justru penjaganya (`max-w-[calc(100%-2rem)]`, segrup), sementara **`sm:max-w-sm` tetap hidup**. Karena aturan `sm:` di-emit di blok `@media` belakangan dengan spesifisitas sama, `sm:max-w-sm` menang di ≥640px dan modal terjepit **384px** — jauh lebih sempit dari yang diminta. Inilah cacat asli #292: bukan modal melebar, tapi modal menyempit diam-diam.

**✅ Berprefiks — `className="sm:max-w-5xl"`.** Menggantikan `sm:max-w-sm` dengan benar. Tapi perhatikan: penjaga `max-w-[calc(100%-2rem)]` yang selamat itu **hanya efektif di bawah 640px**, karena aturan `sm:` di-emit belakangan dan menang di atas breakpoint.

**Karena itu, bila nilainya melebihi breakpoint `sm` (640px), timpa juga `w-full`:**

```tsx
<DialogContent className="w-[calc(100%-2rem)] sm:max-w-5xl">
```

Tanpa itu modal menempel rapat ke tepi layar pada lebar 640–1056px (tablet, atau browser separuh layar). Untuk nilai ≤ 640px (`sm:max-w-md`, `sm:max-w-[520px]`, dst.) `w-full` bawaan sudah aman.

Prinsip umumnya: **cek kelas dasar komponen `ui/` sebelum menimpanya**, dan ingat bahwa varian membuat grup terpisah — kelas dasar yang "selamat" dari twMerge belum tentu menang di cascade.

### Sensor Data Pribadi Petani (keputusan owner 2026-07-16)

Data pribadi petani **wajib disensor di semua tampilan layar** via helper `src/lib/mask.ts`:

- **NIK** → `maskNik()`: hanya 4 digit depan + 2 belakang yang tampil, sisanya `*` (mis. `1471**********56`). Untuk kolom Detail generik yang bisa berisi NIK atau nilai lain, gunakan `maskIfNik()` (hanya string 10–16 digit yang di-mask).
- **Tanggal lahir** → `maskBirthDate()`: tanggal & bulan disensor, tahun tampil (`** *** 1980`). Umur boleh ditampilkan.
- **Excel/PDF export sengaja TIDAK disensor** — hasil export bisa diedit lalu di-upload ulang via bulk; nilai ter-sensor akan merusak data. PDF Farm Passport (dokumen resmi milik petani) juga tetap penuh — demikian pula **PDF Profil Petani** (#343, `src/lib/farmer-profile-pdf.ts`): NIK & tanggal lahir penuh di bagian Identitas.
- Halaman baru yang menampilkan NIK/tanggal lahir wajib memakai helper ini — jangan render nilai mentah.

### Filter Lembaga Petani Ber-pencarian

- **Wajib menggunakan Combobox**: Untuk mempermudah pencarian dan penyaringan data di semua halaman list master data (terutama data Petani) atau alur lainnya, semua komponen filter/dropdown **Lembaga Petani** wajib menggunakan komponen **searchable Combobox** (kombinasi Popover & Command Shadcn UI) dengan kemampuan pencarian teks, dan tidak diperbolehkan menggunakan dropdown Select box standar.
