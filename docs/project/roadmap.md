# Proyek — Roadmap 2026–2027 & Phase Status (Source of Truth)

> Bagian dari dokumentasi **Proyek**. Indeks: [../README.md](../README.md) · Terkait: [brief.md](./brief.md) · [sprint.md](./sprint.md) · [tech-debt.md](./tech-debt.md) · [changelog.md](./changelog.md) · [contributing.md](./contributing.md) · Arsip: [roadmap-mvp.md](./roadmap-mvp.md)

## Roadmap — Sumber Kebenaran

Section ini adalah acuan resmi status delivery **pasca-MVP, Oktober 2026 – Desember 2027**. Jika ada perbedaan antara changelog, issue, dan tabel ini, gunakan tabel **Phase Status** sebagai kebenaran utama.

**Reset 2026-09-30 (keputusan owner, Decision Log 2026-09-30).** Roadmap lama mengukur "progres menuju go-live 1.0". Tujuan itu tercapai di `v1.0.0` (2026-09-23), sehingga tabelnya **dibekukan pada 88,5%** di [roadmap-mvp.md](./roadmap-mvp.md) beserta seluruh evidence per fase. Tabel di bawah hanya berisi fase **pasca-MVP**, termasuk dua fase lama yang masih berjalan (MD-08, OPS-02). Fase yang belum pernah punya scope dipindah ke [Parkir](#parkir). Akibatnya Roadmap % mulai dari angka rendah. Angka itu tidak turun karena kemunduran: yang diukur kini rencana 2026–2027.

**Pembagian peran dokumen:** roadmap = **tema & fase per kuartal** (apa dan kapan, kasar), sedangkan [sprint.md](./sprint.md) (menu Data Analyst › Rencana Pengembangan) = **butir issue per rilis** (rinci). Jangan menyalin daftar issue rilis ke sini, cukup rujuk fase dan issue induknya.

Format: **Linimasa** per kuartal → **tabel indeks Phase Status** → **rincian per phase** (evidence + next step) di `<details>` per item → **Parkir**.

### Aturan Tata Kelola

- **Phase Status adalah source of truth** untuk reporting management dan planning developer.
- Status fase hanya boleh naik jika implementasi bisa diverifikasi lewat file/code, route, schema, server action, test, atau workflow.
- Changelog tidak boleh dijadikan bukti status selesai; changelog hanya catatan historis.
- Placeholder `Coming soon` tidak dihitung sebagai implementasi feature.
- Script/debug tool tidak dihitung sebagai implementasi UI/module, kecuali phase memang scope-nya CLI/tooling.
- Jika status berubah karena audit code, catat di **Decision Log**.
- **Menambah fase baru** (termasuk menaikkan fase dari Parkir) wajib punya scope tertulis (issue induk), peminta, dan slot horizon. Pengecualian: modul dari [Visi Produk](#visi-produk) boleh masuk sebagai 🔲 Planned sebelum ada issue, asalkan Next step pertamanya = *concept note* + issue induk. Karena penyebutnya berubah, catat di Decision Log dan perbarui baris `metrics.md` pada siklus yang sama.
- **Review roadmap:** tengah tahun (**Juni 2027**, isi ulang Semester 2) dan akhir tahun (**Desember 2027**, reset menjadi roadmap 2028 dengan pola yang sama).

### Definisi

<details>
<summary><strong>Status Definition</strong> — arti ✅ Done · 🟠 Partial · 🔲 Not Started · 🔲 Planned · 🔴 Blocked</summary>

| Status         | Arti                      | Kapan Dipakai                                                           |
| -------------- | ------------------------- | ----------------------------------------------------------------------- |
| ✅ Done        | Selesai dan terverifikasi | Schema/route/action/UI tersedia sesuai completion criteria minimal      |
| 🟠 Partial     | Sebagian ada              | Ada sebagian implementasi, tetapi belum cukup untuk dianggap selesai    |
| 🔲 Not Started | Belum dimulai             | Route/schema/action utama belum ada, tetapi phase masuk prioritas dekat |
| 🔲 Planned     | Masuk roadmap             | Belum ada implementasi dan belum menjadi prioritas rilis berjalan       |
| 🔴 Blocked     | Terhambat                 | Ada dependency atau kondisi yang membuat phase belum layak dieksekusi   |

</details>

<details>
<summary><strong>Horizon Definition</strong> — Done · Now (K4 2026) · Next (S1 2027) · Later (S2 2027) · Blocked</summary>

| Horizon | Arti                                   | Aturan                                                        |
| ------- | -------------------------------------- | ------------------------------------------------------------- |
| Done    | Selesai                                | Semua completion criteria fase sudah terpenuhi               |
| Now     | **Kuartal 4 2026** (Okt–Des)           | Sudah dijadwalkan ke rilis di [sprint.md](./sprint.md)        |
| Next    | **Semester 1 2027** (Jan–Jun)          | Scope ada; dijadwalkan ke rilis saat Now selesai              |
| Later   | **Semester 2 2027** (Jul–Des)          | Diisi ulang pada review tengah tahun Juni 2027                |
| Blocked | Tidak bisa dieksekusi sehat            | Perlu dependency/keputusan/phase sebelumnya                   |

Kuartal target per fase dirinci di [Linimasa](#linimasa); kolom Horizon tetap memakai lima nilai di atas karena dibaca parser.

</details>

<details>
<summary><strong>Bobot Definition</strong> — arti kolom <code>Bobot</code>: inti (×2) · pendukung (×1)</summary>

Bobot dipakai formula **Roadmap %** ([standards/versioning.md](../standards/versioning.md) §Metrik Nilai Rilis): skor fase (✅ = 1, 🟠 = 0,5, sisanya 0) dikali bobotnya, dibagi total bobot maksimum.

| Bobot     | Pengali | Arti                                                                                               |
| --------- | ------- | -------------------------------------------------------------------------------------------------- |
| inti      | ×2      | **Komitmen roadmap 2026–2027** yang dilaporkan ke manajemen/donor: keamanan & performa prod, kualitas data, Supply Chain, Fire Alert, NKT |
| pendukung | ×1      | Pelengkap/operasional: DevOps, analitik lanjutan, layer peta tambahan, uji skala                   |

Kolom ini adalah **satu-satunya sumber klasifikasi** (dibaca mesin oleh section Detail Roadmap di dashboard Metrik Rilis). Mengubah bobot sebuah fase = mengubah baseline → wajib dicatat di Decision Log.

**Baseline 2026-09-30:** 26 fase. Inti 9 fase = 2/18 poin (PLATFORM-08 🟠, MD-08 🟠); pendukung 17 fase = 1/17 (OPS-02 🟠, DA-09 🟠) → **3/35 = 8,6%**. Modul Visi Produk yang belum punya concept note sengaja diberi bobot `pendukung`; naikkan ke `inti` saat ia dijadikan komitmen di review Juni 2027 (catat di Decision Log). Baseline MVP sebelumnya (51 fase, 80,5/91 = 88,5%) diarsipkan di [roadmap-mvp.md](./roadmap-mvp.md).

</details>

<details>
<summary><strong>Stream Definition</strong> — arti prefix pada format phase <code>STREAM-NN</code></summary>

Format phase: `STREAM-NN`. Nomor melanjutkan nomor terakhir stream di arsip MVP, jadi satu kode tidak pernah dipakai untuk dua hal.

| Stream   | Arti                    | Cakupan                                                                                     |
| -------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| PLATFORM | Platform Foundation     | Auth, RBAC, keamanan akses, performa query, skala data                                      |
| OPS      | Operations & DevOps     | Jalur rilis, workflow deploy, guard migrasi, rollback                                       |
| DQ       | Kualitas Data           | Perbaikan massal & import data prod (skrip idempoten, dump → dry-run → approval → write)   |
| DA       | Data Analyst            | Analitik & pemeriksaan data di aplikasi: anomali, ketersediaan data, tumpang tindih lahan   |
| SC       | Supply Chain            | Rantai pasok Petani → Offtaker → Mill (declared supply base), epic #379                    |
| GIS      | GIS Integrations        | Integrasi & publikasi data spasial: kebakaran (Fire Alert), deforestasi, banjir & bahaya, GeoServer |
| FORM     | Formulir Lapangan       | Form monitoring & survei di aplikasi (pengganti import Excel per jenis form)                |
| MD       | Master Data             | Entitas & modul domain: NKT, sertifikasi, workplan, akses pembiayaan, GRK, HSE, pertanian regeneratif |
| MAP      | Geospatial Map Explorer | Layer & fitur peta                                                                          |

</details>

### Linimasa

Satu baris per kuartal. Rilis K4 2026 mengikuti [sprint.md](./sprint.md). Rilis 2027 sengaja belum diberi nomor/tanggal, karena ditetapkan saat masuk horizon Now.

| Kuartal | Tema | Fase | Rilis / tenggat |
| ------- | ---- | ---- | --------------- |
| **K4 2026** (Okt–Des) | Pengerasan pasca-MVP | PLATFORM-08 · PLATFORM-09 · OPS-02 · DQ-01 · DA-09 · GIS-01 (langkah awal #290) | **v1.3.0** 09-30 → 10-25 |
| | Supply Chain | SC-01 · SC-02 · SC-03 | **v1.4.0** 10-26 → 11-08 (prasyarat: lisensi UML #379) |
| | Penyangga akhir tahun | tuntaskan PLATFORM-08 & DA-09 + concept note GIS-02/MD-12 + limpahan | **v1.5.0** 11-09 → 12-20 |
| **K1 2027** (Jan–Mar) | Siap musim kemarau 2027 | GIS-01 · DA-05 | Fire Alert tuntas sebelum musim kemarau 2027 (#286) |
| **K2 2027** (Apr–Jun) | NKT, deforestasi & sertifikasi | MD-08 · GIS-02 · MD-12 · DA-08 · MAP-04 | **Review tengah tahun Juni 2027**; concept note modul S2 selesai |
| **S2 2027** (Jul–Des) | Visi produk lingkar luar + skala data 2028 | PLATFORM-10 · FORM-01 · MD-11 · MD-07 · MD-10 · MD-13 · MD-14 · MD-15 · MD-16 · GIS-03 · GIS-04 | Dipilih di review Juni; **reset roadmap 2028 Desember 2027** |

**Kapasitas:** pengembangan dikerjakan satu orang di sela cleaning data dan kunjungan distrik. Sebelas fase Semester 2 **tidak akan selesai semuanya**. Review Juni 2027 memilih 2–3 yang dijadikan komitmen (bobot naik ke `inti`), sisanya bergeser ke roadmap 2028.

### Phase Status (Indeks)

Rincian evidence & next step tiap phase ada di [Rincian per Phase](#rincian-per-phase) di bawah.

Tabel ini **diparse saat build** (`src/lib/roadmap.ts`) untuk section **Detail Roadmap** di dashboard Metrik Rilis: urutan kolom, nilai Status/Horizon/Bobot, dan keunikan kode fase wajib sesuai Definisi di atas — format menyimpang membuat build & test gagal. Roadmap % pada [metrics.md](./metrics.md) dihitung ulang dari tabel ini oleh unit test (toleransi 0,1 pp).

| Phase       | Deskripsi                                                  | Status         | Horizon | Bobot     |
| ----------- | ---------------------------------------------------------- | -------------- | ------- | --------- |
| PLATFORM-08 | Pengerasan keamanan & RBAC pasca-MVP                       | 🟠 Partial     | Now     | inti      |
| PLATFORM-09 | Performa sebelum data membesar                             | 🔲 Not Started | Now     | inti      |
| OPS-02      | DevOps: jalur rilis, guard migrasi & rollback              | 🟠 Partial     | Now     | pendukung |
| DQ-01       | Perbaikan massal data prod                                 | 🔲 Not Started | Now     | inti      |
| DA-09       | Tumpang tindih lahan: laporan lengkap, guard upload, layer peta | 🟠 Partial | Now     | pendukung |
| SC-01       | Supply Chain: master Mill/Offtaker + import survei         | 🔲 Not Started | Now     | inti      |
| SC-02       | Supply Chain: peta rantai pasok + report                   | 🔲 Not Started | Now     | inti      |
| SC-03       | Supply Chain: analisa volume, jarak & risiko Mill          | 🔲 Not Started | Now     | pendukung |
| GIS-01      | Fire Alert siap musim kemarau 2027                         | 🔲 Not Started | Next    | inti      |
| DA-05       | Deteksi anomali data produksi                              | 🔲 Planned     | Next    | pendukung |
| MD-08       | HCV/NKT: area NKT & patok NKT                              | 🟠 Partial     | Next    | inti      |
| DA-08       | Ketersediaan data lanjutan                                 | 🔲 Planned     | Next    | pendukung |
| MAP-04      | Peta BMP: layer Monev BMP                                  | 🔲 Planned     | Next    | pendukung |
| GIS-02      | GIS Deforestation: deteksi deforestasi lahan & boundary    | 🔲 Planned     | Next    | inti      |
| MD-12       | Certification: modul sertifikasi RSPO/ISPO                 | 🔲 Planned     | Next    | inti      |
| PLATFORM-10 | Uji skala data produksi 2028                               | 🔲 Planned     | Later   | pendukung |
| FORM-01     | Monitoring & Survey Form di aplikasi                       | 🔲 Planned     | Later   | pendukung |
| MD-11       | Project Management: Workplan Tracker                       | 🔲 Planned     | Later   | pendukung |
| MD-07       | Project Management: Staff Activity                         | 🔲 Planned     | Later   | pendukung |
| MD-10       | Project Management: Impact Indicator                       | 🔲 Planned     | Later   | pendukung |
| MD-13       | Access to Finance: pinjaman, pendanaan, unit usaha         | 🔲 Planned     | Later   | pendukung |
| MD-14       | GHG Emission: emisi GRK per lahan & Lembaga                | 🔲 Planned     | Later   | pendukung |
| MD-15       | HSE: Health, Safety & Environment                          | 🔲 Planned     | Later   | pendukung |
| MD-16       | Regenerative Agriculture (tema)                            | 🔲 Planned     | Later   | pendukung |
| GIS-03      | GIS Flood & Hazard (opsional)                              | 🔲 Planned     | Later   | pendukung |
| GIS-04      | GeoServer: publikasi layer MIS (WMS/WFS) & raster referensi | 🔲 Planned    | Later   | pendukung |

### Rincian per Phase

#### Kuartal 4 2026 — Now

<details>
<summary><strong>PLATFORM-08</strong> · 🟠 Partial — Pengerasan keamanan & RBAC pasca-MVP</summary>

- **Evidence:** v1.2.0 (2026-09-29): struktur menu dikunci dari UI (#364), reaktivasi menu (#237), kunci berkas bukti pelatihan & path unggahan S3 divalidasi (#385), user nonaktif tak lagi berscope `ALL` (#252), data nyata di contoh repo diganti (#383). Di `mvp` (belum dirilis): role/`isActive` di JWT dibaca ulang berkala (#342, `src/lib/auth-role-refresh.ts` + test), akun seed fiktif + password dari `SEED_USER_PASSWORD` (#390, `5028ffd` + `seed-data-privacy.test.ts`).
- **Next step:** v1.3.0: smoke lokal + retro #342, rotasi akun staging/prod yang memakai password seed lama (#390, owner/DevOps), rotasi key FIRMS (#286 butir 2). v1.5.0: celah RBAC laten filter vs scope & eskalasi role Settings Users (#386), guard filter Peta BMP (#384 — `src/server/actions/map.ts` masih memakai `map-parcel`).
- **Selesai bila:** #342, #390, #386, #384 ditutup; tidak ada temuan keamanan P1 terbuka.

</details>

<details>
<summary><strong>PLATFORM-09</strong> · 🔲 Not Started — Performa sebelum data membesar</summary>

- **Evidence:** #251 kode ✅ (di `mvp`, belum dirilis): migrasi `20260930120000_production_record_parcel_period_idx` — `(parcelId, period)` menggantikan `parcelId`, `isActive` tunggal dibuang; diukur 840.960 baris sintetis (Peta BMP 182 → 116 ms, `docs/database/indexes.md` §Pengukuran ProductionRecord). Produksi diproyeksikan tumbuh ±85× menuju 2028 (grain diputuskan 1 baris/lahan/bulan, Decision Log 2026-09-30).
- **Next step:** v1.3.0: migrasi #251 ke staging/prod (status fase naik ke 🟠 saat rilis, bersama baris `metrics.md`), lazy-load titik patok Detail Lembaga/Petani (#335 ✅ kode), agregat `getFarmerSummary` ke SQL (#253), memo izin per sesi di `/api/map-basemap` (#320 ✅ kode).
- **Selesai bila:** keempat issue ditutup dengan angka sebelum/sesudah tercatat.

</details>

<details>
<summary><strong>OPS-02</strong> · 🟠 Partial — DevOps: jalur rilis, guard migrasi & rollback</summary>

- **Evidence:** Dockerfile, 5 workflow (`gitleaks`, `semgrep`, `deploy-dev`, `deploy-staging`, `deploy-main`); alur `mvp → staging → main` aktif sejak v0.32.0; RAM staging 4 GB sehingga build tak lagi OOM (#363, 2026-09-30). Migrasi DB masih manual sebelum merge; `deploy-staging.yml` kini berhenti di guard `prisma migrate status` sebelum build bila skema tertinggal (#277). Prosedur rollback tertulis di `docs/standards/rollback.md` (#232); jalur migrasi digladi 2026-09-30 di `mis-staging-local`. Tooling internal pemantau pengembangan juga dicatat di fase ini: **Metrik Rilis** (`dashboard-metrics`, #227/#250; penyesuaian pasca-reset = #392) dan **Rencana Pengembangan** (`data-analyst-sprint`, #378/#389).
- **Next step:** guard `migrate status` yang sama untuk `deploy-main.yml` (#394, butuh persetujuan owner). v1.3.0: uji rollback aplikasi di staging (#232, TC-232-01) — prosedur sudah tertulis di `docs/standards/rollback.md` dan jalur migrasinya digladi 2026-09-30.
- **Selesai bila:** #277 (✅ kode), #376 (✅ kode: `npm run migrations:release-gap`), #232 ditutup; satu rollback staging berhasil diuji dan dicatat.

</details>

<details>
<summary><strong>DQ-01</strong> · 🔲 Not Started — Perbaikan massal data prod</summary>

- **Evidence:** Belum ada skrip perbaikan. Temuan DA-02: tanggal lahir tertukar hari/bulan ±5.400 petani (#354); import surat/STDB/luas Detail Lahan Siak ditahan (#366).
- **Next step:** v1.3.0: skrip idempoten #354 (dry-run per Lembaga di local → staging-local → dump prod → dry-run prod → approval → `--write`); #366 keputusan A1 · B1 · D1 (token STDB pra-terbit, konversi m²→Ha, pecah nomor surat berdaftar). Keputusan data terbuka #334, #373 ikut ditutup di sini.
- **Selesai bila:** #354 dan #366 terterapkan di prod dengan backup + laporan jumlah; skor Ketersediaan Data terkait naik.

</details>

<details>
<summary><strong>DA-09</strong> · 🟠 Partial — Tumpang tindih lahan: laporan lengkap, guard upload, layer peta</summary>

- **Evidence:** #317 Fase 1: `LandParcel.geom` GENERATED + GiST (v0.35.0). Fase 2 (sebagian): menu Data Analyst › Tumpang Tindih Lahan (`data-analyst-parcel-overlap`), self-join 256 ms / 14.174 lahan, dirilis v1.2.0.
- **Next step:** v1.3.0: tab Luar Boundary & Selisih Luas (sisa Fase 2) — pakai ulang check DA-02 `persil-di-luar-boundary` & `luas-beda-geometri` (`src/lib/data-completeness-registry.ts`) agar satu definisi, Fase 3 guard saat upload shapefile bila waktu cukup. Fase 4 layer tumpang tindih di Peta Lahan → v1.5.0.
- **Selesai bila:** keempat fase #317 selesai dan #317 ditutup.

</details>

<details>
<summary><strong>SC-01</strong> · 🔲 Not Started — Supply Chain: master Mill/Offtaker + import survei</summary>

- **Evidence:** Belum ada model. Epic #379 dibuat 2026-09-29; prasyarat lisensi Universal Mill List & ketersediaan berkas survei 2025 per Lembaga masih ⚖️.
- **Next step:** v1.4.0 (#380): migrasi `Mill`/`BuyerProgram`/`Offtaker`/`SupplyChainSurvey`/`SupplyChainRecord`, Master Data Mill/Offtaker/Rantai Pasok, Bulk Upload Rantai Pasok (cocok Parcel ID, review offtaker, cek silang produksi & luas), seed Mill dari UML sesuai keputusan lisensi.
- **Selesai bila:** survei minimal satu Lembaga terimport di prod dan terbaca di Master Data.

</details>

<details>
<summary><strong>SC-02</strong> · 🔲 Not Started — Supply Chain: peta rantai pasok + report</summary>

- **Evidence:** Belum ada.
- **Next step:** v1.4.0 (#381): garis alir Lahan → Offtaker → Mill (tebal = tonase, agregasi per KT/Lembaga saat zoom jauh), panel "tidak tergambar", Report + ekspor Excel.
- **Selesai bila:** #381 ditutup; Bantuan tutorial peta & report tersedia.

</details>

<details>
<summary><strong>SC-03</strong> · 🔲 Not Started — Supply Chain: analisa volume, jarak & risiko Mill</summary>

- **Evidence:** Belum ada.
- **Next step:** v1.4.0 (#382): jarak garis lurus `ST_PointOnSurface`, ketergantungan offtaker (ambang ⚖️), risiko NKT & tumpang tindih per Mill (memakai MD-08 & DA-09).
- **Selesai bila:** #382 ditutup.

</details>

#### Semester 1 2027 — Next

<details>
<summary><strong>GIS-01</strong> · 🔲 Not Started — Fire Alert siap musim kemarau 2027</summary>

- **Evidence:** Fire Alert live (DASH-07 arsip); laporan bulanan #365 kodenya ✅ tetapi issue masih open menunggu verifikasi owner di prod. Rentang 30 hari masih bergantung rentang 30 hari masih bergantung cache Next (>2 MB) dan payload tanpa batas (#286 butir 1 & 3).
- **Next step:** basemap harian NASA GIBS mengikuti tanggal titik api (#290) sudah dijadwalkan di **v1.3.0**. K1 2027: cache FIRMS sendiri + batas payload rentang 30 hari (#286), basemap Sentinel-2 10 m via CDSE dengan cache wajib karena kuota (#291). #286 dan #291 dirancang bersama.
- **Selesai bila:** tiga issue ditutup **sebelum musim kemarau 2027** dan uji beban rentang 30 hari tercatat.

</details>

<details>
<summary><strong>DA-05</strong> · 🔲 Planned — Deteksi anomali data produksi</summary>

- **Evidence:** Belum ada deteksi ambang produktivitas (kg/Ha). Check dasar sudah ada di registri DA-02: `produksi-nol` & `produksi-bulan-bolong` (`src/lib/data-completeness-registry.ts`) — DA-05 menambah, bukan membangun ulang. Kode fase DA-05 sudah dipesan sejak #178, tetapi belum pernah masuk Phase Status.
- **Next step:** ⚖️ owner menjawab 3 pertanyaan terbuka di #178 (ambang default < 500 kg/Ha, unit lahan×bulan, tindak lanjut), lalu implementasi K1 2027 — sebaiknya sesudah PLATFORM-09 (#251) karena memindai seluruh `ProductionRecord`.
- **Selesai bila:** #178 ditutup; anomali tampil sebagai daftar kerja per Lembaga.

</details>

<details>
<summary><strong>MD-08</strong> · 🟠 Partial — HCV/NKT: area NKT & patok NKT</summary>

- **Evidence:** status NKT per lahan (#328), patok batas lahan M:N + kode unik (#329–#331), Laporan NKT per Lembaga PDF (#332), import NKT KPUD Intan Makmur 319/319 lahan ke prod. Konsep "patok lahan NKT" turunan dihapus di #345 tahap 1.
- **Next step:** K2 2027: #345 tahap 2, patok NKT sebagai tipe sendiri (`purpose BATAS_LAHAN|NKT`, dari buffer sungai/GPS lapangan), lalu layer poligon area NKT + deteksi spasial. Riwayat asesmen per tahun & dokumen asesmen (S3) hanya bila data asesmen Lembaga lain tersedia.
- **Selesai bila:** #345 ditutup dan area NKT tampil sebagai poligon di Peta Lahan.

</details>

<details>
<summary><strong>DA-08</strong> · 🔲 Planned — Ketersediaan data lanjutan</summary>

- **Evidence:** DA-02/DA-03 selesai di arsip MVP (#352). Tiga lanjutan keputusan #352 belum dikerjakan.
- **Next step:** K2 2027: nilai eksplisit `NONE` sertifikasi agar "belum diisi" ≠ "tidak bersertifikat" (#355), bobot cakupan modul ke Index (#356), peta kesiapan data per Lembaga (#358).
- **Selesai bila:** #355, #356, #358 ditutup.

</details>

<details>
<summary><strong>MAP-04</strong> · 🔲 Planned — Peta BMP: layer Monev BMP</summary>

- **Evidence:** Monev BMP live sejak v0.36.0 (skor per petani + 32 indikator); layer peta ditunda saat keputusan penempatan #344.
- **Next step:** K2 2027 (#349): warna lahan menurut kategori skor petani pada tahun survei terpilih.
- **Selesai bila:** #349 ditutup.

</details>

<details>
<summary><strong>GIS-02</strong> · 🔲 Planned — GIS Deforestation: deteksi deforestasi lahan & boundary</summary>

- **Evidence:** Belum ada. Fondasi spasial siap: `LandParcel.geom` + GiST, boundary ICS (`FarmerGroupBoundary`), batas administrasi BIG, pola proxy peta ber-guard (`/api/map-*`).
- **Next step:** concept note di v1.5.0; implementasi K2 2027 sesudah GIS-01: issue induk (sumber data tutupan hutan & lisensinya, tahun acuan *cut-off*, ambang luas), lalu overlay perubahan tutupan hutan vs poligon lahan/boundary, daftar lahan terindikasi, layer Peta Lahan. Hasilnya dipakai SC-03 (risiko per Mill).
- **Selesai bila:** setiap lahan punya status indikasi deforestasi yang bisa difilter di Laporan Lahan dan tampil di peta.

</details>

<details>
<summary><strong>MD-12</strong> · 🔲 Planned — Certification: modul sertifikasi RSPO/ISPO</summary>

- **Evidence:** Sebagian data sudah ada: status & tahun RSPO/ISPO/SAP-MAP per Lembaga (#160/#169) + kartu sertifikasi Main Dashboard; legalitas lahan (surat, STDB, UL Parcel Code #296). Belum ada modul sertifikasi (siklus audit, temuan, ICS internal inspection).
- **Next step:** concept note di v1.5.0; implementasi K2 2027: issue induk (skema yang dilayani, unit sertifikasi Lembaga vs petani, dokumen audit di S3), sebelumnya tuntaskan nilai `NONE` (#355, DA-08).
- **Selesai bila:** status, riwayat audit, dan temuan sertifikasi per Lembaga tercatat di aplikasi dan terbaca di dashboard.

</details>

#### Semester 2 2027 — Later

<details>
<summary><strong>PLATFORM-10</strong> · 🔲 Planned — Uji skala data produksi 2028</summary>

- **Evidence:** Proyeksi owner: 12.000 petani + produksi bulanan per lahan 2024–2028 (±900k baris `ProductionRecord`, ±85× hari ini). Belum ada uji beban pada volume itu.
- **Next step:** S2 2027: seed volume sintetis 2028 di DB lokal, ukur dashboard/report/snapshot yang memindai produksi, putuskan snapshot atau partisi bila ambang terlewati. Bergantung PLATFORM-09.
- **Selesai bila:** laporan ukur tercatat di `docs/database/performance.md` dan tidak ada halaman > ambang yang disepakati.

</details>

Fase di bawah ini berasal dari [Visi Produk](#visi-produk) dan **belum punya concept note**. Evidence semuanya "belum ada"; langkah pertama masing-masing = concept note + issue induk sebelum review Juni 2027.

<details>
<summary><strong>FORM-01</strong> · 🔲 Planned — Monitoring & Survey Form di aplikasi</summary>

- **Evidence:** Belum ada form generik. Data lapangan masuk lewat import Excel per jenis form (Monev BMP 192 form, Bulk Upload); kehadiran pelatihan sudah tercatat (Attendance Record di diagram).
- **Next step:** Concept note: form builder vs form per modul, pengisian online vs offline (terkait epic mobile #192 di Parkir), siapa pengisinya.
- **Selesai bila:** minimal satu form monitoring diisi langsung di aplikasi tanpa Excel perantara.

</details>

<details>
<summary><strong>MD-11</strong> · 🔲 Planned — Project Management: Workplan Tracker</summary>

- **Evidence:** Belum ada. Kode MD-11 sama dengan fase "Workplan" di arsip MVP (dinaikkan dari Parkir 2026-09-30). Satu kelompok Project Management dengan MD-07 Staff Activity dan MD-10 Impact Indicator.
- **Next step:** Concept note: rencana kerja per Lembaga/program, indikator & target, keterkaitan dengan kegiatan pelatihan/Monev yang sudah tercatat.
- **Selesai bila:** rencana kerja dan progresnya bisa dipantau di aplikasi.

</details>

<details>
<summary><strong>MD-07</strong> · 🔲 Planned — Project Management: Staff Activity</summary>

- **Evidence:** Belum ada. Kode MD-07 sama dengan fase "Staff" di arsip MVP; owner 2026-09-30 menjelaskan isinya = tools aktivitas staf di bawah Project Management (dinaikkan dari Parkir).
- **Next step:** Concept note bersama MD-11: aktivitas staf/fasilitator (kunjungan lapangan, pendampingan, pelatihan yang difasilitasi) terhadap rencana kerja; apakah staf = `User` yang sudah ada atau entitas sendiri.
- **Selesai bila:** aktivitas staf tercatat dan bisa direkap per staf, Lembaga, dan periode.

</details>

<details>
<summary><strong>MD-10</strong> · 🔲 Planned — Project Management: Impact Indicator</summary>

- **Evidence:** Belum ada modul. Sebagian angka indikator sudah bisa dihitung dari data yang ada (cakupan pelatihan, kategori Monev BMP, produktivitas, sertifikasi). Kode MD-10 sama dengan fase "IMPACT" di arsip MVP (dinaikkan dari Parkir).
- **Next step:** Concept note bersama MD-11: daftar indikator dampak program (kerangka log/donor), target per periode, mana yang dihitung otomatis dari modul lain vs diisi manual.
- **Selesai bila:** indikator dampak dan capaiannya terhadap target tampil per periode.

</details>

<details>
<summary><strong>MD-13</strong> · 🔲 Planned — Access to Finance: pinjaman, pendanaan, unit usaha</summary>

- **Evidence:** Belum ada.
- **Next step:** Concept note: jenis pembiayaan (pinjaman, hibah, unit usaha Lembaga), data sensitif apa yang boleh disimpan. Konfirmasi apakah MD-09 BUSDEV di Parkir tercakup di sini.
- **Selesai bila:** akses pembiayaan per petani/Lembaga tercatat dan terlapor.

</details>

<details>
<summary><strong>MD-14</strong> · 🔲 Planned — GHG Emission: emisi GRK per lahan & Lembaga</summary>

- **Evidence:** Belum ada. Bahan tersedia: luas & umur tanaman lahan, produksi bulanan, status NKT.
- **Next step:** Concept note: metodologi (mis. kalkulator RSPO PalmGHG atau lainnya), cakupan emisi, data yang belum dikumpulkan (pupuk, lahan gambut).
- **Selesai bila:** estimasi emisi per Lembaga terhitung dengan metodologi terdokumentasi.

</details>

<details>
<summary><strong>MD-15</strong> · 🔲 Planned — HSE: Health, Safety & Environment</summary>

- **Evidence:** Belum ada.
- **Next step:** Concept note: indikator HSE yang dipantau (insiden, APD, pestisida), sumber datanya (terkait FORM-01).
- **Selesai bila:** indikator HSE per Lembaga tercatat dan terlapor.

</details>

<details>
<summary><strong>MD-16</strong> · 🔲 Planned — Regenerative Agriculture (tema)</summary>

- **Evidence:** Belum ada; baru tema program, **concept note belum ada** (owner, 2026-09-30).
- **Next step:** Tunggu concept note program; lalu tentukan apakah ia modul sendiri atau perluasan Monev BMP ("Advanced BMP" di diagram).
- **Selesai bila:** ditentukan saat concept note tersedia.

</details>

<details>
<summary><strong>GIS-03</strong> · 🔲 Planned — GIS Flood & Hazard (opsional)</summary>

- **Evidence:** Belum ada. Pola integrasi dapat meniru Fire Alert (proxy ber-guard + klasifikasi terhadap boundary).
- **Next step:** Concept note: sumber data banjir/bahaya (mis. peta rawan bencana nasional), pemakaiannya (laporan risiko per Lembaga).
- **Selesai bila:** lahan/Lembaga di zona rawan teridentifikasi di peta dan laporan.

</details>

<details>
<summary><strong>GIS-04</strong> · 🔲 Planned — GeoServer: publikasi layer MIS (WMS/WFS) & raster referensi</summary>

- **Evidence:** Belum ada server peta. Aplikasi baru *mengonsumsi* WMS pihak ketiga (overlay Kawasan Hutan & Gambut via `/api/map-overlay`, form "Tambah Data GIS Lain" di Peta Lahan). Layer MIS hanya bisa diunduh sebagai berkas SHP/GeoJSON/KML (#313).
- **Next step:** Concept note: (a) layer MIS apa yang diterbitkan (lahan, boundary, NKT, patok) dan untuk siapa (QGIS internal, mitra, publik); (b) autentikasi agar RBAC & access-context tetap berlaku (proxy ber-guard, bukan GeoServer terbuka); (c) hosting raster untuk GIS-02/GIS-03; (d) server & RAM (bandingkan kasus OOM staging #363). **Bila GIS-02 butuh raster self-hosted, fase ini maju ke K2 2027.**
- **Selesai bila:** minimal satu layer MIS bisa dibuka di QGIS lewat WMS/WFS ber-autentikasi, tanpa membocorkan data di luar scope pengguna.

</details>

### Visi Produk

Pemetaan diagram modul MIS (lingkar inti, prioritas MVP, lingkar luar) ke fase. Setiap modul di diagram harus punya tempat di sini: Done (arsip MVP), fase aktif, atau Parkir. Kolom **Status** menggambarkan **kondisi modulnya di aplikasi**, bukan status fase: Fire "live" tetapi fase pengerasannya GIS-01 belum mulai; Certification sudah punya kolom status tetapi fase modulnya MD-12 belum mulai.

| Modul diagram | Status | Fase |
| ------------- | ------ | ---- |
| Inti: User, Region, Institution/Stakeholder, Access Right, Farmer, Land Parcel | ✅ Done | Arsip MVP (PLATFORM-04, MD-01…04) |
| Prioritas MVP: Dashboard, Training, BMP | ✅ Done | Arsip MVP (DASH-01…08, MD-05/06); lanjutan MAP-04 |
| Attendance Record | ✅ Done | Arsip MVP (MD-05 peserta pelatihan) |
| HCV | 🟠 Partial | MD-08 |
| Supply Chain | 🔲 | SC-01 · SC-02 · SC-03 |
| GIS: Fire | ✅ live, pengerasan | GIS-01 |
| GIS: Deforestation | 🔲 | GIS-02 |
| GIS: Flood, Hazard (opsional) | 🔲 | GIS-03 |
| GeoServer (tambahan owner, di luar diagram) | 🔲 hanya klien WMS eksternal | GIS-04 |
| Certification | 🟠 kolom status saja | MD-12 |
| Project Management: Workplan Tracker, Staff Activity, Impact Indicator | 🔲 | MD-11 · MD-07 · MD-10 |
| Monitoring Form, Survey Form | 🔲 import Excel saja | FORM-01 |
| Access to Finance | 🔲 | MD-13 |
| GHG Emission | 🔲 | MD-14 |
| HSE | 🔲 | MD-15 |
| Regenerative Agriculture (tema baru, di luar diagram) | 🔲 | MD-16 |
| Advanced BMP (ide) | 🅿️ | Parkir |
| ICS Landing Page (TBD after RC) | 🅿️ | Parkir (CMS-01) |

### Parkir

Daftar fase dan epic yang **tidak dihitung** di Roadmap % karena belum punya scope, peminta, atau keputusan. Isinya tetap tersimpan agar tidak hilang. Fase naik kembali ke Phase Status bila memenuhi aturan tata kelola (issue induk + peminta + slot horizon + Decision Log). Rincian lama tiap fase ada di [roadmap-mvp.md](./roadmap-mvp.md).

| Kode / Issue | Isi | Alasan diparkir |
| ------------ | --- | --------------- |
| MD-09 | BUSDEV | Kemungkinan tercakup MD-13 Access to Finance; hapus dari sini bila dikonfirmasi |
| BULK-02 | Bulk Upload Region & Lembaga/KT | #69/#70 ditutup *not planned* 2026-06-28; Region & Lembaga cukup lewat form |
| TOOLS-01 | GIS Utilities & manajer S3 di aplikasi | Utilitas CLI sudah ada (`s3:get-link`, `pdf:*`); versi in-app belum punya issue/peminta |
| CMS-01 | CMS & ICS Landing Page | Di Visi Produk: "ICS Landing Page — TBD after RC"; halaman publik baru placeholder |
| — | Advanced BMP (ide) | Ide di Visi Produk; dinilai bersama MD-16 Regenerative Agriculture |
| COMM-01 | Community | Belum ada scope |
| COMM-02 | i18n | Belum ada scope; UI tetap Bahasa Indonesia |
| #192 | Epic API layer & offline sync aplikasi mobile | ⚖️ masih direncanakan? Bila tidak, close *not planned* |
| #124 | Overlay citra Planet NICFI di Peta Lahan | ⚖️ masih direncanakan? Bila tidak, close *not planned* |
| #261 | Cakupan pemetaan pohon (286 baris vs ±3,5 juta) | ⚖️ keputusan cakupan, bukan kode |

Butir kecil (kerapian, UX, temuan audit) tetap di **Backlog** [sprint.md](./sprint.md), bukan di roadmap.
