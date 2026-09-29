# Menu Management

[← Menu Settings](README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Menu Management (/admin/settings/menu)
├── Header
│   ├── Heading: Menu Management
│   └── Deskripsi: Kelola navigasi menu sidebar
├── Toolbar / Filter
│   ├── Pencarian: Cari menu... (title / key, level 1–3)
│   └── Buka semua / Tutup semua (nonaktif saat mencari)
│       (tanpa Tambah Menu sejak #364 — menu baru hanya lewat menu.csv + seed)
├── Tabel tree menu (render rekursif 3 level, collapsible per induk)
│   ├── Chevron buka/tutup per induk (default collapsed, state localStorage)
│   ├── Kolom: Aksi · Menu · Key · URL · Order · Status
│   └── Aksi baris: Edit (EDIT; saklar Aktif butuh DELETE) · Nonaktifkan (DELETE, dialog konfirmasi → `deleteMenuItem`) / Aktifkan kembali (DELETE, langsung → `reactivateMenuItem`: Aktif + Visible, #237)
├── Dialog
│   ├── Edit Menu
│   │   └── Key · Title · URL · Parent · Order · Icon (baca-saja) + catatan menu.csv
│   │       · Aktif · Visible (saklar) · Batal / Simpan
│   └── Nonaktifkan Menu (DeleteDialog konfirmasi)
└── Toast
    ├── Menu item dinonaktifkan / Gagal menonaktifkan menu item
    ├── Menu diaktifkan kembali / Gagal mengaktifkan menu (#237)
    └── Menu berhasil diupdate / Gagal menyimpan menu
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
| Helper | `buildMenuTree` / `flattenTree` / `collapsibleKeys` (`src/lib/menu-tree.ts`), `useCollapseState` (`src/lib/use-collapse-state.ts`) |
| Loading | `loading.tsx` |

**Objek halaman**

| Objek | Tipe | Keterangan |
|---|---|---|
| `Panduan` | Tautan | `HelpHint` — ikon `?` di header menuju tutorial Bantuan untuk `settings-menu` (`findTutorialForMenu`), dibuka di tab baru |
| `Menu Management` | Heading | `h1`, deskripsi: `Kelola navigasi menu sidebar` |
| Pencarian | Filter | Placeholder `Cari menu...`; mencocokkan `title` atau `key` pada level 1–3 (parent tetap tampil bila anak/cucu cocok; subtree cocok di-expand paksa) |
| Empty state pencarian | Teks | `Tidak ada menu yang cocok dengan pencarian.` |
| `Buka semua` / `Tutup semua` | Tombol | Buka/tutup seluruh induk; state `localStorage` (`menu-list:open`), default *collapsed*; nonaktif saat mencari |
| Tabel tree menu | Tree / Tabel | Render **rekursif 3 level** (`flattenTree`), **collapsible per induk** (chevron, default collapsed); indentasi per kedalaman; ikon dari `ICON_MAP` |
| Kolom `Aksi` | Kolom | `Edit` (EDIT) dan `Nonaktifkan` / `Aktifkan kembali` (DELETE) via `TableActions`. Baris aktif → dialog Nonaktifkan; baris nonaktif → `reactivateMenuItem` langsung tanpa dialog (pola toggle Master Data; klik berulang diabaikan sampai selesai; #237 — dulu tombol ini membuka dialog Nonaktifkan dan memanggil `deleteMenuItem` lagi). Kedua aksi = satu helper `setMenuItemActive` (DELETE, id divalidasi Zod `menuIdSchema`, id basi → `Menu tidak ditemukan — muat ulang halaman`, `ActionResult`); aktif kembali menyalakan Aktif + Visible dan **ditolak bila induknya nonaktif** (`Induk menu "…" masih nonaktif — aktifkan induknya dulu`) |
| Kolom `Menu` | Kolom | Ikon + judul menu, terindentasi sesuai level |
| Kolom `Key` | Kolom | `key` menu (font mono) |
| Kolom `URL` | Kolom | `url` menu |
| Kolom `Order` | Kolom | Angka urutan (rata tengah) |
| Kolom `Status` | Kolom | Badge `Aktif` / `Nonaktif`, + badge `Tersembunyi` bila aktif tetapi `isVisible` mati (review #364) |
| `Nonaktifkan Menu` | Dialog | `DeleteDialog` konfirmasi: `Menu item akan dinonaktifkan (soft delete) dan tidak lagi muncul di navigasi. Lanjutkan?` → `deleteMenuItem()` |
| Toast | Notifikasi | `Menu item dinonaktifkan` / `Gagal menonaktifkan menu item` |

### Dialog: Edit Menu

> **#364 (keputusan owner 2026-09-29): Menu Management hanya mengubah Aktif & Visible.** Struktur menu — judul, urutan, induk, URL, ikon — dan menu baru hanya lewat `prisma/seeds/data/menu.csv` + seed: `seedMenu` menimpa kelima kolom itu di setiap seed rilis (perubahan dari UI dulu hilang diam-diam), dan akun demo dua kali mengubah label/urutan prod tanpa jejak di repo. Server menegakkannya: `updateMenuItemSchema` = `{ id, isActive, isVisible }` (kolom lain dibuang Zod), `updateMenuItem` hanya menulis `isActive`/`isVisible`/`modifiedBy` — **mengubah Aktif butuh `settings-menu:DELETE`** (setara `deleteMenuItem`), Visible cukup EDIT; id basi → `Menu tidak ditemukan — muat ulang halaman` — dan tidak ada aksi tambah menu. Invarian struktur (induk ada di CSV, bukan diri sendiri, ≤ 3 level) diperiksa `validateMenuSeedRows` saat membaca CSV dan di `seed-menu-key.mjs`. Izin `settings-menu:CREATE` tidak lagi dipakai.

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/settings/menu/menu-form-modal.tsx` |
| Server action | `updateMenuItem()` (`src/server/actions/menu.ts`) |

| Objek | Tipe | Keterangan |
|---|---|---|
| Rincian struktur | Daftar baca-saja | `Key` · `Title` · `URL` · `Parent` (judul induk, atau `— Tidak ada (root) —`) · `Order` · `Icon` (ikon + nama) |
| Catatan | Teks | `Judul, urutan, induk, URL, dan ikon hanya bisa diubah lewat menu.csv + seed, agar menu di produksi selalu sama dengan repo.` |
| `Aktif` | Switch | Nilai tersimpan; **nonaktif (disabled) bila user tanpa `settings-menu:DELETE`** — nilai tersimpan dikirim apa adanya. Menyalakan Aktif ditolak bila induk masih nonaktif (sama dengan Aktifkan kembali) |
| `Visible` | Switch | Nilai tersimpan |
| `Batal` / `Simpan` | Tombol | — |
| Toast | Notifikasi | `Menu berhasil diupdate` / `Gagal menyimpan menu` |
