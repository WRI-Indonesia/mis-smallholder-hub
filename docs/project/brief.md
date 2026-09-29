# Proyek — Biweekly Management Brief

> Bagian dari dokumentasi **Proyek**. Indeks: [../README.md](../README.md) · Terkait: [roadmap.md](./roadmap.md) · [sprint.md](./sprint.md) · [tech-debt.md](./tech-debt.md) · [changelog.md](./changelog.md) · [contributing.md](./contributing.md)

> Dokumen kerja untuk memantau delivery Smallholder HUB. Status di dokumen ini disinkronkan terhadap **file dan code yang benar-benar ada di repository**, bukan berdasarkan klaim changelog historis.

**Last updated:** 2026-09-29 · **Next management review:** 2026-10-13

**Perubahan terakhir (2026-09-29):** ditulis ulang setelah audit docs menyeluruh — periode **v0.35.0 → v1.1.0** (2026-09-15 s.d. 2026-09-23), termasuk **v1.0.0 milestone MVP**. Sejak 2026-09-28 pengembangan memakai **sprint mingguan** ([sprint.md](./sprint.md), juga tampil di menu Data Analyst › Sprint Mingguan). Riwayat lengkap → [`changelog.md`](./changelog.md).

**Source of truth:** tabel **Phase Status** di [`roadmap.md`](./roadmap.md). **Panduan update & checklist:** [`contributing.md`](./contributing.md).

**Audit basis:** source code, Prisma schema, route files, server actions, scripts, GitHub workflow, status issue GitHub, dan hasil test lokal.

---

## Brief Manajemen Dua Mingguan

Gunakan section ini untuk presentasi management setiap dua minggu. Section ini sengaja dibuat ringkas: posisi delivery, risiko, keputusan, dan target dua minggu berikutnya.

### Periode Laporan

| Item               | Nilai                                                       |
| ------------------ | ----------------------------------------------------------- |
| Periode laporan    | 2026-09-15 s.d. 2026-09-29                                  |
| Status keseluruhan | 🟢 On Track — **v1.0.0 (MVP) dan v1.1.0 live di produksi** 2026-09-23; Roadmap **88,5%** |
| Basis review       | Audit docs ↔ code 2026-09-29 (roadmap Phase Status, status issue GitHub, `metrics.md`) |
| Test lokal         | ✅ **1.868 test** saat rilis v1.1.0 · lint 0 error · typecheck ✅ · build ✅ |
| Fokus berikutnya   | Sprint 1–2: keamanan akses prod (#364, #342, #237), performa (#252), jalur rilis (#277, #376, #363), rilis **v1.2.0** |

### Ringkasan Eksekutif

| Area                | Status          | Ringkasan                                                                                                                                  |
| ------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Platform foundation | ✅ Ready        | Auth, RBAC 5 role (termasuk DONOR), izin 6 level (termasuk EXPORT/PRINT), menu 3 level, user & region management. |
| Master data inti    | ✅ Complete     | Lembaga Petani, Petani, Lahan (+ legalitas, sepadan, NKT, patok, pohon), Pelatihan, Produksi, **Monev BMP** (skor per petani + 32 indikator). |
| Dashboard           | ✅ Complete     | Main, BMP Produksi, Pelatihan, **Monev BMP**, **Fire Alert** (titik api vs boundary ICS, laporan bulanan). |
| Report              | ✅ Complete     | Petani, Pelatihan, Produksi, Kelompok Tani (Summary/Detail), Lahan (+ Laporan NKT), **Patok**; Excel per KT/Blok; **Profil Petani PDF**. |
| Bulk Upload         | 🟠 Hampir lengkap | Petani, Produksi, Lahan (shapefile + Detail Lahan), Pohon. **BULK-02** (Region & Lembaga/KT) belum ada — issue-nya ditutup *not planned*, perlu keputusan. |
| Map & Data Analyst  | ✅ Complete     | Peta Lahan & Peta BMP; Ringkasan Petani, Ketersediaan Data (per/semua Lembaga), Komparasi Data Acuan, Peta Data & Skema, Metrik Rilis; **Tumpang Tindih Lahan** & **Sprint Mingguan** menunggu rilis v1.2.0. |
| Bantuan (HELP)      | ✅ Complete     | Panduan in-app tutorial/konsep/referensi (65 berkas materi), dijaga test cakupan menu. |
| Keamanan            | 🟡 Perlu tindakan | Akun demo SUPERADMIN mengubah menu prod (#364) dan role di JWT tidak diperbarui sampai login ulang (#342) — dijadwalkan Sprint 1. |
| Testing & QA        | ✅ Strong       | Gate lokal lint/build/typecheck/test; paket QA manual per rilis di `docs/qa/` (smoke + kasus uji + QC data + sign-off). |

### Snapshot Progres

| Metrik         | Jumlah         | Catatan                                              |
| -------------- | -------------- | ---------------------------------------------------- |
| Total phase    | 51 fase        | PLATFORM(7), MD(11), DASH(8), MAP(3), RPT(5), HELP(2), BULK(4), DA(5), TOOLS(1), CMS(1), COMM(2), OPS(2) |
| ✅ Done        | **40 fase**    | Seluruh PLATFORM, MD-01…06, DASH-01…08, MAP-01…03, RPT-01…05, HELP-01/02, BULK-01/03/04, DA-01/02/03/06/07, OPS-01 |
| 🟠 Partial     | 3 fase         | MD-08 (NKT & patok sudah ada), TOOLS-01, OPS-02 |
| 🔲 Not Started | 3 fase         | BULK-02, CMS-01, COMM-01 |
| 🔲 Planned     | 5 fase         | MD-07, MD-09, MD-10, MD-11, COMM-02 |
| 🔴 Blocked     | 0 fase         | — |
| Roadmap %      | **88,5%**      | Dihitung dari Phase Status (bobot inti ×2) — [metrics.md](./metrics.md) |

### Poin Bahasan Manajemen

| Topik               | Pesan Utama                                                              | Dampak                                                                                    |
| ------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **MVP live (v1.0.0)** 🟢 | Milestone MVP dirilis 2026-09-23, disusul v1.1.0 hari yang sama sebagai hotfix (migrasi prod sudah mendahului kode). | Seluruh fase inti kecuali BULK-02 sudah Done; pengembangan kini fokus pada pengerasan dan fitur lanjutan. |
| **Monev BMP** 🟢 | Skor BMP per petani per tahun + 32 indikator + penilaian Lembaga; data Rohul 2026 sudah masuk prod. | Adopsi praktik BMP bisa dipantau per Lembaga dan per petani, tidak lagi lewat rekap Excel terpisah. |
| **Lahan: legalitas, NKT, patok** 🟢 | Satelit lahan lengkap: surat/STDB/UL Parcel Code, sepadan, status NKT, patok batas bernomor unik, lahan tetangga. | Kesiapan data untuk sertifikasi dan ketertelusuran meningkat; tumpang tindih lahan kini terdeteksi (menunggu rilis). |
| **Keamanan akses prod** 🟡 | Dua celah terbuka: akun demo berperan SUPERADMIN mengubah label menu prod, dan perubahan peran baru berlaku setelah login ulang. | Dijadwalkan paling awal (Sprint 1) karena menyangkut data prod. |
| **Supply Chain** 🔵 | Epic baru #379: peta rantai pasok Petani → Offtaker → Mill (declared supply base). | Dijadwalkan Sprint 5–6 (s.d. 2026-11-08), menunggu keputusan lisensi Universal Mill List dan ketersediaan berkas survei. |
| Delivery confidence | 6 rilis dalam 9 hari dengan gate hijau; test 1.507 → 1.868. | Ritme rilis stabil; jalur `mvp → staging → main` aktif sejak v0.38.0. |

### Keputusan yang Dibutuhkan

| Keputusan                  | Owner                   | Dibutuhkan Kapan     | Rekomendasi Tech Lead                                                                       |
| -------------------------- | ----------------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| Akun demo & label menu Ketersediaan Data (#364) | Owner | Awal Sprint 1 (minggu 2026-09-28) | Turunkan peran akun demo, dan jadikan fix #342 prasyarat agar penurunan peran langsung berlaku. |
| Nasib BULK-02 (#69/#70 ditutup *not planned*) | Owner / Product | Sebelum rilis v1.3.0 | Putuskan buka ulang atau keluarkan dari baseline roadmap; perubahan baseline dicatat di Decision Log. |
| Lisensi Universal Mill List & berkas survei rantai pasok (#379) | Owner | Sprint 1 | Pastikan lisensi mengizinkan data masuk repo publik; bila tidak, seed lewat `--data` dari folder lokal. |
| Build staging OOM (#363) & migrasi staging otomatis (#277) | Owner + DevOps | Sprint 2 | Pilih opsi build/RAM; tambahkan minimal guard `migrate status` di workflow deploy. |

### Dua Minggu ke Depan (2026-09-29 s.d. 2026-10-11)

| Priority | Target                                      | Output                                                                                                        |
| -------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **P1**   | Keamanan akses prod (#364, #342, #237)      | Peran akun demo dibatasi, role/`isActive` dibaca ulang berkala di JWT, reaktivasi menu diperbaiki             |
| **P1**   | Rilis **v1.2.0**                            | #317 Fase 2 + #378 + perbaikan Sprint 1; seed menu Tumpang Tindih & Sprint Mingguan ke staging/prod           |
| **P2**   | Performa & jalur rilis (#252, #277, #376, #311, #363) | `getAccessContext` di-cache per request, guard migrasi di deploy, cek migrasi vs tag, perf test stabil |
| **P2**   | Prosedur rollback (#232, OPS-02)            | Dokumentasi + uji rollback di staging → kandidat OPS-02 Done                                                  |

Rincian per minggu: [sprint.md](./sprint.md).
