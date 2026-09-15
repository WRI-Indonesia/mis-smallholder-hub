---
title: Menyaring lahan yang belum punya surat atau STDB
icon: ScrollText
menuKey: report-land-parcel
permission: VIEW
duration: 6
href: /admin/report/land-parcel
hrefLabel: Buka Laporan Lahan
goal: Daftar kerja berisi lahan yang perlu ditindaklanjuti — belum bersurat, belum ber-STDB, atau luas suratnya jauh berbeda dari poligon.
---

## Sebelum mulai

Laporan Lahan bisa dipakai dua cara. Sebagai **daftar** (roster) seluruh lahan satu lembaga — itu yang dijelaskan di *Mencetak Laporan Lahan ber-peta*. Halaman ini tentang cara kedua: sebagai **daftar kerja**, yaitu menyaring lahan mana yang legalitasnya masih perlu diurus.

Seperti laporan lainnya, **Lembaga Petani wajib dipilih** lebih dulu. Pertanyaan tingkat kabupaten ("semua lahan tanpa surat di Kampar") belum bisa dijawab dari sini.

> [!penting] **Baca ini sebelum memakai angkanya.** Data surat dan STDB masuk lewat unggah **Detail Lahan (Excel)**, dan belum semua kabupaten diunggah. Lahan dari kabupaten yang berkasnya belum masuk akan tampak "tanpa surat" — padahal yang belum ada adalah *datanya*, bukan suratnya.

Karena itu filter **Cakupan Pendataan** ada. Sejak awal filter ini disetel **Semua lahan**, sehingga laporan tampil sebagai roster utuh — tak ada lahan yang hilang diam-diam. Konsekuensinya, angka "Ada Surat" dan "Ada STDB" ikut menghitung lahan yang berkasnya memang belum diunggah, jadi terlihat lebih rendah dari kenyataannya. **Sebelum menyimpulkan apa pun dari persentasenya, ubah dulu ke *Sudah didata***: hanya lahan yang sudah melalui unggah Detail Lahan yang dihitung, dan penyebutnya jadi jujur.

## Langkah

1. Buka **Report → Lahan**, pilih **Lembaga Petani**.
2. Pada baris filter kedua, ubah **Cakupan Pendataan** ke *Sudah didata* (bawaannya *Semua lahan*).
3. Setel filter legalitas sesuai pertanyaan Anda:

| Ingin tahu… | Setel |
| --- | --- |
| Lahan mana yang belum punya surat | **Status Surat** → *Tanpa surat* |
| Lahan mana yang bersertifikat SHM | **Jenis Surat** → centang *SHM* |
| Lahan mana yang belum punya STDB | **Status STDB** → *Tanpa STDB* |
| Berkas STDB mana yang masih diurus | **Status STDB** → *Tahap: Pengajuan* (atau tahap lain) |
| Luas surat mana yang jauh dari poligon | **Selisih Luas** → *≥ 0,50 Ha* |
| Lahan mana yang termasuk/terdampak NKT | **NKT** → *Termasuk / terdampak NKT* (atau satu status saja) |
| Lahan mana yang belum pernah dinilai NKT | **NKT** → *Belum dinilai* |

+ Filter bisa digabung. Menggabungkan *Tanpa surat* dengan *Tanpa STDB* memberi daftar lahan yang belum punya keduanya.
+ Tombol **Reset filter legalitas** mengembalikan kelimanya ke *Semua*; Cakupan Pendataan tetap seperti pilihan Anda.
+ **Belum dinilai** dan **Tidak terdampak** berbeda: yang pertama belum pernah diasesmen sama sekali, yang kedua sudah diasesmen dan bersih. Kolom NKT di tabel dan berkas juga menulis "Belum dinilai" secara eksplisit, bukan sel kosong.

4. Nyalakan kolom yang relevan lewat tombol **Kolom** — Surat Kepemilikan, STDB, Luas Tertera, UL Parcel Code, Program, NKT, Luas NKT. Semuanya mati secara bawaan supaya tabel harian tidak melebar.

+ Di dalam dropdown itu ada **Pilih semua**, **Kosongkan**, dan **Bawaan**. Pakai *Pilih semua* kalau ingin melihat segalanya sekali jalan, lalu *Bawaan* untuk kembali ke tampilan awal — Anda tidak perlu mematikan kolomnya satu per satu.

5. Unduh **Excel** atau cetak **PDF**.

## Yang ikut ke berkas cetak

Baik Excel maupun PDF membawa **filter yang sedang aktif** dan **lima angka ringkasan** — jadi penerima berkas tahu ini daftar tersaring, bukan daftar lengkap, dan tahu proporsinya tanpa harus membuka aplikasi.

| Berkas | Letaknya |
| --- | --- |
| **Excel** | Sheet **Ringkasan** di urutan pertama. Sheet **Lahan** dibiarkan bersih — barisnya tetap mulai dari baris 1 supaya filter dan pivot Excel tetap jalan |
| **PDF** | Blok **Filter Legalitas** dan **Ringkasan Legalitas** di halaman pertama, di bawah nama Distrik/Lembaga |

## Laporan NKT satu Lembaga (PDF)

Untuk pihak yang hanya butuh gambaran NKT — fasilitator, mitra asesmen, auditor — ada cetakan tersendiri: tombol merah **Laporan NKT** di toolbar (di samping PDF; butuh izin cetak). Isinya **seluruh lahan aktif Lembaga**, bukan hasil filter, supaya angkanya selalu utuh:

| Bagian | Isi |
| --- | --- |
| **Kop** | Nama & kode Lembaga, Distrik, **sumber asesmen** (asesor/sumber yang tercatat di baris NKT), waktu cetak |
| **Tiga angka** | Total lahan (catatan: berapa sudah/belum dinilai) · Lahan NKT (catatan: Σ luas poligonnya) · Luas NKT (Σ luas area NKT di dalam lahan) |
| **Peta** | Semua lahan Lembaga tergambar tipis berlabel nama petani; lahan NKT **merah bernomor** — nomor sama dengan nomor di tabel. Bila persilnya kecil, menyusul halaman **peta rinci** per gugus (A, B, …) |
| **Tabel** | Hanya lahan NKT: ID Lahan, petani, KT/Blok, luas, status, kategori, luas & panjang area NKT, tanggal, catatan |
| **Ringkasan** | Jumlah lahan per kategori NKT 1–6 |

+ Asesor/sumber ditulis sekali di kop bila semua baris sama; kolom per baris hanya memuatnya bila Lembaga punya lebih dari satu sumber asesmen.
+ Lahan yang belum dinilai ikut dihitung di kotak angka tetapi tidak masuk tabel — tabel adalah daftar kerja lahan NKT, bukan roster.
+ Angka "Luas NKT" (dan kolom Panjang di tabel) hanya terisi bila kolom itu diisi saat asesmen/import (Lampiran laporan asesmen biasanya menyediakannya).

## Membaca kartu ringkasan

Lima kartu di atas tabel mengikuti filter yang sedang aktif:

- **Lahan (hasil filter)** — jumlah baris yang tampil, dengan catatan berapa di antaranya sudah didata.
- **Ada Surat** dan **Ada STDB** — jumlah beserta persentasenya. Persennya **selalu** menyebut penyebutnya ("dari 1.204 lahan yang sudah didata"), karena penyebut itu bukan seluruh lahan lembaga.
- **Selisih Luas ≥ 0,50 Ha** — lahan yang angka di suratnya berjarak jauh dari luas poligon.
- **Termasuk/terdampak NKT** — jumlah lahan yang kena NKT, dengan persentase **dari lahan yang sudah dinilai NKT** (bukan dari seluruh lahan — asesmen biasanya baru menyentuh sebagian lembaga).

+ Angka-angka ini dihitung dari sumber yang sama dengan yang tercetak di Excel dan PDF, jadi layar dan berkas tidak akan berbeda.

+ **STDB dihitung per persil, bukan per petani.** Satu STDB bisa menutup belasan persil sekaligus, jadi "300 lahan tanpa STDB" tidak berarti 300 berkas yang harus diurus — bisa jadi jauh lebih sedikit. Untuk membaca beban kerja sesungguhnya, lihat per petani di Master Data.

## Dua aturan yang mudah disalahpahami

**"Tanpa surat" berarti benar-benar tidak ada surat tercatat.** Lahan yang catatannya berbunyi "surat di bank" atau "lahan sudah dijual" tetap dihitung **punya** surat — keterangan itu adalah status penguasaan, bukan ketiadaan surat. Kalau Anda mencari lahan yang suratnya sedang tidak di tangan petani, cari lewat tab Legalitas di detail lahan, bukan lewat filter ini.

**Memilih beberapa jenis surat berarti "punya minimal satu".** Mencentang SHM dan SKT menampilkan lahan yang punya SHM **atau** SKT; lahan yang punya keduanya muncul di kedua saringan. Ini disengaja.

## Kalau bermasalah

**Hasilnya kosong padahal lembaga itu jelas punya lahan** — bila Anda menyetel Cakupan Pendataan ke *Sudah didata*, kemungkinan besar lembaga itu belum melalui unggah Detail Lahan sehingga tak satu pun lahannya lolos. Kembalikan ke *Semua lahan* untuk memastikan.

**Angka "Ada Surat" terasa terlalu rendah** — periksa Cakupan Pendataan. Pada setelan bawaan *Semua lahan*, penyebutnya ikut memuat lahan yang berkasnya memang belum diunggah; ubah ke *Sudah didata* untuk angka yang sebanding.

**Lahan yang saya tahu sudah didata tidak terhitung "sudah didata"** — penandanya adalah **UL Parcel Code**. Berkas unggahan yang tidak membawa kolom `parcel_code` tidak meninggalkan penanda itu (saat mengunggah, sistem memperingatkan bila kolomnya tidak ada). Lengkapi kodenya lewat tab Legalitas di detail lahan.

**Selisih luas menandai lahan yang menurut saya wajar** — ambangnya tetap 0,50 Ha untuk semua ukuran lahan, jadi pada lahan luas selisih segitu memang tidak berarti banyak. Anggap sebagai daftar periksa, bukan daftar kesalahan.

## Filter & kolom Patok

Sejak patok batas dicatat (tab Patok di detail lahan / unggah GPS), Laporan Lahan punya filter **Patok**: *Sudah ada patok*, *Belum ada patok*, *Semua patok terpasang (Ada)*, atau *Ada patok hilang/rusak/belum dipasang* — yang terakhir cocok untuk menyusun daftar kerja pemasangan ulang. Kolom **Patok** (aktifkan lewat tombol Kolom) menampilkan jumlah patok dan ringkasan kondisinya, mis. "4 · 2 ada · 1 hilang · 1 belum dipasang"; kartu **Ada Patok** di ringkasan menghitung lahan yang sudah punya patok.
