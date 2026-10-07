---
description: Bandingkan berkas data fasilitator (xlsx/csv) dengan DB (default mis-prod) — read-only, laporan selisih + rekomendasi import
argument-hint: "<path berkas> [lembaga: nama/kode ICS] [--env prod|staging|local] (default --env prod)"
---

Analisis berkas data fasilitator terhadap DB. **Read-only**: tidak ada INSERT/UPDATE/DELETE, tidak ada import, tidak ada migrasi, tidak ada commit, tidak membuat/mengomentari issue. Kalau ada yang perlu diperbaiki di DB, catat sebagai rekomendasi — jangan dikerjakan di sini.

Argumen: $ARGUMENTS
- Argumen pertama = path berkas (wajib). Kosong → tanya path-nya, berhenti.
- Lembaga opsional; kosong → tebak dari nama berkas/isi, lalu **konfirmasi** sebelum lanjut kalau kandidatnya lebih dari satu.
- `--env` default **prod** → semua query lewat `npx dotenv -e .env.prod -- …` (tunnel `:1234` harus aktif). `staging`/`local` → `.env.staging` / `.env`.

## Tahap 0 — Koneksi aman

1. Skrip analisis ditaruh di `scripts/local/tmp-check/banding-<slug>.mjs` (folder gitignored). Pakai `pg` langsung, mengikuti pola `scripts/local/tmp-check/cek-itm-1.mjs`.
2. Setelah connect, **wajib** jalankan `SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY` — pagar teknis, bukan janji.
3. Cetak DB efektif (`current_database()`, host:port, password disamarkan) sebelum query apa pun. Kalau DB tidak sesuai `--env` (mis. diminta prod tapi yang tersambung `mis-dev`), **berhenti**.
4. Tunnel mati / koneksi ditolak → minta owner membuka tunnel, jangan beralih ke DB lain diam-diam.

## Tahap 1 — Profil berkas

- Daftar sheet, baris header (bisa bukan baris 1), jumlah baris data, baris kosong/sampah/subtotal, sel error (`#VALUE!`, `#REF!`), sel hasil fill-down yang mencurigakan.
- Kenali jenis data: **petani**, **lahan**, **produksi**, **pelatihan**, **NKT/BMP**, atau campuran. Petakan tiap kolom ke field model (`prisma/schema/*.prisma`) — tampilkan tabel pemetaannya. Kolom yang tidak punya padanan di DB disebut eksplisit.
- Jangan percaya label header begitu saja (pernah: header "ID LAHAN" ternyata isinya Farmers ID). Cek pola isinya.

## Tahap 2 — Ambil master DB

- Cari Lembaga Petani di `tbl_farmer_group` lewat **`id` DAN `code`** (jebakan: `ICS-1408-06` vs `ISH-1408-06`) dan nama.
- Ambil petani, lahan (aktif + riwayat revisi), dan tabel lain sesuai jenis data. Simpan snapshot JSON di `scripts/local/tmp-check/` supaya analisis ulang tidak perlu query prod lagi.

## Tahap 3 — Pencocokan

Command ini generik. Entitas ditentukan di Tahap 1, lalu kunci cocoknya diambil dari tabel di bawah. **Sebelum dipakai, verifikasi kuncinya ke `prisma/schema/*.prisma`** (`@@unique`, catatan komentar). Skema bisa berubah, dan tabel ini hanya titik awal. Satu berkas bisa memuat beberapa entitas (mis. petani + lahan dalam satu baris). Kerjakan berjenjang: petani dulu, lalu entitas yang bergantung padanya.

**Petani (fondasi semua entitas lain).** Urutan resolusi: Farmers ID persis → ID dengan urutan segmen dibalik → NIK → nama ternormalisasi (unik di lembaga).
- Catat metode cocok tiap baris (ID / flip / NIK / nama).
- Cocok lewat nama saja atau kandidat >1 = **ambigu** → laporkan, jangan ditebak.
- Cocok lewat NIK tapi ID berbeda → tampilkan dua-duanya (bisa salah ketik ID atau ID milik orang lain).

| Entitas | Tabel utama | Kunci cocok | Yang dibandingkan / dicek khusus |
|---|---|---|---|
| Petani | `tbl_farmer` | unik `(farmer_group_id, farmer_id)` + resolusi di atas | nama, NIK, JK, alamat/desa, tempat-tgl lahir, tahun bergabung |
| Lahan | `tbl_land_parcel` (+ `LandParcelIdentity`) | petani + `parcel_id` → `parcel_uid`; cadangan: kode vendor `tbl_land_parcel_external_id`, lalu petani + blok | luas, tahun tanam, blok, Kelompok Tani (`sub_group_lv2`), desa. Hanya baris **aktif** (revisi terakhir) yang dibandingkan. Riwayat revisi sekadar konteks |
| Detail lahan | `tbl_land_parcel_external_id` · `LandParcelStdb` · `LandParcelDocument` | `parcel_uid` + sumber/kode · nomor STDB · jenis surat | kode ganda (boleh per lahan, tetap dilaporkan), isian `\|\|` = daftar beberapa surat |
| NKT | `tbl_land_parcel_nkt` | 1:1 `parcel_uid` | status (AFFECTED/NOT_AFFECTED), kategori NKT |
| Produksi | `tbl_production_record` | unik `(farmer_id, parcel_id, period YYYY-MM, harvest_number)` | kg per periode. Bedakan **periode baru** dari **periode yang sudah ada dengan angka berbeda**. Bulan yang baru terisi sebagian (rotasi belum lengkap) diberi tanda |
| Pelatihan | `tbl_training_activity` + `tbl_training_participant` | activity: lembaga + paket + `training_date` (+ label modul di `notes`/`location`); peserta unik `(activity_id, farmer_id)` | sesi yang **sudah ada** (menempel) vs sesi **baru**. Tanggal teks Indonesia & typo tahun. Tanggal kosong = belum ikut, bukan error. Skor pre/post |
| Monev BMP | `tbl_bmp_assessment` + `tbl_bmp_assessment_detail` | satu penilaian aktif per `(farmer_id, survey_year)` (partial unique index, bukan `@@unique`); detail unik `(assessment_id, indicator_id)` | skor 0–3, kode indikator vs `ref_bmp_indicator`, Lembaga (`tbl_bmp_group_assessment`) |
| Patok | `tbl_land_marker` + `tbl_land_parcel_marker` | `code` unik global; tautan `(parcel_uid, marker_id)` | patok dipakai bersama lintas lembaga, jangan dianggap "hilang" |

Entitas yang tidak ada di tabel ini → baca model Prisma-nya, tentukan kuncinya sendiri dan tulis alasannya di laporan. Jangan dipaksakan ke entitas yang mirip.

## Tahap 4 — Laporan (di chat)

Ringkasan angka di atas, lalu per kategori:

| Kategori | Isi |
|---|---|
| Cocok & identik | jumlah saja |
| Cocok tapi berbeda | diff per kolom (nilai berkas vs DB), dikelompokkan per kolom |
| Baru | ada di berkas, tidak ada di DB |
| Hilang | ada di DB (aktif), tidak ada di berkas — bisa keluar, bisa terlewat |
| Ambigu / tak cocok | butuh konfirmasi fasilitator |
| Kualitas data | NIK ≠ 16 digit / dobel di berkas / sudah dipakai lembaga lain · JK kosong atau tidak cocok digit NIK · tanggal invalid · angka di luar akal (luas > 25 ha, tahun di luar 1970–sekarang, produksi negatif) · ID dobel beda orang |

Tutup dengan **rekomendasi**: mana yang bisa lewat UI Bulk Upload, mana yang perlu skrip import (idempotent, dry-run default, `--apply` setelah persetujuan owner), dan daftar pertanyaan untuk fasilitator.

Bila owner meminta berkas review, tulis `<nama-berkas>-review.xlsx` di folder yang sama (kolom "Bisa Diimport" YA/YA*/TIDAK + "Catatan" per baris, satu sheet per kategori). Buka/periksa hasilnya sebelum menyerahkan.

## Larangan

- Nama petani, NIK, nomor HP asli **tidak boleh** masuk ke commit, issue, PR, docs, atau changelog (repo publik). Di chat boleh.
- Jangan menyalin `.env.prod` ke `.env`; jangan membuat `.env.local`.
- Jangan memindahkan berkas sumber ke `processed/` — itu dilakukan setelah import, bukan saat analisis.
