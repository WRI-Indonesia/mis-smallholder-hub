---
title: Laporan patok batas lahan
icon: FileText
menuKey: report-marker
permission: VIEW
duration: 4
href: /admin/report/marker
hrefLabel: Buka Laporan Patok
goal: Daftar patok satu Distrik/Lembaga beserta kondisinya — untuk menyusun pekerjaan pemasangan ulang dan lampiran laporan NKT.
---

## Sebelum mulai

Laporan ini membaca patok yang sudah tercatat (tab **Patok** di detail lahan, atau unggahan titik GPS). Satu patok fisik yang dipakai beberapa lahan tampil **satu baris** dengan semua lahan pemakainya; kondisi (Ada/Hilang/Rusak/Belum dipasang) berlaku untuk semua lahan itu.

+ Patok yang belum pernah dicek di lapangan berstatus **Belum dipasang** — koordinatnya berasal dari sudut poligon atau GPS, fisiknya belum tentu ada.

## Langkah

1. Buka **Report → Patok**, pilih **Distrik** (wajib) dan bila perlu **Lembaga Petani**, lalu klik **Muat Data**.
2. Baca kartu ringkasan: jumlah patok, berapa yang **Ada**, **Hilang**, **Rusak**, dan **Belum dipasang**.
3. Saring dengan **Kondisi** (mis. *Hilang* untuk daftar kerja pemasangan ulang).
+ Tabel dan kartu "Daftar Patok (N dari M)" mengikuti saringan; unduhan pun hanya memuat baris yang tampil.
4. Klik **Unduh**: **Excel** (satu baris per patok, kolom Kode Patok, lahan pemakai satu per baris), **Shapefile/GeoJSON/KML** (titik), atau **PDF** (peta klaster + tabel per lahan) — sesuai izin Export/Print Anda.

## Hasil

Kode patok (`HJP-PTK-000123`) di laporan sama dengan yang tertulis di patok fisik dan di tab Patok tiap lahan, sehingga temuan lapangan bisa dicocokkan langsung.

## Kalau bermasalah

**Tombol Muat Data nonaktif** — Distrik belum dipilih.

**"Tidak ada patok pada filter ini"** — lahan di wilayah itu belum punya patok; buat dari poligon di detail lahan atau unggah titik GPS lewat Bulk Upload → Upload Data Lahan → tab Patok.

**Menu Patok tidak muncul** — akun Anda belum diberi izin menu Report → Patok; minta administrator lewat Settings → Izin Peran.
