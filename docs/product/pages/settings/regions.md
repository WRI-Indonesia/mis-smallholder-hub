# Regions

[← Menu Settings](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Region Management (/admin/settings/regions)
├── Header
│   ├── Heading: Region Management
│   └── Deskripsi: Kelola hierarki wilayah administratif
├── Toolbar / Filter
│   ├── Pencarian: Cari nama atau kode...
│   ├── Filter status: Semua Status / Aktif / Nonaktif
│   └── Tambah Provinsi (CREATE)
├── Tree wilayah (4 level, indentasi 0 / 24 / 48 / 72 px)
│   ├── Kolom: Aksi · Wilayah · Kode · Status
│   ├── Level
│   │   ├── Provinsi (Map, biru)
│   │   ├── Distrik (Building2, hijau)
│   │   ├── Kecamatan (MapPin, oranye)
│   │   └── Desa / Kelurahan (Home, ungu)
│   ├── Aksi baris: Tambah {level anak} · Edit · Nonaktifkan / Aktifkan kembali
│   ├── Expand: ChevronRight ↔ ChevronDown (auto-expand saat search/filter)
│   └── Empty state: Tidak ada data wilayah yang ditemukan
├── Legend: Provinsi · Distrik · Kecamatan · Desa / Kelurahan
├── Dialog
│   └── Tambah / Edit {level}
│       └── Induk · Kode · Nama · Batal / Simpan
└── Toast
    ├── Status berhasil diubah / Gagal mengubah status
    └── {level} berhasil ditambahkan / {level} berhasil diupdate
```

## Sub Menu: Regions (`settings-regions`)

| Atribut | Nilai |
|---|---|
| URL | `/admin/settings/regions` |
| Icon | `MapPin` |
| Order | 4 |

## Page: `/admin/settings/regions`

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/settings/regions/page.tsx` |
| Client | `src/app/(admin)/admin/settings/regions/region-list-client.tsx` |
| Tipe | Server Component → Client Component (tree 4 level + dialog) |
| Guard | `requirePermission("settings-regions")` |
| Server action / data | `getRegionTree()` (`src/server/actions/region.ts`), `getUserPermissionsForMenu("settings-regions")` |
| Loading | `loading.tsx` |

**Hierarki wilayah**

| Level | Label UI | Ikon | Anak |
|---|---|---|---|
| 1 | `Provinsi` | `Map` (biru) | Distrik |
| 2 | `Distrik` | `Building2` (hijau) | Kecamatan |
| 3 | `Kecamatan` | `MapPin` (oranye) | Desa / Kelurahan |
| 4 | `Desa / Kelurahan` | `Home` (ungu) | — |

**Objek halaman**

| Objek | Tipe | Keterangan |
|---|---|---|
| `Region Management` | Heading | `h1`, deskripsi: `Kelola hierarki wilayah administratif` |
| Pencarian | Filter | Placeholder `Cari nama atau kode...`; mencocokkan `code` dan `name` di semua level |
| Filter status | Select | `Semua Status` / `Aktif` / `Nonaktif` |
| `Tambah Provinsi` | Tombol | Ikon `Plus`; tampil jika permission `CREATE`; membuka form level `province` |
| Tree wilayah | Tree / Tabel | Kolom `Aksi`, `Wilayah`, `Kode`, `Status`. Baris terindentasi bertingkat (0 / 24 / 48 / 72 px) dengan tombol expand `ChevronRight` ↔ `ChevronDown` |
| Auto-expand | Perilaku | Saat search atau filter status aktif, node induk dari hasil yang cocok otomatis terbuka |
| Baris nonaktif | Status | Ditampilkan `opacity-50`; status non-aktif induk ikut meredupkan turunannya |
| Aksi `Tambah …` | Tombol | Ikon `Plus`, title `Tambah Distrik` / `Tambah Kecamatan` / `Tambah Desa` sesuai level anak; tampil jika permission `CREATE`; tidak ada pada level desa |
| Aksi `Edit` | Tombol | Ikon `Pencil`; tampil jika permission `EDIT` |
| Aksi nonaktif/aktif | Tombol | Ikon `Trash2` (title `Nonaktifkan`) atau `RotateCcw` (title `Aktifkan kembali`); tampil jika permission `DELETE`; memanggil `toggleProvinceActive` / `toggleDistrictActive` / `toggleSubdistrictActive` / `toggleVillageActive` |
| Kolom `Kode` | Kolom | Kode wilayah (font mono) |
| Kolom `Status` | Kolom | Badge `Aktif` / `Nonaktif` |
| Empty state | Teks | `Tidak ada data wilayah yang ditemukan` |
| Legend | Legend | `Provinsi`, `Distrik`, `Kecamatan`, `Desa / Kelurahan` beserta ikonnya |
| Toast | Notifikasi | `Status berhasil diubah` / `Gagal mengubah status` |

### Dialog: Tambah / Edit {level}

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/settings/regions/region-form-modal.tsx` |
| Server action | `createProvince`/`updateProvince`, `createDistrict`/`updateDistrict`, `createSubdistrict`/`updateSubdistrict`, `createVillage`/`updateVillage` (`src/server/actions/region.ts`) |
| Judul | `Tambah {level}` / `Edit {level}` — level: `Provinsi`, `Distrik`, `Kecamatan`, `Desa / Kelurahan` |

| Objek | Tipe | Keterangan |
|---|---|---|
| `Induk` | Teks | Nama wilayah induk (hanya tampil untuk level di bawah provinsi) |
| `Kode` | Input | Placeholder `mis. 3201` |
| `Nama` | Input | Placeholder `Nama {level}` |
| `Batal` / `Simpan` | Tombol | Saat submit tombol menjadi `Menyimpan...` |
| Toast | Notifikasi | `{level} berhasil ditambahkan` / `{level} berhasil diupdate` |
