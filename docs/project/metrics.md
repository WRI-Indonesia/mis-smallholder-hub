# Proyek — Metrik per Rilis

> Bagian dari dokumentasi **Proyek**. Indeks: [../README.md](../README.md) · Terkait: [roadmap.md](./roadmap.md) · [changelog.md](./changelog.md) · [../standards/versioning.md](../standards/versioning.md)

Satu baris per rilis — riwayat **Metrik Nilai Rilis** sekali pandang. Definisi, formula, dan bobot: [`standards/versioning.md`](../standards/versioning.md) §Metrik Nilai Rilis (#226). Baris baru ditambahkan **saat rilis** (butir Checklist Rilis).

**Cara baca:**

- **Roadmap %** — progres tertimbang menuju go-live 1.0 (inti ×2, pendukung ×1; ✅=1, 🟠=0,5).
- **KPI** ditulis ringkas: `payload peta · Bantuan · test · bug open · TD aktif`. `—` = tidak terukur/tak tercatat pada masanya (tidak direka-reka).
- **RVS** — kumulatif, anchor **v0.9.0 = 1000** (rilis SemVer pertama).
- Baris v0.9.0–v0.21.0 adalah **rekonstruksi retrospektif dari changelog** (fase Done, issue, jumlah test yang tercatat): Roadmap % dan test cukup akurat; **RVS lama = estimasi kasar (±)** — gunakan untuk bentuk tren, bukan angka presisi. Mulai v0.22.0 semua angka dihitung saat rilis.

## Tabel Metrik per Rilis

| Rilis | Tanggal | Roadmap % | KPI (payload · Bantuan · test · bug · TD) | RVS | Δ | Catatan |
| ----- | ------- | --------- | ----------------------------------------- | --- | -- | ------- |
| v0.9.0 | 2026-07-15 | 71,0% | — · — · ±440 · — · — | 1000 | anchor | Rilis SemVer pertama + standar versioning |
| v0.10.0 | 2026-07-15 | 73,5% | — · — · ±450 · — · — | ±1050 | +50 | DASH-04 BMP Dashboard Done |
| v0.11.0 | 2026-07-15 | 73,5% | — · — · ±455 · — · — | ±1068 | +18 | Filter Kelengkapan Data BMP |
| v0.12.0 | 2026-07-16 | 73,5% | — · — · ±464 · — · — | ±1119 | +51 | ISPO + Assurance SAP/MAP + card sertifikasi (aturan 1 rilis/hari lahir) |
| v0.13.0 | 2026-07-17 | 75,9% | — · — · ±480 · — · — | ±1174 | +55 | MAP-03 Produktivitas per persil Done |
| v0.14.0 | 2026-07-20 | 78,4% | — · — · 519 · — · — | ±1244 | +70 | RPT-05 Laporan Lahan (PDF peta vektor) Done |
| v0.15.0 | 2026-07-21 | 83,3% | — · — · ±640 · — · — | ±1339 | +95 | DASH-06 Dashboard Pelatihan + HELP-02 Tutorial Done |
| v0.16.0 | 2026-07-22 | 83,3% | — · — · 673 · — · — | ±1449 | +110 | Role DONOR, perombakan Settings, popup standar #188, hierarki 3-level #189 (breaking) |
| v0.17.0 | 2026-07-28 | 85,8% | — · — · 702 · 0 · 10 | ±1509 | +60 | Dashboard Ketersediaan Data Done; 7/7 bug register selesai |
| v0.18.0 | 2026-07-31 | 85,8% | — · — · 724 · 0 · 10 | ±1559 | +50 | Fix crash bulk upload sel error + 3 perbaikan |
| v0.19.0 | 2026-08-01 | 85,8% | — · — · 727 · 0 · 10 | ±1599 | +40 | Detail Lahan dirombak + Kelengkapan Data n/8 |
| v0.20.0 | 2026-08-04 | 85,8% | — · 23/28 · 742 · 0 · 10 | ±1649 | +50 | Kartu dashboard klik → dialog rincian; audit Bantuan 18→23/28 |
| v0.21.0 | 2026-08-05 | 85,8% | 2,67 MB · 23/28 · 748 · 0 · 12 | ±1774 | +125 | Filter konsisten #211/#212, tooltip #213, KPI lulus #214, migrasi overlay darurat #215, GIS custom #219/#220. **Mulai titik ini angka diukur, bukan estimasi** |
| v0.22.0 | 2026-08-06 | 85,8% | 1,67 MB · 24/29 · 778 · 0 · 12 | 1903 | +129 | #222 popup auto-pan · #223 payload −37,4% · #224 · #225 audit performa · #226 metrik · #227 dashboard Metrik Rilis · #228 catatan sesi pelatihan · #229 review putaran 2 |
| v0.22.1 | 2026-08-08 | 86,1% | 1,67 MB · 24/29 · 778 · 0 · 13 | 1918 | +15 | #234 label "Pernah Ikut Pelatihan" · #233-A cleanup dead code · #235 audit issue/TD. Roadmap % naik karena **koreksi baseline** (DA-03 masuk Phase Status, 46→47 fase — Decision Log 2026-08-08), bukan fase baru Done. Payload dibawa dari v0.21.0 (tak ada perubahan kode peta); TD 12→13 = koreksi hitung + TD-032 |
| _(siklus berjalan)_ | — | 86,1% | — · — · — · — · — | 1918 | — | (belum ada — siklus pasca-v0.22.1) |

## Aturan pengisian

1. Hitung saat rilis (bersamaan entri rilis changelog), sesuai formula di `standards/versioning.md`.
2. Baris _(siklus berjalan)_ diganti menjadi baris rilis resmi saat versinya dirilis.
3. KPI yang tak diukur di rilis itu ditulis `—`, jangan menebak.
4. Perubahan bobot/formula dicatat di Decision Log; jangan menghitung ulang baris lama (tren harus konsisten ke belakang, cukup beri catatan).
