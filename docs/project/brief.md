# Proyek — Biweekly Management Brief

> Bagian dari dokumentasi **Proyek**. Indeks: [../README.md](../README.md) · Terkait: [roadmap.md](./roadmap.md) · [sprint.md](./sprint.md) · [tech-debt.md](./tech-debt.md) · [changelog.md](./changelog.md) · [contributing.md](./contributing.md)

> Dokumen kerja untuk memantau delivery Smallholder HUB. Status di dokumen ini disinkronkan terhadap **file dan code yang benar-benar ada di repository**, bukan berdasarkan klaim changelog historis.

**Last updated:** 2026-07-28 · **Next management review:** 2026-08-10

**Perubahan terakhir (2026-07-28):** sinkronisasi menyeluruh pasca-rilis **v0.14.0 → v0.15.0 → v0.16.0** (2026-07-20 s.d. 2026-07-22). Highlight periode: (1) **Modul Bantuan** (HELP-01/02) — panduan in-app 3 lapis: **17 tutorial per tugas** (dua tingkat kedalaman dari satu sumber) + 11 konsep + 4 referensi halaman, bantuan kontekstual `HelpHint`. (2) **Role `DONOR`** (#187) — role kelima, VIEW-only Dashboard/Report/Map/Bantuan; sentralisasi daftar role ke `src/lib/roles.ts`; migrasi + seed diterapkan ke mis-prod. (3) **Perombakan UI Settings** (#187B) — Menu Management & Role & Permission render rekursif 3 level (fix bug level-3), sticky header/kolom, kaskade induk→anak, SUPERADMIN dikecualikan dari matriks. (4) **Standar popup peta** (#188) — primitif `components/shared/map-popup.tsx` + aksi Lihat Detail/Edit Lahan di 3 peta. (5) **Penghapusan level Gapoktan/KUD** (#189, **breaking**) — hierarki final **3 level** (Petani → Kelompok Tani → Lembaga Petani), DROP COLUMN `sub_group_lv1` (migrasi `20260722030000` **diterapkan + diverifikasi mis-prod**), Laporan Kelompok Tani direstrukturisasi. (6) **DASH-06 Dashboard Pelatihan** (live query) & **RPT-05 Laporan Lahan** (PDF ber-peta grid index) selesai; TD-020…TD-025 + TD-028 ditutup; fix logout sidebar. Riwayat lengkap → [`changelog.md`](./changelog.md).

**Source of truth:** tabel **Phase Status** di [`roadmap.md`](./roadmap.md). **Panduan update & checklist:** [`contributing.md`](./contributing.md).

**Audit basis:** source code, Prisma schema, route files, server actions, scripts, GitHub workflow, dan hasil test lokal.

---

<details open>
<summary><strong>1. Biweekly Management Brief</strong> — ringkasan stakeholder</summary>

## 1. Biweekly Management Brief

Gunakan section ini untuk presentasi management setiap dua minggu. Section ini sengaja dibuat ringkas: posisi delivery, risiko, keputusan, dan target dua minggu berikutnya.

### Reporting Window

| Item               | Nilai                                                       |
| ------------------ | ----------------------------------------------------------- |
| Periode laporan    | 2026-07-15 s.d. 2026-07-28                                  |
| Status keseluruhan | 🟢 On Track (rilis v0.14.0/v0.15.0/v0.16.0; breaking change #189 hierarki 3 level sudah diterapkan & diverifikasi di mis-prod) |
| Basis review       | Sinkronisasi docs ↔ code 2026-07-28 (roadmap Phase Status + hasil test lokal) |
| Test lokal         | ✅ `npm test` — **44 files / 673 tests passed** · build ✅ · **lint ✅ exit 0** |
| Fokus berikutnya   | **TD-027** (N+1 `setRolePermissions`), **TD-026** (a11y matriks Role & Permission), **BULK-02** (#70) / #69 — TD-029 ✅ ditutup 2026-07-28 |

### Executive Summary

| Area                | Status          | Ringkasan                                                                                                                                  |
| ------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Platform foundation | ✅ Ready        | Auth, RBAC (**5 role** termasuk DONOR #187), menu 3-level, user management, region, farmer group implementatif; perombakan UI Settings (#187B). |
| Master data inti    | ✅ Complete     | Farmer ✅, Land Parcel ✅, Training ✅, Production (MD-06) ✅ complete (model + action + UI + test). Hierarki final **3 level** Petani → KT → Lembaga Petani (#189). |
| Dashboard           | ✅ Complete     | DASH-01/02/03 (#99) + DASH-04 BMP (#166) + DASH-05 card Total Kelompok Tani (#148) + **DASH-06 Dashboard Pelatihan (live query, 2026-07-21)** ✅. |
| Report              | ✅ Complete     | RPT-01 Petani (#107) ✅, RPT-02 Pelatihan (#108) ✅, RPT-03 Produksi (#132) ✅, RPT-04 Kelompok Tani Summary+Detail (#154, restrukturisasi #189) ✅, **RPT-05 Lahan (#177/#179) ✅** — PDF ber-peta grid index + Excel ber-gambar peta. |
| Bulk Upload         | ✅ Partial      | Farmer bulk upload ✅, Shapefile bulk upload ✅, Production bulk upload ✅. Region & KT bulk upload belum ada (#69, #70). |
| Map & Data Analyst  | ✅ Complete     | MAP-01 (#113 + hotspot/ruler/label) ✅, MAP-02 Peta BMP (#144) ✅, MAP-03 Layer Produktivitas (#174) ✅; standar popup peta + aksi Lihat Detail/Edit (#188) ✅; DA-01 (#103) & DA-02 (#118, #122) ✅. |
| Bantuan (HELP)      | ✅ Complete     | HELP-01 panduan in-app (6 bab, Markdown + pencarian) ✅; HELP-02 **17 tutorial per tugas + 4 referensi** (dua tingkat kedalaman, `HelpHint` kontekstual) ✅. |
| Keamanan            | ✅ Clean | Remediasi audit 2026-07-10 tuntas (#125–#130); TD-024 (scope `getExistingFarmerIds`) ✅; **TD-029** (scope combobox bulk upload petani) ditemukan audit docs 2026-07-28 dan **ditutup di hari yang sama** ✅. |
| Testing & QA        | ✅ Strong | Vitest: **44 files / 673 tests passed** ✅ · build ✅ · **`npm run lint` ✅ exit 0**. |

### Progress Snapshot

| Metrik         | Jumlah         | Catatan                                              |
| -------------- | -------------- | ---------------------------------------------------- |
| Total phase    | 46 fase        | PLATFORM(7), MD(11), DASH(6), MAP(3), RPT(5), HELP(2), BULK(4), DA(2), TOOLS(1), CMS(1), COMM(2), OPS(2) |
| ✅ Done        | **34 fase**    | PLATFORM-01…07, MD-01…06, DASH-01…06, MAP-01…03, RPT-01…05, HELP-01/02, BULK-01/03/04, DA-01/02 |
| 🟠 Partial     | 3 fase         | TOOLS-01, OPS-01, OPS-02 |
| 🔲 Not Started | 3 fase         | BULK-02 (#70), CMS-01, COMM-01 |
| 🔲 Planned     | 6 fase         | MD-07/08/09/10/11, COMM-02 |
| 🔴 Blocked     | 0 fase         | — |
| 🎯 Now         | tech-debt & bulk upload | TD-027 (N+1 kaskade) · TD-026 (a11y matriks) · BULK-02 #70 / #69 (TD-029 ✅ 07-28) |

### Management Talking Points

| Topik               | Pesan Utama                                                              | Dampak                                                                                    |
| ------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Hierarki final 3 level (#189)** 🟢 | Level Gapoktan/KUD dibatalkan owner — hierarki resmi Petani → Kelompok Tani → Lembaga Petani; kolom `sub_group_lv1` di-drop (migrasi diterapkan & diverifikasi mis-prod); laporan/UI/bulk-upload/Bantuan disisir ~40 file. | Pertanyaan lama "3 vs 4 level" (TD-013/TD-014) tertutup; model data lebih sederhana; refactor KT-jadi-tabel (TD-014 Jalur B) menunggu data lengkap. |
| **Role DONOR (#187)** 🟢 | Role kelima untuk donor/funder: VIEW-only Dashboard/Report/Map/Bantuan, tanpa Master Data/Settings; sudah live di mis-prod (15 baris permission terverifikasi). | Akses stakeholder eksternal tanpa risiko tulis; pemisahan data agregat-saja menyusul sebagai menu khusus. |
| **Modul Bantuan lengkap (HELP-01/02)** 🟢 | Panduan in-app 17 tutorial per tugas + 4 referensi + 11 konsep, dua tingkat kedalaman, terindeks pencarian, ber-penjaga test kelengkapan materi. | Onboarding pengguna & pelatihan lintas peran tidak lagi bergantung pendampingan langsung. |
| **UI Settings dirombak (#187B)** 🟢 | Menu Management & Role & Permission rekursif 3 level (fix bug menu level-3 tak muncul), sticky, kaskade ber-konfirmasi, feedback optimistis. | Administrasi permission lebih cepat & akurat; sisa: TD-026 (a11y) & TD-027 (N+1 kaskade besar). |
| **Keamanan** 🟢 | Audit docs 2026-07-28 menemukan TD-029 (combobox "Pilih Lembaga Petani" bulk upload memuat seluruh lembaga aktif tanpa scope filter) — **langsung ditutup di hari yang sama** dengan pola filter yang sudah dipakai bulk upload lahan/produksi. | Kebocoran daftar (bukan data petani) tertangkap oleh proses audit internal dan ditutup <24 jam. |
| Delivery confidence | Tests **673/673** passed (44 files); lint 0 error; 3 rilis berturut (v0.14–v0.16) dengan gate hijau. | Foundation & core features stabil; breaking change #189 lolos gate + verifikasi mis-prod. |

### Decisions Needed

| Keputusan                  | Owner                   | Dibutuhkan Kapan     | Rekomendasi Tech Lead                                                                       |
| -------------------------- | ----------------------- | --------------------- | --------------------------------------------------------------------------------------------- |
| ✅ **Hierarki 3 vs 4 level** | — (RESOLVED #189)      | ✅ DONE               | **3 level final** — Gapoktan/KUD dibatalkan; kolom `sub_group_lv1` di-drop, migrasi diterapkan ke mis-prod. |
| ✅ **Privasi DONOR**        | — (RESOLVED #187)       | ✅ DONE (sementara)   | DONOR sementara melihat data individu petani seperti MANAGEMENT; pemisahan agregat-saja ditunda ke menu khusus DONOR. |
| TD-014 eksekusi refactor KT jadi tabel | Product + Backend Lead | Saat data KT lengkap | Jalur B (rename `FarmerGroup`→`FarmerInstitution` + tabel KT, tanpa Gapoktan) — export → rebuild → re-import; interim per-lahan tetap menopang. |

### Next Two Weeks (2026-07-28 s.d. 2026-08-10)

| Priority | Target                                      | Output                                                                                                        |
| -------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| ✅ Done  | **TD-029: scope combobox bulk upload petani** (2026-07-28) | `getFarmerGroupsForMapping()` diberi filter `AND: farmerGroupAccessFilter(access)` + troubleshooting Bantuan; gate hijau |
| **P2**   | **TD-027: `setRolePermissions` N+1**        | Ganti loop `findFirst`+`update`/`create` per baris → `findMany` + `updateMany`/`createMany` massal dalam transaksi |
| **P2**   | **TD-026: a11y matriks Role & Permission**  | `aria-label` + `aria-pressed` pada sel izin; label pada chevron & tombol toggle baris                          |
| **P3**   | **BULK-02 (#70) / #69 Bulk Upload Region & KT** | CSV upload + validasi hierarchy/Zod + preview + bulk insert — selaras [sprint.md](./sprint.md)             |

</details>
