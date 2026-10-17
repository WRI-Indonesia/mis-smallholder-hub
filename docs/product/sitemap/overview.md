# Peta Fitur — Ikhtisar Sistem

> Bagian dari dokumentasi **Produk** · Peta fitur untuk Miro. Indeks: [README.md](README.md) · Legenda: [legend.md](legend.md) · Sumber: [../navigation.md](../navigation.md) · [../pages/non-menu/README.md](../pages/non-menu/README.md)

> **Ringkasan:** Gambar besar sebelum masuk ke per menu: dua wilayah halaman (publik vs admin), alur masuk, kerangka layout yang tampil di semua halaman admin, sepuluh menu sidebar, dan relasi entitas data yang dikelola. Ini padanan baris atas site map lama (kotak entitas + percabangan Public Page / Restricted Page).

## Wilayah halaman & alur masuk

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  ov_start(["Pengguna membuka situs"]):::menu
  ov_login_q{"Sudah masuk?"}:::decision

  ov_public[["Halaman Publik"]]:::sub
  ov_home["Beranda Publik"]:::page
  ov_community["Community 🔲"]:::planned
  ov_km["Knowledge Management 🔲"]:::planned
  ov_404["404 Not Found"]:::page

  ov_login["Login"]:::page
  ov_login_c["Field: Email · Password (tombol mata)<br/>Tombol: Masuk · Kembali ke Beranda Utama<br/>Pesan: Email atau password salah · Login berhasil"]:::content
  ov_cred_q{"Email & password cocok?"}:::decision

  ov_admin[["Halaman Admin (/admin)"]]:::sub
  ov_dashboard_redirect["Dialihkan ke Dashboard"]:::page

  ov_start --> ov_public
  ov_public --> ov_home
  ov_public --> ov_community
  ov_public --> ov_km
  ov_public -.->|tautan rusak| ov_404
  ov_home -.->|Login| ov_login
  ov_login --> ov_login_c
  ov_login --> ov_cred_q
  ov_cred_q -->|ya| ov_admin
  ov_cred_q -->|tidak| ov_login
  ov_start --> ov_login_q
  ov_login_q -->|ya| ov_admin
  ov_login_q -->|belum| ov_login
  ov_admin --> ov_dashboard_redirect

  classDef menu fill:#166534,stroke:#14532d,color:#ffffff,font-weight:bold
  classDef sub fill:#dcfce7,stroke:#166534,color:#14532d
  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef decision fill:#ffedd5,stroke:#ea580c,color:#7c2d12
  classDef planned fill:#f1f5f9,stroke:#94a3b8,color:#64748b,stroke-dasharray:5 5
```

| Halaman | Route | Status | Katalog |
|---|---|---|---|
| Beranda Publik | `/` | ✅ | [home.md](../pages/non-menu/home.md) |
| Community | `/community` | 🔲 | [community.md](../pages/non-menu/community.md) |
| Knowledge Management | `/knowledge-management` | 🔲 | [knowledge-management.md](../pages/non-menu/knowledge-management.md) |
| Login | `/login` | ✅ | [login.md](../pages/non-menu/login.md) |
| Halaman admin | `/admin/**` | ✅ | [pages/README.md](../pages/README.md) |
| 404 | route tak dikenal | ✅ | [non-menu/README.md](../pages/non-menu/README.md) |

Semua halaman admin berada di balik sesi NextAuth. Pengguna yang sudah masuk dan membuka `/login` otomatis diarahkan ke `/admin`, yang lalu mengalihkan ke Dashboard.

## Halaman publik

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  ov_home["Beranda Publik"]:::page

  ov_pub_nav("Navbar publik"):::section
  ov_pub_nav_c["Tautan: Home · Community · Knowledge Management<br/>Tombol: Login · Toggle tema · Toggle bahasa ID/EN<br/>Menu mobile: Home · Community · Knowledge Management · Login Admin"]:::content

  ov_pub_hero("Hero"):::section
  ov_pub_hero_c["Judul: Smallholder HUB<br/>Teks: Management Information System<br/>Tombol: Login"]:::content

  ov_pub_footer("Footer publik"):::section
  ov_pub_footer_c["Tautan Cepat: Tentang Kami · Komunitas · Media · Kontak<br/>Sumber Daya: Praktik Terbaik · Materi Pelatihan · Laporan · FAQ<br/>Hubungi Kami: alamat · email · telepon<br/>Teks: hak cipta · Kebijakan Privasi · Ketentuan Layanan"]:::content

  ov_community["Community 🔲"]:::planned
  ov_km["Knowledge Management 🔲"]:::planned
  ov_login["Login"]:::page

  ov_home --> ov_pub_nav --> ov_pub_nav_c
  ov_home --> ov_pub_hero --> ov_pub_hero_c
  ov_home --> ov_pub_footer --> ov_pub_footer_c
  ov_pub_nav -.->|Community| ov_community
  ov_pub_nav -.->|Knowledge Management| ov_km
  ov_pub_hero -.->|Login| ov_login

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef planned fill:#f1f5f9,stroke:#94a3b8,color:#64748b,stroke-dasharray:5 5
```

Community dan Knowledge Management masih halaman penampung: tautan di navbar sudah ada, isinya belum dibangun.

## Layout bersama halaman admin

Kerangka yang tampil di **setiap** halaman admin. Di Miro, cukup digambar sekali di frame ikhtisar; diagram per menu tidak mengulanginya.

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  ov_layout["Layout admin"]:::page

  ov_sidebar("Sidebar"):::section
  ov_sidebar_c["Tombol: logo Smallholder HUB → Dashboard<br/>Filter: Cari menu… (Ctrl/⌘+K · Esc hapus)<br/>Tombol: Tutup semua menu<br/>Daftar menu 3 level (grup buka/tutup, hanya menu yang boleh diakses)<br/>Pesan: Menu tidak ditemukan.<br/>Footer: nama + email → Profile · Log out"]:::content

  ov_topbar("Topbar"):::section
  ov_topbar_c["Tombol: buka/tutup sidebar<br/>Breadcrumb: AdminPanel › menu › sub menu › halaman<br/>Tombol: Toggle tema (terang/gelap)<br/>Menu profil: nama & email · Profile · Log out"]:::content

  ov_main("Konten halaman"):::section
  ov_main_c["Judul halaman + deskripsi<br/>Tombol: Panduan (?) → topik Bantuan terkait<br/>Pesan: Memuat data… · Terjadi Kesalahan + Coba Lagi"]:::content

  ov_profile["Profil"]:::page
  ov_profile_c["Kartu identitas: Nama · Email · Role<br/>Field: Password Lama · Password Baru · Konfirmasi Password Baru<br/>Tombol: Simpan Password<br/>Pesan: Password berhasil diubah · Password lama salah"]:::content

  ov_login["Login"]:::page
  hp_index["Indeks Bantuan"]:::page

  ov_layout --> ov_sidebar --> ov_sidebar_c
  ov_layout --> ov_topbar --> ov_topbar_c
  ov_layout --> ov_main --> ov_main_c
  ov_topbar -.->|Profile| ov_profile --> ov_profile_c
  ov_topbar -.->|Log out| ov_login
  ov_main -.->|Panduan| hp_index

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
```

| Halaman | Route | Katalog |
|---|---|---|
| Profil | `/admin/profile` | [profile.md](../pages/non-menu/profile.md) |

Sidebar hanya menampilkan menu yang boleh diakses pengguna; daftar dan urutannya diatur di Settings → Menu Management dan Role & Permission (lihat [settings.md](settings.md)).

## Sepuluh menu sidebar

Urutan mengikuti kolom `order` di sidebar. Tiap menu punya berkas sendiri di folder ini.

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  ov_sidebar_root(["Sidebar admin"]):::menu

  db(["Dashboard"]):::menu
  ov_db_c["Main Dashboard · Dashboard Pelatihan · BMP Dashboard (Produksi)<br/>Monev BMP · Risk Management › Fire Alert · Dashboard Rantai Pasok 🟠"]:::content

  rp(["Report"]):::menu
  ov_rp_c["Petani · Lahan · Pelatihan · Produksi<br/>Kelompok Tani (Summary) · Kelompok Tani (Detail) · Patok"]:::content

  mp(["Map"]):::menu
  ov_mp_c["Peta Lahan · Peta BMP · Peta Rantai Pasok 🟠"]:::content

  md(["Master Data"]):::menu
  ov_md_c["Lembaga Petani · Petani · Pelatihan · Lahan<br/>Produksi · Monev BMP · Target Program"]:::content

  da(["Data Analyst"]):::menu
  ov_da_c["Ringkasan Petani · Ketersediaan Data › Semua Lembaga · Per Lembaga · Produksi<br/>Komparasi Data Acuan · Tumpang Tindih Lahan 🟠"]:::content

  pd(["Platform Developer"]):::menu
  ov_pd_c["Metrik Rilis · Peta Data & Skema · Rencana Pengembangan · Daftar Issue · Peta Fitur"]:::content

  tl(["Tools"]):::menu
  ov_tl_c["Dashboard Snapshot · Dashboard Snapshot BMP"]:::content

  hp(["Bantuan"]):::menu
  ov_hp_c["Indeks · Bab · Topik (tutorial · referensi · konsep)"]:::content

  bu(["Bulk Upload"]):::menu
  ov_bu_c["Upload Data Petani · Upload Data Produksi · Upload Data Lahan · Pohon Sawit"]:::content

  st(["Settings"]):::menu
  ov_st_c["User Management · Menu Management · Role & Permission · Regions"]:::content

  ov_sidebar_root --> db --> ov_db_c
  ov_sidebar_root --> rp --> ov_rp_c
  ov_sidebar_root --> mp --> ov_mp_c
  ov_sidebar_root --> md --> ov_md_c
  ov_sidebar_root --> da --> ov_da_c
  ov_sidebar_root --> pd --> ov_pd_c
  ov_sidebar_root --> tl --> ov_tl_c
  ov_sidebar_root --> hp --> ov_hp_c
  ov_sidebar_root --> bu --> ov_bu_c
  ov_sidebar_root --> st --> ov_st_c

  classDef menu fill:#166534,stroke:#14532d,color:#ffffff,font-weight:bold
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
```

| Order | Menu | Sub menu | Berkas peta |
|---|---|---|---|
| 0 | Dashboard | 6 (+ Fire Alert level 3) | [dashboard.md](dashboard.md) |
| 1 | Report | 7 | [report.md](report.md) |
| 2 | Map | 3 | [map.md](map.md) |
| 3 | Master Data | 7 | [master-data.md](master-data.md) |
| 4 | Data Analyst | 4 (+ 3 level 3) | [data-analyst.md](data-analyst.md) |
| 5 | Platform Developer | 5 | [platform-developer.md](platform-developer.md) |
| 6 | Tools | 2 | [tools.md](tools.md) |
| 9 | Bantuan | — | [help.md](help.md) |
| 10 | Bulk Upload | 4 | [bulk-upload.md](bulk-upload.md) |
| 99 | Settings | 4 | [settings.md](settings.md) |

## Relasi entitas data

Padanan kotak `User → KT → Farmer → Kebun` di site map lama, disesuaikan dengan istilah yang dipakai aplikasi sekarang (Lembaga Petani = organisasi; Kelompok Tani = atribut per lahan di bawahnya).

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  ov_e_user[("Pengguna")]:::data
  ov_e_region[("Wilayah: Provinsi › Kabupaten › Kecamatan › Desa")]:::data
  ov_e_group[("Lembaga Petani")]:::data
  ov_e_kt[("Kelompok Tani")]:::data
  ov_e_farmer[("Petani")]:::data
  ov_e_parcel[("Lahan (poligon)")]:::data
  ov_e_parcel_detail[("Detail lahan: surat · STDB · program · NKT · sepadan · kode vendor")]:::data
  ov_e_marker[("Patok batas")]:::data
  ov_e_tree[("Pohon sawit")]:::data
  ov_e_prod[("Produksi bulanan")]:::data
  ov_e_training[("Pelatihan: paket › kegiatan › peserta")]:::data
  ov_e_bmp[("Monev BMP: penilaian Lembaga & petani")]:::data
  ov_e_target[("Target Program")]:::data
  ov_e_benchmark[("Data acuan (benchmark)")]:::data
  ov_e_snapshot[("Snapshot dashboard")]:::data

  ov_e_user -->|cakupan: wilayah / Lembaga| ov_e_region
  ov_e_user -->|cakupan: Lembaga| ov_e_group
  ov_e_region --> ov_e_group
  ov_e_group --> ov_e_farmer
  ov_e_farmer --> ov_e_parcel
  ov_e_parcel -->|atribut| ov_e_kt
  ov_e_parcel --> ov_e_parcel_detail
  ov_e_parcel --> ov_e_marker
  ov_e_parcel --> ov_e_tree
  ov_e_parcel --> ov_e_prod
  ov_e_farmer --> ov_e_training
  ov_e_group --> ov_e_bmp
  ov_e_farmer --> ov_e_bmp
  ov_e_group --> ov_e_target
  ov_e_group -.-> ov_e_benchmark
  ov_e_group -.->|diringkas| ov_e_snapshot

  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

| Entitas | Dikelola di | Dibaca di |
|---|---|---|
| Pengguna, cakupan data | Settings → User Management | semua menu (filter otomatis) |
| Wilayah | Settings → Regions | filter Distrik di dashboard, laporan, peta |
| Lembaga Petani, Petani, Lahan, Pelatihan, Produksi, Monev BMP, Target Program | Master Data (+ Bulk Upload) | Dashboard, Report, Map, Data Analyst |
| Patok, pohon, detail lahan | Master Data → Lahan (detail) + Bulk Upload | Peta Lahan, Report → Patok |
| Data acuan | Data Analyst → Komparasi Data Acuan | halaman yang sama |
| Snapshot dashboard | Tools | Main Dashboard, BMP Dashboard |

## Urutan demo yang disarankan

1. Buka beranda publik, tunjukkan navbar dan tombol Login.
2. Masuk dengan akun; tunjukkan pengalihan ke Dashboard.
3. Kenalkan layout: sidebar (cari menu, buka/tutup grup), breadcrumb, tema, menu profil.
4. Jelaskan sepuluh menu dalam satu kalimat masing-masing (pakai diagram "Sepuluh menu sidebar").
5. Tutup dengan relasi entitas: data masuk lewat Master Data/Bulk Upload, dibaca oleh Dashboard/Report/Map/Data Analyst.
6. Lanjut ke episode per menu sesuai urutan berkas di [README.md](README.md).
