# 02 · Kasus uji per issue — v1.3.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Satu **blok** per kasus. Ditulis dev saat menutup issue; dijalankan QA di staging; hasil di `runs/`. Data uji memakai **kode** (Lembaga/lahan), bukan nama orang. Tag: `[P0]` wajib tiap run · `[P1]` · `[P2]`; `[regresi]` = disalin ke `../regression.md` saat rilis ditutup.

Format: `### TC-<issue>-<nn> · <judul> [P0] [regresi] (<menit> mnt)` lalu `Prasyarat:` · `Langkah:` (bernomor) · `Harapan:` (bullet) · opsional `Baseline dev:`.

## #392 — Metrik Rilis disesuaikan dengan reset roadmap

### TC-392-01 · Grafik Progres roadmap terputus per baseline [P1] [regresi] (3 mnt)
Prasyarat: akun SUPERADMIN atau MANAGEMENT; `metrics.md` memuat baris bercatatan "Roadmap direset" (siklus pasca-v1.2.0).
Langkah:
1. Buka **Data Analyst › Metrik Rilis**, rentang waktu **Semua**.
2. Amati grafik **Progres roadmap**; arahkan kursor ke titik terakhir baseline lama lalu ke titik sesudah reset.
3. Pilih rentang **1 Minggu**.
Harapan:
- Tidak ada garis vertikal yang "jatuh" dari ±88% ke ±9%; baseline lama tampil pudar dengan label "baseline lama beku 88,5%", ada garis putus-putus vertikal "reset 30 Sep 2026" dan label "baseline baru 8,6%"; sumbu Y 0–100%.
- Tooltip menyebut baseline titiknya: "baseline lama (dibekukan)" / "awal baseline baru".
- Bila rentang hanya memuat satu baseline, garis tak terputus dan sumbu Y kembali mengikuti data.
Baseline dev: localhost 2026-09-30 sesuai harapan.

### TC-392-02 · Kartu KPI membandingkan dengan rilis terakhir [P1] (2 mnt)
Prasyarat: sama dengan TC-392-01.
Langkah:
1. Baca baris kecil di bawah angka tiga kartu teratas.
2. Arahkan kursor ke kartu Roadmap dan tautan "lihat rincian" di grafik roadmap.
Harapan:
- RVS: "+<Δ> di <rilis terakhir> · anchor v0.9.0 = 1.000"; Test: "+<N> di <rilis terakhir> · awal ≈440"; Roadmap: "<poin>/<maks> poin · <n> fase · baseline lama beku 88,5%".
- Tidak ada lagi "pt sejak v0.9.0", "% dari anchor", atau "48 fase"; jumlah fase di tooltip = jumlah fase di akordeon Detail roadmap.

### TC-392-03 · Sisa fase roadmap dikelompokkan per horizon [P1] (3 mnt)
Prasyarat: sama dengan TC-392-01.
Langkah:
1. Klik kartu **Roadmap** (akordeon Detail roadmap terbuka) lalu gulir ke **Sisa fase roadmap**.
2. Klik satu baris fase, lalu klik lagi.
3. Tekan Tab sampai fokus di sebuah baris lalu tekan Enter.
Harapan:
- Tiga blok berurutan **Now · Kuartal 4 2026 (Okt–Des)**, **Next · Semester 1 2027 (Jan–Jun)**, **Later · Semester 2 2027 (Jul–Des)**, masing-masing dengan jumlah fase · poin terbuka · +pp bila tuntas; di tiap blok fase inti tampil dulu.
- Klik/Enter membuka "Sudah ada" dan "Langkah berikutnya", klik lagi menutupnya.
- Pada layar sempit (ponsel), bobot dan "+pp" turun ke bawah deskripsi, deskripsi tidak terjepit dan tidak ada scroll horizontal.
