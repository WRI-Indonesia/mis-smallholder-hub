# Peta Fitur — Platform Developer

> Bagian dari dokumentasi **Produk** · Peta fitur untuk Miro. Indeks: [README.md](README.md) · Legenda: [legend.md](legend.md) · Sumber: [../pages/platform-developer/README.md](../pages/platform-developer/README.md)

> **Ringkasan:** Menu tooling internal tim pengembang — tentang aplikasinya sendiri (progres rilis, rencana kerja, struktur data, issue GitHub), bukan tentang data petani. Tiga halaman membaca berkas dokumentasi repo yang di-bundle saat build (`metrics.md`, `roadmap.md`, `tech-debt.md`, `sprint.md`) atau artefak skema; satu halaman membaca GitHub REST API langsung; satu halaman (Peta Fitur) menampilkan berkas peta fitur ini sendiri. Lima sub menu, lima halaman.

## Pohon navigasi

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  pd(["Platform Developer"]):::menu
  pd_metrics[["Metrik Rilis"]]:::sub
  pd_datamap[["Peta Data & Skema"]]:::sub
  pd_sprint[["Rencana Pengembangan"]]:::sub
  pd_issues[["Daftar Issue"]]:::sub
  pd_sitemap[["Peta Fitur"]]:::sub
  pd_metrics_page["Metrik Rilis"]:::page
  pd_datamap_page["Peta Data & Skema"]:::page
  pd_sprint_page["Rencana Pengembangan"]:::page
  pd_issues_page["Daftar Issue"]:::page
  pd_sitemap_page["Peta Fitur"]:::page

  pd --> pd_metrics --> pd_metrics_page
  pd --> pd_datamap --> pd_datamap_page
  pd --> pd_sprint --> pd_sprint_page
  pd --> pd_issues --> pd_issues_page
  pd --> pd_sitemap --> pd_sitemap_page

  classDef menu fill:#166534,stroke:#14532d,color:#ffffff,font-weight:bold
  classDef sub fill:#dcfce7,stroke:#166534,color:#14532d
  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
```

| Halaman | Route | Katalog |
|---|---|---|
| Metrik Rilis | `/admin/dashboard/metrics` | [data-analyst/metrics.md](../pages/data-analyst/metrics.md) |
| Peta Data & Skema | `/admin/data-analyst/data-map` | [data-analyst/data-map.md](../pages/data-analyst/data-map.md) |
| Rencana Pengembangan | `/admin/data-analyst/sprint` | [data-analyst/sprint.md](../pages/data-analyst/sprint.md) |
| Daftar Issue | `/admin/platform-developer/issues` | [platform-developer/issues.md](../pages/platform-developer/issues.md) |
| Peta Fitur | `/admin/platform-developer/sitemap` | [platform-developer/sitemap.md](../pages/platform-developer/sitemap.md) |

Halaman induk `/admin/platform-developer` tidak punya isi; ia mengalihkan ke sub menu pertama yang boleh diakses (bawaan Metrik Rilis). Tiga halaman pertama dipindahkan dari menu Data Analyst pada 2026-10-07 — route dan katalognya sengaja tetap memakai segmen lama agar tautan yang beredar tidak putus.

## Metrik Rilis — bagian 1/2

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  pd_metrics_page["Metrik Rilis"]:::page

  pd_metrics_hdr("Header"):::section
  pd_metrics_hdr_c["Judul: Metrik rilis · rentang tanggal · jumlah rilis<br/>Teks: Badge terukur sejak v0.21.0<br/>Tombol: Panduan (?) → Bantuan"]:::content

  pd_metrics_sum("Baris ringkasan (2 kartu)"):::section
  pd_metrics_sum_last["Kartu: Rilis terakhir<br/>KPI: Versi (tautan GitHub Release) · RVS + Δ (ⓘ anchor v0.9.0 = 1.000) · Progres roadmap saat rilis (kini x% bila sudah bergerak)<br/>Tombol: Progres roadmap → akordeon Detail roadmap"]:::content
  pd_metrics_sum_cur["Kartu: Rilis berjalan<br/>KPI: Versi + judul · target (hari ke-n/N, sisa n hari / lewat n hari)<br/>KPI: Bilah butir selesai · poin · dikerjakan · menunggu keputusan<br/>Teks: data rencana hanya tampil bila boleh membuka Rencana Pengembangan"]:::content

  pd_metrics_health("Jalur kesehatan (1 baris, 4 sel)"):::section
  pd_metrics_health_c["KPI: Bug terbuka (latar warning bila > 0) · Tech debt aktif + panah arah · Bantuan (selesai/total, % menu ber-tutorial) · Test otomatis + panah arah (+N sejak rilis terakhir)<br/>Aksi: Klik sel Tech debt → akordeon Tech debt aktif"]:::content

  pd_metrics_chart("Kartu grafik bertab"):::section
  pd_metrics_chart_c["Tab: RVS · Roadmap · Test<br/>Filter: Rentang 1 Minggu · 1 Bulan · 6 Bulan · 1 Tahun · Semua (satu kontrol untuk ketiga tab)<br/>Tab: RVS — kurva garis, estimasi putus-putus, anotasi mulai diukur, tooltip versi · tanggal · RVS · Δ<br/>Tab: Roadmap — stepped line, garis terputus per baseline reset, tautan lihat rincian fase → Detail roadmap<br/>Tab: Test — garis jumlah test, anotasi lonjakan terbesar"]:::content

  pd_src_metrics[("metrics.md")]:::data
  pd_src_roadmap[("roadmap.md")]:::data
  pd_src_td[("tech-debt.md")]:::data
  pd_src_sprint[("sprint.md")]:::data

  pd_metrics_page --> pd_metrics_hdr --> pd_metrics_hdr_c
  pd_metrics_page --> pd_metrics_sum --> pd_metrics_sum_last
  pd_metrics_sum --> pd_metrics_sum_cur
  pd_metrics_page --> pd_metrics_health --> pd_metrics_health_c
  pd_metrics_page --> pd_metrics_chart --> pd_metrics_chart_c
  pd_src_metrics -.->|dibaca saat build| pd_metrics_page
  pd_src_roadmap -.->|dibaca saat build| pd_metrics_page
  pd_src_td -.->|dibaca saat build| pd_metrics_page
  pd_src_sprint -.->|Rilis berjalan| pd_metrics_sum_cur

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

## Metrik Rilis — bagian 2/2

Empat akordeon di bawah grafik, semuanya tertutup secara bawaan.

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  pd_metrics_page["Metrik Rilis"]:::page

  pd_metrics_roadmap("Akordeon: Detail roadmap"):::section
  pd_metrics_roadmap_c["Teks: meta Roadmap % · jumlah fase<br/>KPI: Dari mana angkanya — inti ×2 · pendukung ×1 · total poin · Roadmap % · sisa pp menuju target<br/>Teks: Sebaran per stream — satu kotak = satu fase, lebar ∝ bobot, tooltip status · bobot · poin · +pp bila selesai<br/>Teks: Sisa fase roadmap per horizon — fase · poin terbuka · +pp bila tuntas<br/>Aksi: Klik baris fase → Sudah ada & Langkah berikutnya"]:::content

  pd_metrics_releases("Akordeon: Daftar rilis"):::section
  pd_metrics_releases_c["Kolom: Versi (tautan Release GitHub) · Tanggal · RVS + Δ · Roadmap (+pt) · Test (+N) · Catatan (#ref ter-link)<br/>Teks: Badge belum dirilis · perubahan besar · terbaru di atas"]:::content

  pd_metrics_pace("Akordeon: Laju RVS per periode"):::section
  pd_metrics_pace_c["Filter: Granularitas Hari · Minggu · Bulan · Tahun<br/>KPI: 3 seri tetap Senin–Jumat / Sabtu / Minggu (arsir)<br/>Teks: Statistik jumlah periode · rata-rata · puncak<br/>Pesan: mode Hari 90 periode terakhir · periode tepi bisa belum genap · perolehan dicatat pada tanggal rilis"]:::content

  pd_metrics_td("Akordeon: Tech debt aktif"):::section
  pd_metrics_td_c["Teks: meta N item<br/>Kolom: ID · Prioritas (badge) · Status · Judul<br/>Tombol: tech-debt.md di GitHub"]:::content

  pd_github[/"GitHub — repo aplikasi"/]:::external

  pd_metrics_page --> pd_metrics_roadmap --> pd_metrics_roadmap_c
  pd_metrics_page --> pd_metrics_releases --> pd_metrics_releases_c
  pd_metrics_page --> pd_metrics_pace --> pd_metrics_pace_c
  pd_metrics_page --> pd_metrics_td --> pd_metrics_td_c
  pd_metrics_releases -.->|tautan Release & #ref| pd_github
  pd_metrics_td -.->|tautan tech-debt.md| pd_github

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef external fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
```

## Peta Data & Skema

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  pd_datamap_page["Peta Data & Skema"]:::page

  pd_datamap_hdr("Header"):::section
  pd_datamap_hdr_c["Judul: Peta Data & Skema<br/>Tombol: Panduan (?) → Bantuan"]:::content

  pd_datamap_tabs("Tabs"):::section
  pd_datamap_tabs_c["Tab: ERD · Keterisian · Jalur data"]:::content

  pd_datamap_erd("Tab: ERD — kanvas skema (React Flow)"):::section
  pd_datamap_erd_c["Teks: Node per entitas — nama · nama tabel · jumlah kolom & relasi<br/>Teks: Tata letak tetap per domain (grid 4 kolom), posisi tidak berpindah<br/>Filter: Domain — satu domain + tetangga langsungnya<br/>Teks: Garis relasi berlabel 1:1 · 1:n · n:n<br/>Aksi: Klik entitas → sorot tetangga, sisanya diredupkan · klik latar → lepas<br/>Tombol: Zoom · MiniMap · tema mengikuti aplikasi"]:::content

  pd_datamap_fill("Tab: Keterisian"):::section
  pd_datamap_fill_c["KPI: Total baris aktif · Entitas masih kosong · Kolom tak pernah terisi<br/>Teks: Sorotan kolom 0% (ada di skema, tidak pernah diisi)<br/>Kolom: Per entitas (lipat) → per kolom: persen · batang · terisi/total<br/>Teks: Belum ada di sistem — stream MD roadmap yang belum ✅"]:::content

  pd_datamap_lineage("Tab: Jalur data"):::section
  pd_datamap_lineage_c["Kolom: Matriks menu × entitas — sel R / W / RW · kolom menu melekat<br/>Filter: Hanya menu yang menulis<br/>Teks: entitas diurut dari yang paling banyak disentuh · akses dinamis ditulis miring (dinyatakan, bukan ditemukan)"]:::content

  pd_src_schema[("Skema Prisma — artefak build")]:::data
  pd_src_db[("Database — hitungan baris aktif per tabel")]:::data
  pd_src_lineage[("Jalur data menu → entitas — artefak build")]:::data
  pd_src_roadmap[("roadmap.md")]:::data

  pd_datamap_page --> pd_datamap_hdr --> pd_datamap_hdr_c
  pd_datamap_page --> pd_datamap_tabs --> pd_datamap_tabs_c
  pd_datamap_tabs --> pd_datamap_erd --> pd_datamap_erd_c
  pd_datamap_tabs --> pd_datamap_fill --> pd_datamap_fill_c
  pd_datamap_tabs --> pd_datamap_lineage --> pd_datamap_lineage_c
  pd_src_schema -.->|dibaca| pd_datamap_erd
  pd_src_schema -.->|dibaca| pd_datamap_fill
  pd_src_db -.->|dihitung saat dibuka| pd_datamap_fill
  pd_src_roadmap -.->|Belum ada di sistem| pd_datamap_fill
  pd_src_lineage -.->|dibaca| pd_datamap_lineage

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

## Rencana Pengembangan — bagian 1/2

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  pd_sprint_page["Rencana Pengembangan"]:::page

  pd_sprint_hdr("Header"):::section
  pd_sprint_hdr_c["Judul: Rencana Pengembangan<br/>Teks: deskripsi sumber data (sprint.md)<br/>Tombol: Panduan (?) → Bantuan"]:::content

  pd_sprint_strip("Strip ringkasan (3 kotak)"):::section
  pd_sprint_strip_c["KPI: Dokumen rencana diperbarui (kuning bila > 14 hari)<br/>KPI: Rilis yang sedang dikejar — sisa n hari (target …) / target lewat n hari + bilah poin · rilis lain yang lewat target<br/>KPI: Keputusan menunggu owner — butir · poin · terlambat · +n keputusan di backlog<br/>Tombol: → tab Analisa · → tab Semua Issue (filter Backlog + Menunggu keputusan)"]:::content

  pd_sprint_tabs("Tabs"):::section
  pd_sprint_tabs_c["Tab: Rilis (bawaan) · Analisa · Semua Issue"]:::content

  pd_sprint_rilis("Tab: Rilis"):::section
  pd_sprint_rilis_pick["Pesan: peringatan kuning bila semua rilis sudah dirilis<br/>Filter: Pemilih rilis belum tuntas — Berjalan · Terlambat · Mendatang · Combobox Riwayat (n) ber-cari<br/>Teks: Ringkasan rilis — badge Berjalan/Terlambat/Mendatang/Dirilis · versi · judul · rentang · hari ke-n dari m · bilah poin · x/y butir selesai"]:::content
  pd_sprint_rilis_kanban["Kolom: Papan kanban — Belum dimulai · Dikerjakan · Menunggu keputusan · Selesai (label · jumlah butir · poin)<br/>Teks: Kartu ringkas — judul (#nnn → GitHub) · ukuran (S/M/L · poin) · titik kategori · keputusan owner yang masih terbuka<br/>Tombol: Detail / Tutup → target butir<br/>Teks: Kartu Selesai satu baris bercentang · lajur terlipat Digeser ke rilis lain (n)"]:::content

  pd_src_sprint[("sprint.md")]:::data
  pd_github[/"GitHub — repo aplikasi"/]:::external

  pd_sprint_page --> pd_sprint_hdr --> pd_sprint_hdr_c
  pd_sprint_page --> pd_sprint_strip --> pd_sprint_strip_c
  pd_sprint_page --> pd_sprint_tabs --> pd_sprint_tabs_c
  pd_sprint_tabs --> pd_sprint_rilis --> pd_sprint_rilis_pick
  pd_sprint_rilis --> pd_sprint_rilis_kanban
  pd_src_sprint -.->|dibaca saat build| pd_sprint_page
  pd_sprint_rilis -.->|tautan #nnn| pd_github

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
  classDef external fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
```

## Rencana Pengembangan — bagian 2/2

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  pd_sprint_page["Rencana Pengembangan"]:::page

  pd_sprint_analisa("Tab: Analisa"):::section
  pd_sprint_analisa_kpi["KPI: Rencana (poin · n rilis · tanggal akhir) · Tertahan keputusan owner (poin · % rencana) · Velocity rata-rata (poin/minggu kalender, ukuran sampel) · Carry-over"]:::content
  pd_sprint_analisa_chart["Teks: Beban & kemajuan per rilis — satu kolom per rilis, ditumpuk per status, penanda kapasitas (velocity × minggu rilis), tooltip<br/>Teks: Fokus per kategori — matriks poin kategori × rilis<br/>Teks: Keputusan menunggu owner — Terlambat · Rilis berjalan · Mendatang<br/>Teks: Carry-over — butir digeser: dari rilis mana → rilis tujuan · berapa kali"]:::content

  pd_sprint_issue("Tab: Semua Issue"):::section
  pd_sprint_issue_c["Teks: n issue unik (m baris)<br/>Filter: Cari · Combobox Rilis (belum tuntas → Backlog → riwayat) · Chip Status Todo · Dikerjakan · Menunggu keputusan · Selesai (+ jumlah)<br/>Kolom: No. Issue (tautan GitHub) · Rilis (versi / Backlog urutan n) · Kategori · Status · Deskripsi<br/>Aksi: Urutkan No. Issue · Rilis"]:::content

  pd_github[/"GitHub — repo aplikasi"/]:::external

  pd_sprint_page --> pd_sprint_analisa --> pd_sprint_analisa_kpi
  pd_sprint_analisa --> pd_sprint_analisa_chart
  pd_sprint_page --> pd_sprint_issue --> pd_sprint_issue_c
  pd_sprint_issue -.->|tautan No. Issue| pd_github

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef external fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
```

## Daftar Issue — bagian 1/2

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  pd_issues_page["Daftar Issue"]:::page

  pd_issues_hdr("Header"):::section
  pd_issues_hdr_c["Judul: Daftar Issue<br/>Teks: deskripsi sumber data (GitHub, cache 30 menit)<br/>Tombol: Panduan (?) → Bantuan"]:::content

  pd_issues_err("Kartu galat (kuning, hanya bila GitHub gagal)"):::section
  pd_issues_err_c["Pesan: Batas permintaan GitHub tercapai (+ jam reset WIB) · GitHub tak terjangkau · HTTP gagal<br/>Teks: data lama tetap tersaji bila cache sudah terisi"]:::content

  pd_issues_sum("Ringkasan"):::section
  pd_issues_sum_c["KPI: n issue · n terbuka · data GitHub per {waktu}"]:::content

  pd_issues_filter("Bar filter (tersimpan di URL)"):::section
  pd_issues_filter_c["Filter: Cari nomor, judul, atau label · Label (combobox + jumlah) · Aktivitas dari–sampai (dibuat ATAU ditutup, WIB) · Status (4 chip + jumlah: open · closed · not planned · duplicate)<br/>Tombol: ↺ Reset · Unduh Excel<br/>Teks: berlaku ke List · Kalender · Kanban · Excel (Tren: hanya cari + label)"]:::content

  pd_github_api[/"GitHub REST API — issues repo aplikasi (open + closed)"/]:::external
  pd_issues_cache[("Cache 30 menit")]:::data
  pd_issues_xlsx[("daftar-issue-{tanggal}.xlsx — sheet Issue List")]:::data
  pd_issues_xlsx_c["Ekspor: Excel — Date Solved (Close) · No Issue · Simple Desc · Date Created · Status<br/>Teks: issue tersaring, urutan = urutan List"]:::content

  pd_issues_page --> pd_issues_hdr --> pd_issues_hdr_c
  pd_issues_page --> pd_issues_err --> pd_issues_err_c
  pd_issues_page --> pd_issues_sum --> pd_issues_sum_c
  pd_issues_page --> pd_issues_filter --> pd_issues_filter_c
  pd_github_api ==>|paginasi 100/halaman| pd_issues_cache ==>|dibaca| pd_issues_page
  pd_issues_filter ==>|Unduh Excel| pd_issues_xlsx --> pd_issues_xlsx_c

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
  classDef external fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
```

## Daftar Issue — bagian 2/2

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  pd_issues_page["Daftar Issue"]:::page

  pd_issues_tabs("Tabs"):::section
  pd_issues_tabs_c["Tab: List (bawaan) · Kalender · Tren mingguan · Kanban"]:::content

  pd_issues_list("Tab: List"):::section
  pd_issues_list_c["Kolom: No. (tautan GitHub) · Judul · Label · Dibuat · Ditutup · Status<br/>Aksi: Urutkan No. · Dibuat · Ditutup"]:::content

  pd_issues_cal("Tab: Kalender (kiri 1/3 kalender · kanan 2/3 detail)"):::section
  pd_issues_cal_c["Filter: Bulan (bawaan bulan berjalan WIB)<br/>Teks: sel +n dibuat / ✓n ditutup · hanya kejadian di dalam rentang aktivitas yang diplot<br/>Aksi: Sorot sel → tooltip (jumlah + ≤ 3 judul per jenis) · Klik tanggal → panel kanan hari itu · ← Seluruh bulan"]:::content

  pd_issues_trend("Tab: Tren mingguan"):::section
  pd_issues_trend_c["Teks: Batang Dibuat vs Ditutup per minggu (Senin–Minggu, dari minggu issue pertama)<br/>Teks: Akumulasi area bertumpuk — kumulatif Ditutup + Masih terbuka<br/>Teks: Grafik terpisah garis masih terbuka di akhir minggu<br/>Teks: Readout per kartu (sorot/ketuk minggu) + tabel per minggu<br/>Filter: hanya cari + label (minggu dipotong ke rentang aktivitas)"]:::content

  pd_issues_kanban("Tab: Kanban (read-only, 5 kolom)"):::section
  pd_issues_kanban_c["Kolom: Belum direncanakan · Todo · Dikerjakan · Menunggu keputusan · Closed (≤ 30 hari, terbaru di atas)<br/>Teks: kolom dari label status:* di GitHub · label ganda → tahap paling lanjut menang"]:::content

  pd_github[/"GitHub — repo aplikasi"/]:::external

  pd_issues_page --> pd_issues_tabs --> pd_issues_tabs_c
  pd_issues_tabs --> pd_issues_list --> pd_issues_list_c
  pd_issues_tabs --> pd_issues_cal --> pd_issues_cal_c
  pd_issues_tabs --> pd_issues_trend --> pd_issues_trend_c
  pd_issues_tabs --> pd_issues_kanban --> pd_issues_kanban_c
  pd_issues_list -.->|tautan No.| pd_github

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef external fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
```

## Peta Fitur

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  pd_sitemap_page["Peta Fitur"]:::page

  pd_sitemap_hdr("Header"):::section
  pd_sitemap_hdr_c["Judul: Peta Fitur<br/>Tombol: Panduan (?) → Bantuan<br/>Teks: sumber = dokumentasi produk, dua mesin gambar"]:::content

  pd_sitemap_pick("Pemilih berkas"):::section
  pd_sitemap_pick_c["Tombol: Ikhtisar Sistem · Master Data · Bulk Upload · Dashboard · Map · Report<br/>Tombol: Data Analyst · Tools · Settings · Platform Developer · Bantuan<br/>Teks: ringkasan berkas terpilih"]:::content

  pd_sitemap_view("Tab tampilan + legenda"):::section
  pd_sitemap_view_c["Tab: Mermaid (bawaan) · React Flow<br/>Legenda: Menu · Sub menu · Halaman · Bagian · Isi · Dialog · Percabangan · Data/berkas · Layanan luar · putus-putus = prototipe/direncanakan"]:::content

  pd_sitemap_toc("Daftar isi"):::section
  pd_sitemap_toc_c["Tautan: satu per bagian ber-diagram (layar lebar, menempel saat digulir)"]:::content

  pd_sitemap_card("Kartu per bagian"):::section
  pd_sitemap_card_c["Judul: nama bagian (Pohon navigasi · nama halaman · Alur lintas menu)<br/>Diagram: SVG Mermaid atau kanvas React Flow (geser · zoom · peta mini)<br/>Tabel: Halaman · Route · Katalog<br/>Teks: catatan & urutan demo"]:::content

  pd_sitemap_src[("docs/product/sitemap/*.md (11 berkas, di-bundle saat build)")]:::data

  pd_sitemap_page --> pd_sitemap_hdr --> pd_sitemap_hdr_c
  pd_sitemap_page --> pd_sitemap_pick --> pd_sitemap_pick_c
  pd_sitemap_page --> pd_sitemap_view --> pd_sitemap_view_c
  pd_sitemap_page --> pd_sitemap_toc --> pd_sitemap_toc_c
  pd_sitemap_page --> pd_sitemap_card --> pd_sitemap_card_c
  pd_sitemap_src ==>|diparse saat build| pd_sitemap_page

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef section fill:#fef9c3,stroke:#ca8a04,color:#713f12
  classDef content fill:#f8fafc,stroke:#94a3b8,color:#0f172a,text-align:left
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
```

Halaman ini menampilkan berkas-berkas peta fitur ini sendiri — termasuk diagram di atas. Pilihan berkas dan tab tersimpan di URL sehingga bisa dibagikan.

## Alur lintas menu

```mermaid
%%{init: {"flowchart": {"wrappingWidth": 420}}}%%
flowchart LR
  pd_metrics_page["Metrik Rilis"]:::page
  pd_datamap_page["Peta Data & Skema"]:::page
  pd_sprint_page["Rencana Pengembangan"]:::page
  pd_issues_page["Daftar Issue"]:::page
  hp_topic["Halaman Topik"]:::page
  pd_allmenus["Semua menu aplikasi (Dashboard, Master Data, Map, …)"]:::page

  pd_src_sprint[("sprint.md")]:::data
  pd_src_roadmap[("roadmap.md")]:::data
  pd_src_lineage[("Jalur data menu → entitas — artefak build")]:::data
  pd_github[/"GitHub — repo aplikasi"/]:::external

  pd_src_sprint -.->|Rilis berjalan| pd_metrics_page
  pd_src_sprint -.->|rencana per rilis| pd_sprint_page
  pd_src_roadmap -.->|Roadmap %| pd_metrics_page
  pd_src_roadmap -.->|Belum ada di sistem| pd_datamap_page
  pd_src_sprint -.->|label status disamakan| pd_github
  pd_github ==>|REST API| pd_issues_page
  pd_allmenus -.->|dipindai saat build| pd_src_lineage -.->|Jalur data| pd_datamap_page
  pd_metrics_page -.->|Panduan| hp_topic
  pd_datamap_page -.->|Panduan| hp_topic
  pd_sprint_page -.->|Panduan| hp_topic
  pd_issues_page -.->|Panduan| hp_topic

  classDef page fill:#dbeafe,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold
  classDef data fill:#ede9fe,stroke:#6d28d9,color:#4c1d95
  classDef external fill:#e0f2fe,stroke:#0369a1,color:#0c4a6e
```

Menu ini tidak membuka halaman data petani dan tidak dibuka dari menu lain. Hubungannya ke luar lewat **sumber**: `sprint.md` dibaca dua halaman (Rilis berjalan di Metrik Rilis, rencana penuh di Rencana Pengembangan) dan label `status:*` di GitHub disamakan dengannya — sehingga Kanban Daftar Issue (kondisi nyata di GitHub) dan kanban Rencana Pengembangan (rencana) menampilkan tahapan yang sama. Tab Jalur data di Peta Data & Skema memetakan semua menu aplikasi ke entitas yang mereka baca/tulis. Setiap halaman punya tombol Panduan (?) ke tutorial Bantuan (p-8, p-10, p-15, p-19).

## Urutan demo yang disarankan

1. Buka Platform Developer → Metrik Rilis: baca kartu Rilis terakhir (versi, RVS, Roadmap %) dan Rilis berjalan, lalu jalur kesehatan 4 sel.
2. Ganti tab grafik RVS → Roadmap → Test dan rentang waktu; buka akordeon Detail roadmap lewat tombol Progres roadmap, lalu Daftar rilis.
3. Buka Rencana Pengembangan: strip ringkasan, pemilih rilis berjalan, papan kanban 4 kolom; klik Detail pada satu kartu, lalu buka tab Analisa (beban & kapasitas per rilis).
4. Buka Daftar Issue: tunjukkan ringkasan dari GitHub, filter cari/label/status, tab Kalender (sorot sel, klik tanggal) dan Tren mingguan.
5. Tab Kanban Daftar Issue: bandingkan kolomnya dengan kanban Rencana Pengembangan — kondisi nyata GitHub vs rencana. Klik Unduh Excel dan buka berkasnya.
6. Tutup dengan Peta Data & Skema: ERD (saring satu domain, klik entitas), tab Keterisian (kolom 0%), tab Jalur data (saring hanya menu yang menulis).
