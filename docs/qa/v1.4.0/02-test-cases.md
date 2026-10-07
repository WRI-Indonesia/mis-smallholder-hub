# 02 · Kasus uji per issue — v1.4.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Satu **blok** per kasus. Data uji memakai **kode** (Lembaga/lahan), bukan nama orang. Tag: `[P0]` wajib tiap run · `[P1]` · `[P2]`; `[regresi]` = disalin ke `../regression.md` saat rilis ditutup.

## #402 — Training Benefit per year

### TC-402-01 · Kumulative tahun berjalan = Capaian Paket per Distrik [P0] [regresi] (3 mnt)
Prasyarat: filter Tahun kosong.
Langkah:
1. Dashboard › Pelatihan, kartu Training Benefit per year → Tabel.
2. Bandingkan kolom Kumulative tahun berjalan dengan baris Total card Capaian Paket per Distrik.
Harapan:
- Tiap paket sama; baris "Petani pernah mengikuti pelatihan (minimal 1)" = "Pernah Ikut Pelatihan".
- Kolom "≤ t−2" tanpa tanda "+".
Baseline dev: mis-dev 2026-10-07 — P1 8.279 · MK 7.769 · HSE 8.076 · P3 3.756 · pernah ikut 8.401.

### TC-402-02 · Grafis & toolbar [P1] (2 mnt)
Langkah:
1. Pindah Tabel → Grafis → vs Kontrak → Tabel.
Harapan:
- Toolbar tidak bergeser; ⓘ hanya aktif di Tabel/Grafis.
- Grafis: trek penuh = petani aktif, sisa abu tanpa label angka (tooltip berisi jumlah belum dilatih).

### TC-402-03 · Excel 2 sheet [P0] (3 mnt)
Langkah:
1. Klik Excel, buka berkasnya di Excel.
Harapan:
- Sheet **Capaian**: tabel format donor mulai baris 1 + gambar Grafis di bawahnya.
- Sheet **Kontrak**: Start/tahun (Target · Realisasi · %) + Total kontrak, tahun mendatang tanpa realisasi, gambar 5 grafik; tanpa target → pesan.
- Teks "P&C RSPO" tampil benar di gambar.

## #403 — Target Program + vs Kontrak

### TC-403-01 · Simpan & validasi bentuk rencana [P0] [regresi] (4 mnt)
Prasyarat: TC-PREP-01.
Langkah:
1. Ubah tahun Start menjadi tahun kolom pertama.
2. Hapus kolom tahun tengah.
3. Ketik `1.5` di satu sel.
4. Kembalikan semuanya, simpan tanpa perubahan.
Harapan:
- (1) dan (2): pesan merah, Simpan nonaktif.
- (3): bingkai merah (tak tersimpan 15).
- (4): toast "Tidak ada perubahan"; "Terakhir diubah" tidak berganti.

### TC-403-02 · Izin [P0] (3 mnt)
Langkah:
1. OPERATOR membuka Target Program.
2. DONOR mencari menu Target Program, lalu membuka Dashboard › Pelatihan → vs Kontrak.
Harapan:
- OPERATOR: angka terlihat, tanpa input/tombol.
- DONOR: menu Target Program tidak ada; vs Kontrak terlihat (keputusan owner 2026-10-07).

### TC-403-03 · vs Kontrak = 5 grafik, skala bersama [P1] (2 mnt)
Harapan:
- 5 kotak (P1 · P2 Group Dynamic · P2 HSE · P3 · pernah mengikuti ditonjolkan), sumbu Y sama.
- Label "tertinggal N" / "+N di atas target" / "≈ sesuai target" tidak menabrak garis.
- Paket tanpa target: "target belum diisi".

### TC-403-04 · Filter aktif [P1] (2 mnt)
Peran: OPERATOR ter-scope.
Harapan:
- Catatan kuning: realisasi wilayah terpilih, target seluruh program.

## #317 — Tumpang Tindih Lahan Fase 2

### TC-317-01 · Tab Luar Boundary [P1] (3 mnt)
Langkah:
1. Tab Luar Boundary → ringkasan per Lembaga → pilih 1 lahan.
Harapan:
- Peta menampilkan lahan + boundary ICS; filter Sepenuhnya/Sebagian; `?tab=luar-boundary` bisa dibagikan.
- OPERATOR hanya melihat lahan Lembaga dalam scope.

### TC-317-02 · Tab Selisih Luas & isolasi galat [P1] (2 mnt)
Harapan:
- Daftar lahan dengan selisih luas > ambang DA-02; tab lain tetap jalan bila satu tab galat.

## #400 — Tanggal upload

### TC-400-01 · DD/MM tak terbaca MM/DD [P0] [regresi] (3 mnt)
Langkah:
1. Unggah berkas Petani uji dengan tanggal teks `05/03/1980` dan `2024-03-05`.
Harapan:
- Pratinjau: 5 Maret 1980 dan 5 Maret 2024 (bukan 3 Mei).

## Platform Developer

### TC-PD-01 · Grup menu per peran [P1] (2 mnt)
Harapan:
- SUPERADMIN: grup Platform Developer berisi Metrik Rilis · Peta Data & Skema · Rencana Pengembangan.
- ADMIN/MANAGEMENT: ketiga menu tetap terjangkau (izin anak eksplisit).
- OPERATOR/DONOR: tidak ada.
