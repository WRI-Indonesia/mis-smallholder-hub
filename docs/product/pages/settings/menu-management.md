# Menu Management

[← Menu Settings](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Menu Management (/admin/settings/menu)
├── Header
│   ├── Heading: Menu Management
│   └── Deskripsi: Kelola navigasi menu sidebar
├── Toolbar / Filter
│   ├── Pencarian: Cari menu... (title / key, level 1–3)
│   └── Tambah Menu (CREATE)
├── Tabel tree menu (3 level: parent · — anak · —— cucu)
│   ├── Kolom: Aksi · Menu · Key · URL · Order · Status
│   └── Aksi baris: Edit (EDIT) · Nonaktifkan / Aktifkan kembali (DELETE)
├── Dialog
│   ├── Tambah Menu / Edit Menu
│   │   └── Key · Order · Title · URL · Parent · Icon · Aktif · Visible
│   │       · Batal / Buat / Simpan
│   └── Nonaktifkan Menu (DeleteDialog konfirmasi)
└── Toast
    ├── Menu item dinonaktifkan / Gagal menonaktifkan menu item
    └── Menu berhasil dibuat / Menu berhasil diupdate
```

## Sub Menu: Menu Management (`settings-menu`)

| Atribut | Nilai |
|---|---|
| URL | `/admin/settings/menu` |
| Icon | `Menu` |
| Order | 2 |

## Page: `/admin/settings/menu`

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/settings/menu/page.tsx` |
| Client | `src/app/(admin)/admin/settings/menu/menu-list-client.tsx` |
| Tipe | Server Component → Client Component (tabel tree + dialog) |
| Guard | `requirePermission("settings-menu")` |
| Server action / data | `getAllMenuItems()` (`src/server/actions/menu.ts`), `getUserPermissionsForMenu("settings-menu")` |
| Loading | `loading.tsx` |

**Objek halaman**

| Objek | Tipe | Keterangan |
|---|---|---|
| `Menu Management` | Heading | `h1`, deskripsi: `Kelola navigasi menu sidebar` |
| Pencarian | Filter | Placeholder `Cari menu...`; mencocokkan `title` atau `key` pada level 1–3 (parent tetap tampil bila anak/cucu cocok) |
| `Tambah Menu` | Tombol | Ikon `Plus`; tampil hanya jika permission `CREATE` |
| Tabel tree menu | Tree / Tabel | 3 level: parent (bold), anak (prefix `—`, `pl-8`), cucu (prefix `——`, `pl-14`); ikon dirender dari `ICON_MAP` |
| Kolom `Aksi` | Kolom | `Edit` (EDIT) dan `Nonaktifkan` / `Aktifkan kembali` (DELETE) via `TableActions` |
| Kolom `Menu` | Kolom | Ikon + judul menu, terindentasi sesuai level |
| Kolom `Key` | Kolom | `key` menu (font mono) |
| Kolom `URL` | Kolom | `url` menu |
| Kolom `Order` | Kolom | Angka urutan (rata tengah) |
| Kolom `Status` | Kolom | Badge `Aktif` / `Nonaktif` |
| `Nonaktifkan Menu` | Dialog | `DeleteDialog` konfirmasi: `Menu item akan dinonaktifkan (soft delete) dan tidak lagi muncul di navigasi. Lanjutkan?` → `deleteMenuItem()` |
| Toast | Notifikasi | `Menu item dinonaktifkan` / `Gagal menonaktifkan menu item` |

### Dialog: Tambah Menu / Edit Menu

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/settings/menu/menu-form-modal.tsx` |
| Server action | `createMenuItem()` / `updateMenuItem()` (`src/server/actions/menu.ts`) |

| Objek | Tipe | Keterangan |
|---|---|---|
| `Key` | Input | Wajib; `disabled` saat edit |
| `Order` | Input | `type="number"`, default `0` |
| `Title` | Input | Wajib |
| `URL` | Input | Wajib |
| `Parent` | Select | Opsi `— Tidak ada (root) —` plus daftar menu level 1 dan level 2 (level 2 diberi prefix `— `). Item yang sedang diedit beserta seluruh turunannya dikecualikan agar tidak terjadi siklus |
| `Icon` | Select | Opsi `— Tanpa icon —` plus `ICON_LIST` (`src/lib/icon-map.ts`); placeholder `Pilih icon` |
| `Aktif` | Switch | Default aktif |
| `Visible` | Switch | Default aktif |
| `Batal` / `Buat` / `Simpan` | Tombol | `Buat` saat create, `Simpan` saat edit |
| Toast | Notifikasi | `Menu berhasil dibuat` / `Menu berhasil diupdate` |
