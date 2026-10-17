# Peta Fitur — Settings

> Bagian dari dokumentasi **Produk** · Peta fitur untuk Miro. Indeks: [README.md](README.md) · Legenda: [legend.md](legend.md) · Sumber: [../pages/settings/README.md](../pages/settings/README.md)

> **Ringkasan:** Menu administrasi platform (khusus SUPERADMIN): siapa yang boleh masuk (**User Management**), menu apa yang tampil di sidebar (**Menu Management**), aksi apa yang boleh dilakukan tiap role (**Role & Permission**), dan hierarki wilayah yang dipakai seluruh data (**Regions**). Empat sub menu, empat halaman — semuanya satu halaman tabel/matriks dengan dialog, tanpa halaman detail.

## Pohon navigasi

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  st(["Settings"]):::menu
  st_sub_users[["User Management"]]:::sub
  st_sub_menu[["Menu Management"]]:::sub
  st_sub_roles[["Role & Permission"]]:::sub
  st_sub_regions[["Regions"]]:::sub
  st_users["User Management"]:::page
  st_menu["Menu Management"]:::page
  st_roles["Role & Permission"]:::page
  st_regions["Region Management"]:::page

  st --> st_sub_users --> st_users
  st --> st_sub_menu --> st_menu
  st --> st_sub_roles --> st_roles
  st --> st_sub_regions --> st_regions

  classDef menu fill:#166534,stroke:#14532d,color:#ffffff,font-weight:bold
  classDef sub fill:#dcfce7,stroke:#166534,color:#14532d
  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
```

| Halaman | Route | Katalog |
|---|---|---|
| User Management | `/admin/settings/users` | [users.md](../pages/settings/users.md) |
| Menu Management | `/admin/settings/menu` | [menu.md](../pages/settings/menu.md) |
| Role & Permission | `/admin/settings/roles` | [roles.md](../pages/settings/roles.md) |
| Region Management | `/admin/settings/regions` | [regions.md](../pages/settings/regions.md) |

Halaman induk `/admin/settings` tidak punya isi; ia mengalihkan ke sub menu pertama yang boleh diakses.

## User Management

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  st_users["User Management"]:::page

  st_users_hdr("Header"):::section
  st_users_hdr_c["Judul: User Management<br/>Teks: Kelola akun pengguna sistem<br/>Tombol: Panduan (?) → Bantuan"]:::content

  st_users_tb("Toolbar / Filter"):::section
  st_users_tb_c["Filter: Semua / Aktif / Nonaktif · Cari nama atau email…<br/>Tombol: Excel · Kolom (Tampilkan Kolom) · Tambah User<br/>Ekspor: Excel (data-users)"]:::content

  st_users_tbl("Tabel: Daftar user"):::section
  st_users_tbl_c["Kolom: Nama · Email · Role · Akses Data · Akses Menu · Status · Aksi<br/>Aksi: Edit · Nonaktifkan / Aktifkan kembali · Akses Data · Hak Akses Menu<br/>Teks: badge Role berwarna · badge Akses Data (provinsi/distrik/Lembaga) · badge n Override<br/>Pesan: Status user diubah · Gagal mengubah status"]:::content

  st_users_form{{"Dialog: Tambah User / Edit User"}}:::dialog
  st_users_form_c["Field: Nama · Email · Role (SUPERADMIN · ADMIN · OPERATOR · MANAGEMENT · DONOR)<br/>Field: Password (wajib saat buat · kosongkan jika tidak diubah = reset password saat edit)<br/>Tombol: Batal · Buat / Simpan<br/>Pesan: User berhasil dibuat · User berhasil diupdate"]:::content

  st_users_access{{"Dialog: Akses Data — {nama user}"}}:::dialog
  st_users_access_c["Teks: Ringkasan Akses (Belum dibatasi = akses semua data)<br/>Filter: Cari provinsi, distrik, atau lembaga petani…<br/>Tab: Provinsi · Distrik · Lembaga Petani (badge jumlah terpilih)<br/>Field: checkbox per wilayah/Lembaga, auto-save saat dicentang<br/>Tombol: Tutup<br/>Pesan: Tidak ada data · Gagal memuat data akses · Gagal menyimpan"]:::content

  st_users_menu{{"Dialog: Hak Akses Menu — {nama user}"}}:::dialog
  st_users_menu_c["Teks: Status Override (Tidak ada override / n override aktif) · Role: {role}<br/>Filter: Cari menu…<br/>Kolom: Menu · C · V · E · D · X · P · Status<br/>Aksi: klik sel = cabut / beri izin (override) · klik lagi = hapus override<br/>Teks: legenda Role default (diberikan/ditolak) · Override diberikan (hijau) · Override dicabut (merah)<br/>Tombol: Tutup<br/>Pesan: Tidak ada menu ditemukan · Gagal mengubah akses"]:::content

  st_users --> st_users_hdr --> st_users_hdr_c
  st_users --> st_users_tb --> st_users_tb_c
  st_users --> st_users_tbl --> st_users_tbl_c
  st_users_tb -.->|Tambah User| st_users_form --> st_users_form_c
  st_users_tbl -.->|Edit| st_users_form
  st_users_tbl -.->|Akses Data| st_users_access --> st_users_access_c
  st_users_tbl -.->|Hak Akses Menu| st_users_menu --> st_users_menu_c

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef dialog fill:#fce7f3,stroke:#be185d,color:#831843
```

Dialog **Akses Data** menyimpan penugasan Provinsi / Distrik / Lembaga Petani yang menjadi cakupan data user di **semua** menu (lihat [Alur lintas menu](#alur-lintas-menu)). Dialog **Hak Akses Menu** hanya tampil untuk akun non-SUPERADMIN dan bukan akun sendiri; menu level 3 (Fire Alert) tidak muncul di matriks override.

## Menu Management

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  st_menu["Menu Management"]:::page

  st_menu_hdr("Header"):::section
  st_menu_hdr_c["Judul: Menu Management<br/>Teks: Kelola navigasi menu sidebar<br/>Tombol: Panduan (?) → Bantuan"]:::content

  st_menu_tb("Toolbar / Filter"):::section
  st_menu_tb_c["Filter: Cari menu… (judul / key, level 1–3)<br/>Tombol: Buka semua · Tutup semua (nonaktif saat mencari)<br/>Teks: tanpa tombol Tambah Menu — menu baru hanya lewat menu.csv + seed"]:::content

  st_menu_tree("Tabel: Pohon menu (3 level, collapsible)"):::section
  st_menu_tree_c["Kolom: Aksi · Menu · Key · URL · Order · Status<br/>Aksi: chevron buka/tutup per induk · Edit · Nonaktifkan / Aktifkan kembali<br/>Teks: badge Aktif / Nonaktif · badge Tersembunyi<br/>Pesan: Tidak ada menu yang cocok dengan pencarian. · Menu diaktifkan kembali · Induk menu masih nonaktif — aktifkan induknya dulu"]:::content

  st_menu_form{{"Dialog: Edit Menu"}}:::dialog
  st_menu_form_c["Teks: Key · Title · URL · Parent · Order · Icon (baca-saja)<br/>Teks: Judul, urutan, induk, URL, dan ikon hanya bisa diubah lewat menu.csv + seed<br/>Field: Aktif (saklar) · Visible (saklar)<br/>Tombol: Batal · Simpan<br/>Pesan: Menu berhasil diupdate · Gagal menyimpan menu"]:::content

  st_menu_del{{"Dialog: Nonaktifkan Menu"}}:::dialog
  st_menu_del_c["Pesan: Menu item akan dinonaktifkan (soft delete) dan tidak lagi muncul di navigasi. Lanjutkan?<br/>Tombol: Batal · Nonaktifkan<br/>Pesan: Menu item dinonaktifkan · Gagal menonaktifkan menu item"]:::content

  st_menu --> st_menu_hdr --> st_menu_hdr_c
  st_menu --> st_menu_tb --> st_menu_tb_c
  st_menu --> st_menu_tree --> st_menu_tree_c
  st_menu_tree -.->|Edit| st_menu_form --> st_menu_form_c
  st_menu_tree -.->|Nonaktifkan| st_menu_del --> st_menu_del_c

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef dialog fill:#fce7f3,stroke:#be185d,color:#831843
```

Sejak #364 halaman ini hanya mengubah **Aktif** dan **Visible**; struktur menu (judul, urutan, induk, URL, ikon) dan menu baru datang dari `prisma/seeds/data/menu.csv` + seed. **Aktifkan kembali** pada baris nonaktif berjalan langsung tanpa dialog.

## Role & Permission

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  st_roles["Role & Permission"]:::page

  st_roles_hdr("Header"):::section
  st_roles_hdr_c["Judul: Role & Permission<br/>Teks: Atur default permission per role untuk setiap menu<br/>Tombol: Panduan (?) → Bantuan"]:::content

  st_roles_tb("Toolbar"):::section
  st_roles_tb_c["Filter: Cari menu… (judul / key, level 1–3)<br/>Tombol: Buka semua · Tutup semua (nonaktif saat mencari)<br/>Filter: chip role ADMIN · OPERATOR · MANAGEMENT · DONOR (default semua, minimal 1) · ↺ Reset"]:::content

  st_roles_mx("Matriks: role × menu × izin"):::section
  st_roles_mx_c["Kolom: Menu · per role 6 izin — Create · View · Edit · Delete ┊ Export Excel · Print PDF<br/>Teks: baris menu rekursif 3 level, collapsible · header & kolom Menu sticky<br/>Aksi: klik sel = toggle Granted / Denied (optimistis) · hover = sorot baris × kolom<br/>Aksi: klik ikon header = toggle satu kolom (satu izin × semua menu × satu role)<br/>Aksi: preset baris — Lihat saja · Lihat + Unduh · Akses penuh · Kosongkan<br/>Teks: SUPERADMIN tidak ditampilkan (selalu akses penuh)<br/>Pesan: Gagal menyimpan permission · SUPERADMIN memiliki semua akses · Tidak ada menu yang cocok dengan pencarian."]:::content

  st_roles_lg("Legend"):::section
  st_roles_lg_c["Teks: Granted · Denied · Preset baris · ikon + nama tiap izin<br/>Teks: Klik ikon header = toggle satu kolom · SUPERADMIN selalu akses penuh (tidak ditampilkan)"]:::content

  st_roles_cascade{{"Dialog: Terapkan ke sub-menu?"}}:::dialog
  st_roles_cascade_c["Tombol: Batal · Hanya menu ini · Termasuk sub-menu"]:::content

  st_roles_col{{"Dialog: Toggle satu kolom?"}}:::dialog
  st_roles_col_c["Pesan: memberi/mencabut satu izin pada semua menu untuk satu role<br/>Tombol: Batal · Terapkan"]:::content

  st_roles --> st_roles_hdr --> st_roles_hdr_c
  st_roles --> st_roles_tb --> st_roles_tb_c
  st_roles --> st_roles_mx --> st_roles_mx_c
  st_roles --> st_roles_lg --> st_roles_lg_c
  st_roles_mx -.->|Preset baris pada menu berinduk| st_roles_cascade --> st_roles_cascade_c
  st_roles_mx -.->|Klik ikon header izin| st_roles_col --> st_roles_col_c

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef dialog fill:#fce7f3,stroke:#be185d,color:#831843
```

Matriks berisi **4 role yang bisa diubah** (ADMIN, OPERATOR, MANAGEMENT, DONOR) × seluruh menu × 6 izin (VIEW/CREATE/EDIT/DELETE/EXPORT/PRINT). Perubahan tersimpan langsung saat sel diklik (optimistis, revert bila gagal); izin induk mengaskade ke anak lewat dialog kaskade.

## Region Management

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  st_regions["Region Management"]:::page

  st_regions_hdr("Header"):::section
  st_regions_hdr_c["Judul: Region Management<br/>Teks: Kelola hierarki wilayah administratif<br/>Tombol: Panduan (?) → Bantuan"]:::content

  st_regions_tb("Toolbar / Filter"):::section
  st_regions_tb_c["Filter: Cari nama atau kode… · Semua Status / Aktif / Nonaktif<br/>Tombol: Tambah Provinsi"]:::content

  st_regions_tree("Tabel: Pohon wilayah (4 level)"):::section
  st_regions_tree_c["Kolom: Aksi · Wilayah · Kode · Status<br/>Teks: level Provinsi → Distrik → Kecamatan → Desa / Kelurahan (ikon & warna per level)<br/>Aksi: chevron buka/tutup · Tambah Distrik / Kecamatan / Desa · Edit · Nonaktifkan / Aktifkan kembali<br/>Teks: auto-expand saat mencari/memfilter · baris nonaktif meredup beserta turunannya<br/>Pesan: Tidak ada data wilayah yang ditemukan · Status berhasil diubah · Gagal mengubah status"]:::content

  st_regions_lg("Legend"):::section
  st_regions_lg_c["Teks: Provinsi · Distrik · Kecamatan · Desa / Kelurahan"]:::content

  st_regions_form{{"Dialog: Tambah / Edit {level}"}}:::dialog
  st_regions_form_c["Teks: Induk (nama wilayah induk, level di bawah provinsi)<br/>Field: Kode (mis. 3201) · Nama<br/>Tombol: Batal · Simpan (Menyimpan…)<br/>Pesan: {level} berhasil ditambahkan · {level} berhasil diupdate"]:::content

  st_regions --> st_regions_hdr --> st_regions_hdr_c
  st_regions --> st_regions_tb --> st_regions_tb_c
  st_regions --> st_regions_tree --> st_regions_tree_c
  st_regions --> st_regions_lg --> st_regions_lg_c
  st_regions_tb -.->|Tambah Provinsi| st_regions_form --> st_regions_form_c
  st_regions_tree -.->|Tambah anak / Edit| st_regions_form

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef dialog fill:#fce7f3,stroke:#be185d,color:#831843
```

Satu dialog yang sama dipakai untuk keempat level; judulnya mengikuti level (`Tambah Provinsi`, `Edit Distrik`, `Tambah Kecamatan`, `Tambah Desa / Kelurahan`). Level Desa / Kelurahan tidak punya aksi **Tambah** anak.

## Alur lintas menu

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  st_users["User Management"]:::page
  st_users_access{{"Dialog: Akses Data — {nama user}"}}:::dialog
  st_users_menu{{"Dialog: Hak Akses Menu — {nama user}"}}:::dialog
  st_roles["Role & Permission"]:::page
  st_menu["Menu Management"]:::page
  st_regions["Region Management"]:::page

  st_scope{"Cakupan data: ALL / per Kabupaten / per Lembaga"}:::decision
  st_scope_c["Teks: tanpa penugasan = ALL (semua data)<br/>Teks: hanya Lembaga Petani = per Lembaga<br/>Teks: ada Provinsi / Distrik = per Kabupaten<br/>Teks: berlaku di semua menu — Dashboard, Master Data, Report, Map, Data Analyst, Bulk Upload"]:::content

  st_perm[("Izin efektif per user (default role + override)")]:::data
  ov_sidebar("Sidebar"):::section
  st_region_db[("Hierarki wilayah (Provinsi → Desa)")]:::data

  md_farmers_list["Petani (daftar)"]:::page
  md_groups_list["Lembaga Petani (daftar)"]:::page
  db_main["Main Dashboard"]:::page
  rp_farmer["Petani"]:::page

  st_users -.->|Akses Data| st_users_access --> st_scope --> st_scope_c
  st_scope -.->|memfilter| db_main
  st_scope -.->|memfilter| md_farmers_list
  st_scope -.->|memfilter| rp_farmer

  st_roles -.->|default izin per role| st_perm
  st_users -.->|Hak Akses Menu| st_users_menu -.->|override grant / revoke| st_perm
  st_perm -.->|menu yang tampil & tombol yang aktif| ov_sidebar

  st_menu -.->|Aktif / Visible| ov_sidebar
  st_regions --> st_region_db
  st_region_db -.->|opsi Provinsi & Distrik| st_users_access
  st_region_db -.->|alamat & lokasi lahan| md_farmers_list
  st_region_db -.->|distrik Lembaga| md_groups_list

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef dialog fill:#fce7f3,stroke:#be185d,color:#831843
  classDef decision fill:#ffedd5,stroke:#ea580c,color:#7c2d12
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

- **Penugasan user → cakupan data.** Centang Provinsi/Distrik/Lembaga di dialog Akses Data menentukan data mana yang terlihat user di **semua** menu: tanpa penugasan = ALL; hanya Lembaga Petani = per Lembaga; ada Provinsi/Distrik = per Kabupaten (Provinsi diurai menjadi semua distriknya). SUPERADMIN selalu ALL.
- **Role & Permission + override → sidebar dan tombol.** Izin default per role (matriks) digabung dengan override per user (Hak Akses Menu) menjadi izin efektif; menu tanpa VIEW hilang dari sidebar, tombol Tambah/Edit/Nonaktifkan/Excel/PDF mengikuti CREATE/EDIT/DELETE/EXPORT/PRINT.
- **Menu Management → sidebar.** Saklar Aktif dan Visible menentukan menu mana yang dirender di sidebar untuk semua user; struktur menunya sendiri berasal dari `menu.csv`.
- **Regions → semua data berwilayah.** Provinsi/Distrik yang dibuat di sini menjadi pilihan di Akses Data, alamat Petani, lokasi Lahan, distrik Lembaga Petani, dan filter wilayah di Dashboard/Report/Map.

## Urutan demo yang disarankan

1. Buka Settings → Regions: tunjukkan pohon Provinsi → Distrik → Kecamatan → Desa, cari satu kode, tambah satu Distrik lewat dialog.
2. Buka Role & Permission: pilih chip role OPERATOR saja, buka satu menu, klik sel untuk mengubah izin, lalu coba preset baris `Lihat + Unduh` → dialog kaskade `Termasuk sub-menu`.
3. Buka User Management → Tambah User (role OPERATOR), lalu Edit untuk menunjukkan reset password (`kosongkan jika tidak diubah`).
4. Pada user yang sama klik Akses Data: centang satu Lembaga Petani → Ringkasan Akses berubah; jelaskan bahwa cakupan data user kini per Lembaga di semua menu.
5. Klik Hak Akses Menu: cabut satu izin (sel merah) dan beri satu izin tambahan (sel hijau); badge `n Override` muncul di tabel.
6. Masuk sebagai user tersebut (tab lain): sidebar dan tombol mengikuti izin efektif, data terbatas pada Lembaga yang ditugaskan.
7. Kembali sebagai SUPERADMIN → Menu Management: matikan saklar Visible satu menu → menu hilang dari sidebar; nyalakan kembali.
