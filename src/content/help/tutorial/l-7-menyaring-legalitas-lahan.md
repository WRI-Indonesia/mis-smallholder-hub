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

Karena itu filter **Cakupan Pendataan** disetel **Sudah didata** sejak awal: hanya lahan yang sudah melalui unggah Detail Lahan yang dihitung. Ubah ke *Semua lahan* hanya bila Anda memang ingin melihat yang belum terdata sekalian — dan sadar bahwa angkanya bercampur.

## Langkah

1. Buka **Report → Lahan**, pilih **Lembaga Petani**.
2. Pada baris filter kedua, biarkan **Cakupan Pendataan** di *Sudah didata*.
3. Setel filter legalitas sesuai pertanyaan Anda:

| Ingin tahu… | Setel |
| --- | --- |
| Lahan mana yang belum punya surat | **Status Surat** → *Tanpa surat* |
| Lahan mana yang bersertifikat SHM | **Jenis Surat** → centang *SHM* |
| Lahan mana yang belum punya STDB | **Status STDB** → *Tanpa STDB* |
| Berkas STDB mana yang masih diurus | **Status STDB** → *Tahap: Pengajuan* (atau tahap lain) |
| Luas surat mana yang jauh dari poligon | **Selisih Luas** → *≥ 0,50 Ha* |

+ Filter bisa digabung. Menggabungkan *Tanpa surat* dengan *Tanpa STDB* memberi daftar lahan yang belum punya keduanya.
+ Tombol **Reset filter legalitas** mengembalikan keempatnya ke *Semua*; Cakupan Pendataan tetap seperti pilihan Anda.

4. Nyalakan kolom yang relevan lewat tombol **Kolom** — Surat Kepemilikan, STDB, Luas Tertera, UL Parcel Code, Program. Semuanya mati secara bawaan supaya tabel harian tidak melebar.

+ Di dalam dropdown itu ada **Pilih semua**, **Kosongkan**, dan **Bawaan**. Pakai *Pilih semua* kalau ingin melihat segalanya sekali jalan, lalu *Bawaan* untuk kembali ke tampilan awal — Anda tidak perlu mematikan kolomnya satu per satu.

5. Unduh **Excel** atau cetak **PDF**.

## Yang ikut ke berkas cetak

Baik Excel maupun PDF membawa **filter yang sedang aktif** dan **empat angka ringkasan** — jadi penerima berkas tahu ini daftar tersaring, bukan daftar lengkap, dan tahu proporsinya tanpa harus membuka aplikasi.

| Berkas | Letaknya |
| --- | --- |
| **Excel** | Sheet **Ringkasan** di urutan pertama. Sheet **Lahan** dibiarkan bersih — barisnya tetap mulai dari baris 1 supaya filter dan pivot Excel tetap jalan |
| **PDF** | Blok **Filter Legalitas** dan **Ringkasan Legalitas** di halaman pertama, di bawah nama Distrik/Lembaga |

## Membaca kartu ringkasan

Empat kartu di atas tabel mengikuti filter yang sedang aktif:

- **Lahan (hasil filter)** — jumlah baris yang tampil, dengan catatan berapa di antaranya sudah didata.
- **Ada Surat** dan **Ada STDB** — jumlah beserta persentasenya. Persennya **selalu** menyebut penyebutnya ("dari 1.204 lahan yang sudah didata"), karena penyebut itu bukan seluruh lahan lembaga.
- **Selisih Luas ≥ 0,50 Ha** — lahan yang angka di suratnya berjarak jauh dari luas poligon.

+ Angka-angka ini dihitung dari sumber yang sama dengan yang tercetak di Excel dan PDF, jadi layar dan berkas tidak akan berbeda.

+ **STDB dihitung per persil, bukan per petani.** Satu STDB bisa menutup belasan persil sekaligus, jadi "300 lahan tanpa STDB" tidak berarti 300 berkas yang harus diurus — bisa jadi jauh lebih sedikit. Untuk membaca beban kerja sesungguhnya, lihat per petani di Master Data.

## Dua aturan yang mudah disalahpahami

**"Tanpa surat" berarti benar-benar tidak ada surat tercatat.** Lahan yang catatannya berbunyi "surat di bank" atau "lahan sudah dijual" tetap dihitung **punya** surat — keterangan itu adalah status penguasaan, bukan ketiadaan surat. Kalau Anda mencari lahan yang suratnya sedang tidak di tangan petani, cari lewat tab Legalitas di detail lahan, bukan lewat filter ini.

**Memilih beberapa jenis surat berarti "punya minimal satu".** Mencentang SHM dan SKT menampilkan lahan yang punya SHM **atau** SKT; lahan yang punya keduanya muncul di kedua saringan. Ini disengaja.

## Kalau bermasalah

**Hasilnya kosong padahal lembaga itu jelas punya lahan** — kemungkinan besar lembaga itu belum melalui unggah Detail Lahan, sehingga tak satu pun lahannya lolos filter *Sudah didata*. Ubah Cakupan Pendataan ke *Semua lahan* untuk memastikan.

**Angka "Ada Surat" terasa terlalu rendah** — periksa Cakupan Pendataan. Bila disetel *Semua lahan*, penyebutnya ikut memuat lahan yang berkasnya memang belum diunggah.

**Lahan yang saya tahu sudah didata tidak terhitung "sudah didata"** — penandanya adalah **UL Parcel Code**. Berkas unggahan yang tidak membawa kolom `parcel_code` tidak meninggalkan penanda itu (saat mengunggah, sistem memperingatkan bila kolomnya tidak ada). Lengkapi kodenya lewat tab Legalitas di detail lahan.

**Selisih luas menandai lahan yang menurut saya wajar** — ambangnya tetap 0,50 Ha untuk semua ukuran lahan, jadi pada lahan luas selisih segitu memang tidak berarti banyak. Anggap sebagai daftar periksa, bukan daftar kesalahan.
