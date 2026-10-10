# Proyek — Biweekly Management Brief

> Bagian dari dokumentasi **Proyek**. Indeks: [../README.md](../README.md) · Terkait: [roadmap.md](./roadmap.md) · [sprint.md](./sprint.md) · [tech-debt.md](./tech-debt.md) · [changelog.md](./changelog.md) · [contributing.md](./contributing.md)

> Dokumen kerja untuk memantau delivery Smallholder HUB. Status di dokumen ini disinkronkan terhadap **file dan code yang benar-benar ada di repository**, bukan berdasarkan klaim changelog historis.

**Last updated:** 2026-10-10 · **Next management review:** 2026-10-13

**Perubahan terakhir (2026-10-10):** ditulis ulang untuk periode **2026-09-30 s.d. 2026-10-10** — lima rilis (v1.3.0 · v1.4.0 · v1.5.0 · v1.5.1 hotfix · v1.6.0) dan baseline **Roadmap 2026–2027** (reset 2026-09-30; baseline MVP 88,5% beku di [roadmap-mvp.md](./roadmap-mvp.md)). Brief sebelumnya (periode v0.35.0 → v1.1.0) ada di riwayat git.

**Source of truth:** tabel **Phase Status** di [`roadmap.md`](./roadmap.md). **Panduan update & checklist:** [`contributing.md`](./contributing.md).

**Audit basis:** source code, Prisma schema, route files, server actions, scripts, GitHub workflow, status issue GitHub, hasil test lokal, dan lembar run QA di `docs/qa/`.

---

## Brief Manajemen Dua Mingguan

Gunakan section ini untuk presentasi management setiap dua minggu. Section ini sengaja dibuat ringkas: posisi delivery, risiko, keputusan, dan target dua minggu berikutnya.

### Periode Laporan

| Item               | Nilai                                                       |
| ------------------ | ----------------------------------------------------------- |
| Periode laporan    | 2026-09-30 s.d. 2026-10-10                                  |
| Status keseluruhan | 🟢 On Track — **v1.6.0 live di produksi** 2026-10-10 (lima rilis dalam 11 hari, semua lewat gate lokal + QA staging); Roadmap 2026–2027 **18,6%** (dari 8,6% saat reset) |
| Basis review       | Audit docs ↔ code 2026-10-10 (roadmap Phase Status, status issue GitHub, `metrics.md`, run QA v1.6.0 lokal/staging/prod) |
| Test lokal         | ✅ **2.804 test** saat rilis v1.6.0 (dari 2.461 di v1.3.0) · lint 0 error · typecheck ✅ · build ✅ |
| Fokus berikutnya   | **v1.6.1** PATCH (2026-10-11 → 10-25): celah RBAC laten #409 · #386 butir 2 (kode sudah di `mvp`), #384, #387, batch TD #412; lalu **v1.7.0** Supply Chain versi DB (10-26 → 11-08) |

### Ringkasan Eksekutif

| Area                | Status          | Ringkasan                                                                                                                                  |
| ------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Platform foundation | ✅ Ready        | Auth, RBAC 5 role, izin 6 level, menu 3 level (+ grup **Platform Developer** v1.4.0), user & region management. Role/status dibaca ulang dari DB ≤ 1 menit (#342). |
| Master data inti    | ✅ Complete     | Lembaga Petani, Petani, Lahan (+ legalitas, sepadan, NKT, patok, pohon), Pelatihan, Produksi, Monev BMP, **Target Program** (kontrak per paket, v1.4.0). |
| Dashboard           | ✅ Complete     | Main, BMP Produksi (produktivitas **disetahunkan** Ton/Ha/tahun), Pelatihan (+ **Training Benefit per year** & vs Kontrak), Monev BMP, Fire Alert (+ latar satelit harian **GIBS**, v1.5.0), **Rantai Pasok** (prototipe CSV, v1.4.0–v1.6.0). |
| Report              | ✅ Complete     | Petani, Pelatihan, Produksi, Kelompok Tani, Lahan (+ NKT), Patok; Excel per KT/Blok; Profil Petani PDF; istilah seragam "petani terdaftar" (#406). |
| Bulk Upload         | ✅ Complete     | Petani, Produksi (parser tanggal DD/MM diperbaiki, #400), Lahan (shapefile + Detail Lahan; **peringatan tumpang tindih saat upload**, #317 Fase 3), Pohon. BULK-02 diparkir (keputusan 2026-09-30). |
| Map & Data Analyst  | ✅ Complete     | Peta Lahan, Peta BMP, **Peta Rantai Pasok** (prototipe, dirombak v1.6.0); Tumpang Tindih Lahan lengkap 3 tab (#317 Fase 2); Ketersediaan Data, Komparasi, Metrik Rilis per baseline (#392), Rencana Pengembangan per rilis. |
| Bantuan (HELP)      | ✅ Complete     | Panduan in-app tutorial/konsep/referensi (69 berkas materi), dijaga test cakupan menu; 25 koreksi dari audit 2026-10-10. |
| Keamanan            | 🟡 Perlu tindakan | **Hotfix v1.5.1** (2026-10-10): filter scope Lembaga tertimpa key filter literal di beberapa kueri Report/Peta/Data Analyst (#408, kelas BUG-007). Sisa laten → **v1.6.1**: distrik tujuan Lembaga dalam scope (#409) & anti-eskalasi pengelolaan pengguna (#386) — kode sudah di `mvp`, menunggu QA; guard Peta BMP (#384). |
| Data prod           | 🟢 Membaik      | DQ-01: 2.213 tanggal lahir tertukar diperbaiki (#354), Detail Lahan Siak 9 Lembaga (#366; APKASDU ditahan), Monev BMP Kampar 2026 (279 penilaian), tahun tanam/alamat/KT belasan Lembaga diisi dari berkas fasilitator. |
| DevOps              | ✅ Done         | OPS-02 Done: guard `migrate status` di deploy staging & prod (#277/#394), prosedur rollback teruji di staging (#232), RAM staging 4 GB (#363), cek migrasi vs tag (#376). |
| Testing & QA        | ✅ Strong       | Gate lokal lint/build/typecheck/test; paket QA manual per rilis (`docs/qa/`), run prod P0 ≤ 1 jam pasca-deploy; audit `/audit` mingguan + 126 test guard 3 lapis baru. |

### Snapshot Progres

| Metrik         | Jumlah         | Catatan                                              |
| -------------- | -------------- | ---------------------------------------------------- |
| Total phase    | 26 fase        | Roadmap 2026–2027 (reset 2026-09-30): Now 8 · Next 7 · Later 11 |
| ✅ Done        | **1 fase**     | OPS-02 (2026-10-07) |
| 🟠 Partial     | 6 fase         | PLATFORM-08, PLATFORM-09, DQ-01, DA-09, GIS-01, MD-08 |
| 🔲 Not Started | 3 fase         | SC-01, SC-02, SC-03 (Supply Chain — prototipe CSV sudah live, versi DB di v1.7.0) |
| 🔲 Planned     | 16 fase        | Horizon Next/Later (DA-05, DA-08, MAP-04, GIS-02, MD-12, PLATFORM-10, FORM-01, MD-07/10/11/13/14/15/16, GIS-03/04) |
| 🔴 Blocked     | 0 fase         | — |
| Roadmap %      | **18,6%**      | Dihitung dari Phase Status (bobot inti ×2) — [metrics.md](./metrics.md); RVS kumulatif 5.418 |

> Baseline MVP (51 fase, 88,5%) beku di [roadmap-mvp.md](./roadmap-mvp.md). Angka di atas tidak sebanding dengan brief sebelum 2026-09-30.

### Poin Bahasan Manajemen

| Topik               | Pesan Utama                                                              | Dampak                                                                                    |
| ------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Ritme rilis pasca-MVP** 🟢 | Lima rilis dalam 11 hari (v1.3.0 → v1.6.0) dengan gate hijau dan QA staging 0 Fail; rencana kini **per rilis** (bukan mingguan). | Perbaikan sampai ke lapangan dalam hitungan hari; jalur `mvp → staging → main` dan rollback sudah teruji. |
| **Training Benefit & target kontrak** 🟢 | Kartu Training Benefit per year (per paket, kolom tahun bergeser) + target kontrak di DB (Master Data › Target Program) + tampilan vs Kontrak; Excel 3 sheet untuk donor. | Capaian program vs kontrak terbaca langsung dari dashboard, tanpa rekap manual. Angka kontrak prod diisi owner. |
| **Rantai Pasok (prototipe)** 🔵 | Dashboard (4 tampilan aliran, Sorotan, volume per Mill/Lembaga, jarak, Excel) + Peta dari CSV survei 2025 di S3 privat — untuk diskusi, bukan versi final. | Bahan keputusan sebelum SC-01..03 (versi DB, v1.7.0 10-26 → 11-08). Lisensi UML sudah diputuskan (CC BY 4.0). |
| **Keamanan akses** 🟡 | Satu celah kelas BUG-007 ditemukan audit dan ditutup hotfix v1.5.1 hari yang sama; dua celah laten (#409, #386) sudah diperbaiki di `mvp`, dirilis sebagai PATCH v1.6.1 setelah QA. | Tidak ada temuan P1 terbuka; audit mingguan `/audit` menjadi rutin. |
| **Kualitas data prod** 🟢 | DQ-01: tanggal lahir, Detail Lahan Siak, Monev BMP Kampar, tahun tanam & alamat belasan Lembaga sudah masuk prod lewat skrip idempoten (dry-run → persetujuan → tulis). | Dashboard & laporan makin mewakili kondisi lapangan; sisa: APKASDU (ID lahan lama ≠ poligon baru), 82 UL Parcel Code ganda (#395). |
| Delivery confidence | Test 2.461 → 2.804; TD aktif 31 (register dirapikan 2026-10-10, 10 TD cepat jadi #412). | Debt terkendali; tidak ada fase Blocked. |

### Keputusan yang Dibutuhkan

| Keputusan                  | Owner                   | Dibutuhkan Kapan     | Rekomendasi Tech Lead                                                                       |
| -------------------------- | ----------------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| Angka target kontrak program di prod (#403) — belum tercatat terisi di docs | Owner | Sebelum review 2026-10-13 | Isi lewat Master Data › Target Program (tabel DB, tanpa deploy); di staging baru angka fiktif uji (TC-PREP-01 v1.4.0). Tampilan vs Kontrak kosong sampai diisi. |
| APKASDU: berkas Detail Lahan ber-ID lahan baru (#366) | Owner + fasilitator | v1.7.0 | 1.360 baris ditahan karena ID lama ≠ poligon upload ulang 2026-10-02; minta berkas ulang ber-ID baru, jangan dipaksakan. |
| Kelompok Tani HJP & SSJ (KT NULL, nilai "33 F" di Blok, #334) | Owner + fasilitator | v1.7.0 | Tetapkan: KT+Blok tergabung atau kode blok; KPI KT kedua Lembaga = 0 sampai diputuskan. |
| Subdistrict & Village hanya 1 baris (#260) | Owner / Product | Tidak mendesak | Sembunyikan dari form sampai ada data, atau isi dari referensi BPS saat modul wilayah disentuh. |
| ~~Lisensi Universal Mill List & berkas survei (#379)~~ | Owner | ✅ Diputuskan 2026-09-30 | UML = CC BY 4.0; seed Mill lewat `--data` dari folder lokal; prototipe CSV di S3 privat. |

### Dua Minggu ke Depan (2026-10-13 s.d. 2026-10-25)

| Priority | Target                                      | Output                                                                                                        |
| -------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **P1**   | Rilis **v1.6.1** PATCH (#409 ✅ kode, #386 ✅ kode, #384, #387, #412) | QA staging TC-409/TC-386 → prod; #409/#386/#384 ditutup dengan retro → PLATFORM-08 naik mendekati Done |
| **P1**   | Persiapan **v1.7.0** Supply Chain versi DB (#380 → #381 → #382) | Skema Mill/Offtaker/BuyerProgram + import survei; keputusan desain dari diskusi prototipe |
| **P2**   | Kualitas data prod (DQ-01)                  | APKASDU berkas ber-ID baru (#366), 82 UL Parcel Code ganda (#395), KT HJP & SSJ (#334)                       |
| **P2**   | Kerapian & test (#413, #414 — Backlog)      | Test cermin → modul asli (TD-050); `ActionResult` pisah `error`/`fieldErrors` (TD-010) — ditarik ke rilis bila ada kapasitas |

Rincian per rilis: [sprint.md](./sprint.md).
