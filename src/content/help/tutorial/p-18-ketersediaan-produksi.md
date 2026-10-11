---
title: Melihat bulan mana yang sudah punya data produksi
icon: CalendarRange
menuKey: data-analyst-availability-production
permission: VIEW
duration: 6
href: /admin/data-analyst/availability/production
hrefLabel: Buka Ketersediaan Data — Produksi
goal: Anda tahu Lembaga mana yang data produksinya bolong di bulan apa, sejak kapan tidak melapor, dan petani/lahan mana yang jadi penyebabnya.
---

## Sebelum mulai

Dua halaman Ketersediaan Data lainnya (**Semua Lembaga**, **Per Lembaga**) menjawab *seberapa lengkap* data sebuah Lembaga lewat skor 0–100. Halaman **Produksi** menjawab pertanyaan yang berbeda: **bulan apa saja** yang sudah punya data produksi, dan bulan mana yang bolong.

Bentuknya kalender: satu baris per Lembaga (dikelompokkan di bawah baris **Distrik**-nya), satu kolom per bulan dalam tahun yang dipilih. Angka di tiap sel adalah **persen lahan aktif non-PSR yang punya minimal satu record produksi pada bulan itu**, diwarnai dengan skala yang sama dengan heatmap Ketersediaan Data (merah < 50, kuning 50 – <80, hijau ≥ 80, hijau tua 100).

+ Lahan **PSR** (peremajaan) dikecualikan dari persen karena produksi 0 di lahan yang baru ditanam ulang memang wajar. Lahan PSR tetap tampil di baris lahan, berwarna abu.
+ Record produksi yang **tidak punya ID Lahan** tidak bisa dihitung sebagai "lahan melapor". Jumlahnya tampil terpisah (penanda **TP** dan kolom **TP**) supaya tidak hilang dari pandangan.
+ Angkanya dihitung saat halaman dibuka, bukan snapshot — hasil unggah produksi langsung terlihat setelah halaman dimuat ulang.

## Langkah

1. Buka menu **Data Analyst → Ketersediaan Data → Produksi**.
2. Pilih **Tahun** di kanan atas (bawaan: tahun berjalan). Pilihan tahun hanya tahun yang punya data, plus tahun berjalan. Empat kartu di atas tabel merangkum irisan yang tampil: Tahun, **Cakupan** (rata-rata 12 bulan persen lahan melapor, tertimbang jumlah lahan), **Tanpa record** (Lembaga tanpa satu pun record tahun itu), dan **Basi**.
+ Tahun, filter **Kategori / Distrik / Lembaga**, dan urutan tersimpan di alamat halaman, jadi tampilan bisa di-bookmark atau dikirim ke rekan. Tombol **Reset** (muncul bila ada yang berubah dari bawaan) mengembalikan tahun berjalan, semua filter, urutan cakupan, Per Distrik, dan mengosongkan pencarian.
3. Baca kalender: baris **Distrik** (tebal, bawaan terbuka) adalah gabungan semua Lembaga di kabupaten itu — lahan melapor dan lahan non-PSR dijumlahkan, lalu dipersenkan; klik **▸** di depannya untuk melipat/membuka Lembaga-Lembaganya, atau matikan tombol **Per Distrik** di header tabel untuk daftar Lembaga rata. **Tutup semua** melipat seluruh tingkat sekaligus; **Buka Distrik** mengembalikan ke bawaan (Distrik terbuka, Lembaga tertutup). Baca sel per Lembaga: sel **abu polos** = tidak ada record sama sekali bulan itu; sel **transparan** di kanan (judul bulan diredupkan) = bulan yang belum tiba, jadi bukan data bolong; sel berwarna = ada record, angkanya persen lahan yang melapor. Judul bulan berjalan ditebalkan. Header dan kolom nama tetap terlihat saat tabel digulir. Arahkan kursor ke sel untuk melihat rinciannya: lahan melapor ÷ lahan non-PSR, jumlah record, total kg, dan penanda.
+ Sel abu bertuliskan *n rec* berarti Lembaga/petani itu **tidak punya lahan non-PSR** sehingga persen tidak bisa dihitung — yang ditampilkan jumlah record-nya.
+ Penanda kecil di pojok sel: **E** = ada record berlabel *Estimasi* (hasil impor rekap, bukan angka timbangan), **0** = ada record 0 kg, **TP** = ada record tanpa ID Lahan.
4. Baca kolom ringkasan di kanan — ini memakai **seluruh rentang data**, bukan hanya tahun yang dipilih:
+ **Lahan** = jumlah lahan aktif non-PSR (penyebut persen). **Bulan** = berapa bulan tahun terpilih yang punya data, dengan aturan yang sama dengan penyetahunan produktivitas di Peta BMP dan Detail Lembaga — jadi angka 8/12 di sini sama dengan pembagi Ton/Ha/tahun di sana.
+ **Rentang** = periode pertama – terakhir yang punya record (ditulis singkat, mis. "Jan 25 – Jul 26"). **Jeda** = berapa bulan sejak periode terakhir sampai bulan ini; **merah** berarti basi (≥ 3 bulan, ambang yang sama dengan anomali *produksi basi* di halaman Per Lembaga); kuning bertanda `!` berarti periode terakhirnya melampaui bulan berjalan (kemungkinan salah ketik tahun). **Penanda** = chip **E n%** (persen record Estimasi), **0 n** (record 0 kg), **TP n** (record tanpa ID Lahan); tanda "—" bila bersih.
5. Klik tanda **▸** di depan nama Lembaga untuk membuka daftar **petaninya** (dimuat saat diklik). Baris petani memakai aturan yang sama: persen lahan non-PSR miliknya yang melapor bulan itu. Petani tanpa record sama sekali tetap tampil dengan sel kosong — itulah yang biasanya dicari.
6. Klik **▸** di depan nama petani untuk membuka **lahan-lahannya**. Sel lahan berisi hasil (kg) bulan itu; **0** merah = record 0 kg; **E** = Estimasi. Baris *Tanpa persil* (bila ada) menampung record petani itu yang tidak ber-ID Lahan.
+ Klik angka kg untuk melompat ke **Master Data → Produksi** yang sudah terfilter Lembaga, periode, dan petani tersebut.
+ Label **lain** pada kode lahan berarti lahan itu bukan lahan aktif petani tersebut (milik petani lain atau revisi lama) tetapi ditunjuk oleh record-nya — biasanya ID Lahan salah ketik saat unggah.
7. Ubah **Urut** untuk menata baris (berlaku untuk Distrik maupun Lembaga di dalamnya): *Cakupan tahun terpilih* (bawaan, terendah dulu), *Nama*, *Bulan ber-data*, atau *Periode terakhir*; klik judul kolom yang sama untuk membalik arah. Kotak **Cari** menyaring nama, kode, atau distrik Lembaga.
8. Klik **Excel** (bila punya izin ekspor). Sheet pertama = matriks Lembaga × bulan tahun terpilih beserta kolom ringkasan. Sheet kedua = rincian **lahan × bulan** untuk Lembaga yang sedang dipilih di filter; bila filter Lembaga "Semua", sheet kedua hanya berisi petunjuk untuk memilih satu Lembaga dulu.

> [!hati-hati] Sel kosong berarti **belum ada record di sistem**, bukan berarti kebun tidak panen. Lembaga yang panennya rutin tetap tampil kosong bila hasil panennya belum diunggah lewat **Bulk Upload → Upload Data Produksi**.

## Kalau bermasalah

**Halaman kosong / tidak ada Lembaga** — tidak ada Lembaga dalam cakupan akses Anda, atau filter Distrik/Kategori/Lembaga terlalu sempit. Kembalikan filter ke "Semua".

**Semua sel kosong padahal produksi sudah diunggah** — cek **Tahun** yang dipilih; bawaan tahun berjalan, sedangkan data Anda mungkin tahun lalu. Cek juga kolom **Rentang** untuk melihat periode yang benar-benar ada.

**Persen lebih dari yang saya hitung / mencapai 100 padahal belum semua lahan melapor** — record bisa menunjuk lahan milik petani lain dalam Lembaga yang sama (ID Lahan salah). Buka baris petani → lahan dan cari label **lain**.

**Angka "Bulan" berbeda dengan jumlah sel berwarna** — sel berwarna muncul bila ada record apa pun, sedangkan **Bulan** memakai aturan penyetahunan: bulan dengan hanya record 0 kg tanpa lahan ber-ID tidak dihitung ber-data. Lihat Referensi → *Ketersediaan Data — cara skor dihitung*.

**Tombol Excel tidak ada** — akun Anda tidak punya izin EXPORT untuk menu ini; minta admin bila memang diperlukan.
