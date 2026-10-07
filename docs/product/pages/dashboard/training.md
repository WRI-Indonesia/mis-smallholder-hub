# Dashboard Pelatihan

[← Menu Dashboard](README.md) · [← Katalog halaman](../README.md)

Sub menu `dashboard-training`, satu halaman: `/admin/dashboard/training`.

## Diagram objek

```text
Halaman: Dashboard Pelatihan (/admin/dashboard/training)
├── Header
│   ├── Judul "Dashboard Pelatihan"
│   └── Deskripsi + tanggal generate
├── Filter
│   ├── Distrik (combobox)
│   ├── Lembaga Petani (combobox)
│   └── Tahun (select, default "Semua Tahun")
│   (filter Kategori Ex-Plasma/Swadaya dihapus — #198)
├── Kartu KPI (4) — satu angka besar, pembanding di sub-teks (#198, pola BMP #191)
│   ├── Petani Terlatih
│   ├── Total Sesi
│   ├── Partisipasi Perempuan
│   └── Petani Lulus Post-Test (≥ 60, #214)
├── Card Training Benefit per year (full row, collapsible, #402; selalu tampil; tepat di bawah kartu KPI — owner 2026-10-07)
│   ├── Subjudul berganti per tampilan (definisi Tabel · cara baca Grafis · cara baca A · cara baca B)
│   ├── Toggle dua kelompok: Capaian [Tabel · Grafis] | vs Kontrak [A · B] (state lokal, bawaan Tabel; A & B berdampingan untuk diskusi manajemen 2026-10-08) · ⓘ popover "Cara menghitung" (Tabel/Grafis: aturan hitung, padanan Capaian Paket per Distrik, chip filter) · tombol "Excel (tabel)" (izin EXPORT; selalu format tabel, header dua tingkat)
│   ├── Grafis: bar bertumpuk per baris — panjang = kumulatif t, segmen ≤ t−2 (gelap) · baru t−1 · baru t (terang), angka di segmen bila ≥ 9% trek; trek abu netral; **trek penuh = total petani aktif** (Σ petani Lembaga tersaring) → sisa abu = belum dilatih, tanpa label angka (owner 2026-10-07; jumlahnya di tooltip) (garis acuan putus-putus + ruang 5% dihapus owner 2026-10-07: ruang di kanan garis tak bermakna)
│   ├── Tabel (format donor; header netral — tahun teks biasa, sub-kolom abu; kolom proporsional, rata tengah, Package 34%) paket (P1 · P2 Group Dynamic · P2 HSE · P3) + baris total "Petani pernah mengikuti pelatihan (minimal 1)" × kolom tahun ≤ t−2 · t−1 · t (masing-masing Actual · Kumulative); Kumulative t ditebalkan + latar netral; Actual kolom ≤ t−2 tanpa "+"
│   ├── vs Kontrak A: kartu trayektori per baris kontrak; "≈ sesuai target" bila |selisih| < 1% target; titik target berimpit → cincin di sekeliling titik realisasi
│   └── vs Kontrak B: bar menuju total kontrak + penanda target s.d. t; status ≈/⚠/✓; chip per periode ber-titik hijau (≥ 100%) / amber + "% dari target", tahun mendatang putus-putus "belum mulai"
├── Card Capaian Paket per Distrik (full row, collapsible, #198; tersembunyi saat filter Lembaga aktif)
│   ├── Legend Sudah/Belum
│   ├── Tabel paket × distrik (baris = paket + Pernah Ikut Pelatihan; kolom = Total (Riau) lalu distrik, header memuat total petani; lebar kolom seragam)
│   ├── Sel: % di kiri + stacked bar tebal (sudah di segmen hijau, belum di segmen abu)
│   └── Empty state
├── Matriks Capaian Paket per Lembaga (collapsible)
│   ├── Kolom Lembaga Petani
│   ├── Kolom Petani
│   ├── Kolom paket (dinamis)
│   ├── Kolom Pernah Ikut Pelatihan
│   ├── Heatmap sel (klik → dialog drill-down)
│   ├── Legenda skala
│   └── Empty state
├── Chart tren kehadiran
│   ├── Stacked bar per paket
│   ├── Tooltip hover
│   ├── Legenda warna paket
│   └── Empty state
├── Panel efektivitas pre/post-test
│   ├── Baris per paket (bar Pre / Post)
│   ├── Catatan per paket
│   └── Empty state
├── Panel kualitas data (baris kedua, 2/3 kiri — sejajar panel kelulusan)
│   ├── Sesi tanpa bukti
│   ├── Sesi tanpa lokasi
│   ├── Sesi tanpa peserta
│   ├── Peserta tanpa skor lengkap
│   └── Link ke Master Data Pelatihan
├── Panel kelulusan post-test per paket (#214, baris kedua, 1/3 kanan — di bawah panel efektivitas)
│   ├── Baris per paket (stacked bar lulus vs belum, basis petani unik)
│   └── Empty state
└── Dialog drill-down petani belum dilatih
    ├── Tabel (ID Petani / Nama / L-P)
    ├── Tombol "Salin"
    ├── Tombol "Excel"
    ├── Loading state
    └── Empty state
```

## Atribut halaman

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/dashboard/training/page.tsx` |
| Tipe | Server Component → `TrainingDashboardClient` (Client Component) |
| Komponen anak | `training-dashboard-client.tsx`, `training-score-cards.tsx`, `training-district-panel.tsx`, `training-coverage-matrix.tsx`, `training-trend-chart.tsx`, `training-effectiveness-panel.tsx`, `training-pass-panel.tsx`, `training-quality-panel.tsx`, `training-untrained-modal.tsx`, `loading.tsx` |
| Guard | `requirePermission("dashboard-training")` (halaman); `hasPermission("dashboard-training", "VIEW")` + `getAccessContext()` di action |
| Server action / data | `getTrainingDashboardView()` dari `src/server/actions/dashboard-training.ts` — query langsung ke DB (bukan snapshot), difilter `isActive` + access context; `getUntrainedFarmers(groupId, packageCode, year)` untuk dialog drill-down |
| Helper agregasi | `filterTrainingGroups`, `trainingTotals`, `trainingCoverageMatrix`, `trainingActivePackages`, `trainingTrendSeries`, `trainingScoreRows`, `trainingQualityStats`, `trainingAvailableYears`, `trainingTargetGap` / `TRAINING_COVERAGE_TARGET`, `TRAINING_PASS_SCORE` (ambang lulus post-test = 60, #214) dari `src/lib/training-dashboard-aggregation.ts` |
| Persistensi filter | `useUrlFilters()` (`src/hooks/use-url-filters.ts`, TD-021) — filter disimpan di query string, kunci `distrik`, `lembaga`, `tahun` (param lama `kategori` diabaikan sejak #198); via History API `replaceState` (bukan `router.replace`, agar tidak memicu ulang payload RSC); nilai kosong dihapus dari query |
| Uji performa | `src/test/perf.test.ts` (TD-020) — agregat (KPI + matriks + tren + skor) diuji pada fixture 60.000 baris kehadiran, ambang < 1.200 ms; pagar sebelum menimbang beralih ke pola snapshot |
| Icon menu | `GraduationCap` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Panduan` | Tautan | `HelpHint` — ikon `?` di header menuju tutorial Bantuan untuk `dashboard-training` (`findTutorialForMenu`), dibuka di tab baru |
| Judul halaman | Heading `h1` | "Dashboard Pelatihan" |
| Deskripsi | Teks | "Cakupan & efektivitas program pelatihan petani — data per {tanggal generate}" |
| Filter Distrik | Combobox (Popover + Command) | "Cari distrik..."; opsi "Semua Distrik"; empty: "Distrik tidak ditemukan." |
| Filter Lembaga Petani | Combobox (Popover + Command) | "Cari lembaga petani..."; opsi "Semua Lembaga Petani"; empty: "Lembaga petani tidak ditemukan." |
| Filter Tahun | Select | Default "Semua Tahun" (kumulatif) + daftar tahun dari data |
| Perilaku filter | Catatan | Nilai tersimpan di URL (`?distrik=…&lembaga=…&tahun=…`) sehingga bisa di-bookmark/dibagikan; hanya mengubah Distrik yang mereset Lembaga (`setMany`); `distrik`/`lembaga` divalidasi terhadap data yang ada (lembaga nonaktif/tak dikenal diabaikan → "Semua", bukan tampilan kosong), sedangkan `tahun` hanya divalidasi formatnya (4 digit, `/^\d{4}$/`) — tahun berformat benar tapi tanpa data tetap dipakai |
| Kartu KPI (4 kartu) | Kartu KPI | Lihat rincian di bawah |
| Card Capaian Paket per Distrik | Tabel stacked bar (collapsible) | Hanya tampil saat filter Lembaga kosong (`!groupId`); lihat rincian di bawah |
| Matriks cakupan | Tabel heatmap (collapsible) | Lihat rincian di bawah |
| Chart tren kehadiran | Stacked bar chart (SVG kustom) | Lihat rincian di bawah |
| Panel efektivitas pre/post-test | Panel bar horizontal | Lihat rincian di bawah |
| Panel kelulusan post-test | Panel stacked bar | Lihat rincian di bawah |
| Panel kualitas data | Panel 4 kartu ringkas | Lihat rincian di bawah |
| Dialog petani belum dilatih | Dialog drill-down | Dibuka dari sel matriks; lihat rincian di bawah |

## Kartu KPI (`TrainingScoreCards`)

| # | Judul kartu | Nilai | Sub |
|---|---|---|---|
| 1 | Petani Terlatih | "{terlatih}" | "{persen} dari total {total petani} petani aktif pernah ikut ≥1 pelatihan ({label tahun})" |
| 2 | Total Sesi | "{n}" | "sesi pelatihan ({label tahun})" |
| 3 | Partisipasi Perempuan | persen | "{n} dari total {n} kehadiran ({label tahun})" |
| 4 | Petani Lulus Post-Test | "{n}" atau "—" | "{persen} dari {n} petani terlatih mencapai post-test ≥ 60 ({label tahun})" / "belum ada peserta dengan pre & post terisi" |

Satu angka besar per card, pembanding di sub-teks dengan token beraksen `StatEmph` (`src/components/shared/stat-emph.tsx`, pola KPI BMP #191). Card "Kehadiran vs Petani Unik" **dihapus** (#198, keputusan owner — petani unik sudah diwakili card Cakupan). Card "Rata-rata Kenaikan Skor" **diganti** card Petani Lulus Post-Test (#214) — mengikuti indikator impact "# of smallholders demonstrating knowledge at or above a defined proficiency threshold (≥60 on post-test)", basis **petani unik** (lulus bila ≥1 post-test-nya ≥ 60), dengan pembagi persentase = **petani terlatih** (angka card 1, revisi owner) sehingga petani tanpa skor terhitung belum lulus. Kolom matriks cakupan diberi lebar seragam agar grid sel simetris.

## Card Capaian Paket per Distrik (`TrainingDistrictPanel`, #198)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Collapsible trigger | "Capaian Paket per Distrik" (default terbuka; ringkasan saat dilipat: jumlah distrik + % pernah ikut pelatihan) + legend Sudah/Belum (kanan bawah). Card **disembunyikan saat filter Lembaga aktif** (roll-up distrik atas satu Lembaga tidak bermakna); kolom Total (Riau) disembunyikan bila hanya 1 distrik |
| Tabel | Paket × distrik (transposisi, revisi owner) | Baris = paket + Pernah Ikut Pelatihan (baris agregat ber-latar `bg-muted/40` + pemisah atas tegas — pembeda struktural, bar tetap emerald konsisten legend); kolom = **Total (Riau)** (agregat scope, ber-border pemisah; disembunyikan bila hanya 1 distrik dalam scope) lalu distrik (header memuat total petani); roll-up via `trainingDistrictCoverage` (Σ antar Lembaga aman — petani milik tepat satu Lembaga); lebar kolom distrik seragam |
| Sel | Stacked bar tebal | Persen di kiri luar bar; segmen hijau memuat jumlah sudah, segmen abu memuat jumlah belum; "muat"-nya label diukur dari lebar piksel segmen via container query (≥3rem), bukan persen (#205); distrik tanpa petani → "—" |
| Tooltip sel | Tooltip terstruktur (Base UI) | Menggantikan `title` native (#205): judul "{paket} — {distrik / Total (Riau)}", baris per segmen (chip warna + label + jumlah + persen), footer "dari {n} petani aktif" — isi mengikuti mode tanpa/dengan filter Tahun |
| Sel saat filter Tahun aktif | Stacked bar 3 segmen | Hijau tua = dilatih **tahun terpilih** (persen kiri mengacu segmen ini), hijau muda = dilatih **hanya di tahun lain** (`byPackageOtherYears`/`anyPackageOtherYears` dari `trainingCoverageMatrix` — petani dilatih di kedua kelompok tahun dihitung sekali di "tahun ini"), abu = **belum pernah dilatih**. Legend & catatan kaki menyesuaikan ("Dilatih {tahun} · Tahun lain · Belum pernah"). Angka dilatih tahun terpilih selalu tampil: di dalam segmen hijau tua bila muat, bila sempit menempel tepat setelah batas segmen; angka "tahun lain" rata kanan segmennya dan butuh ruang lebih (≥6rem) agar tak bertabrakan (#205). Cakupan kumulatif — petani yang dilatih tahun lain tidak terhitung "belum" |
| Empty state | Teks | "Tidak ada distrik pada filter ini." |

Label tahun: "semua tahun" atau "{YYYY}".

## Card Training Benefit per year (`TrainingBenefitPanel`, #402)

| Hal | Aturan (keputusan owner 2026-10-07) |
|---|---|
| Satuan | Petani **unik** per paket, dihitung per Lembaga (kunci Lembaga+petani) — sama dengan matriks cakupan |
| Actual | Penerima manfaat **baru**: tahun pertama petani dilatih paket itu jatuh di kolom tsb |
| Kumulative | Petani yang tahun pertamanya ≤ tahun kolom → Kumulative(t) = Kumulative(t−1) + Actual(t) |
| Kolom tahun | Bergeser otomatis: ≤ (t−2) · t−1 · t, t = tahun berjalan (2026: ≤2024 · 2025 · 2026); kegiatan bertanggal > t diabaikan |
| Paket & label | 4 paket, label tabel rujukan owner: P1 \| BMP, P&C RSPO, HCV · P2 \| Group Dynamic (MK) · P2 \| HSE · P3 \| GEDSI, Alternative Livelihood, Business Development (Paket 3 & 4); `OTHER` tidak dilaporkan |
| Filter | Distrik & Lembaga; filter Tahun diabaikan |
| Baris total | "Petani pernah mengikuti pelatihan (minimal 1)" (permintaan owner 2026-10-07; label diganti owner hari yang sama, semula "Petani mengikuti ≥ 1 pelatihan"): tahun pertama petani ikut pelatihan **apa pun, termasuk Lainnya** — padanan baris "Pernah Ikut Pelatihan" |
| Konsistensi | Kumulative t = Σ "sudah dilatih" per paket di Capaian Paket per Distrik tanpa filter tahun; baris total = "Pernah Ikut Pelatihan" (dikunci test) |
| Ekspor | Excel sheet "Training Benefit", header dua tingkat ber-merge, berkas `training-benefit-per-year_<Lembaga\|Distrik\|semua>_<t>.xlsx` |
| Fungsi | `trainingBenefitPerYear(groups, t)` · `trainingBenefitYears(t)` — `src/lib/training-dashboard-aggregation.ts` |

Terverifikasi 2026-10-07 (mis-dev): Kumulative 2026 P1 8.279 · MK 7.769 · HSE 8.076 · P3 3.756 · ≥ 1 pelatihan 8.401 = Total Capaian Paket per Distrik.

### Tampilan vs Kontrak (A) & (B) (#403)

Target kontrak dari Master Data › Target Program ([program-target.md](../master-data/program-target.md)) vs realisasi penerima manfaat baru, **per paket** (owner 2026-10-07): P1 · P2 Group Dynamic · P2 HSE · P3 · Petani pernah mengikuti pelatihan (pelatihan apa pun, = baris total kartu); Start ↔ kumulatif s.d. tahun baseline; hanya tahun bertarget; realisasi ikut filter Distrik/Lembaga dengan catatan amber. Fungsi data: `programContractRows` (`src/lib/program-target.ts`).

| Tab | Isi |
|---|---|
| **(A)** trayektori | 5 grafik kecil (grid 1/2/3 kolom), **skala sumbu Y sama** agar tinggi garis antarpaket bisa dibandingkan; kotak "pernah mengikuti" ditonjolkan (bingkai hijau). Tiap kotak: judul kecil, angka besar "realisasi dari total kontrak" + % besar (target kosong → "target belum diisi"); grafik SVG — garis putus-putus = target kumulatif (Start → tahun), garis tegas = realisasi kumulatif s.d. tahun berjalan (tahun mendatang tanpa titik realisasi), pita tahun berjalan, label "tertinggal N" / "+N di atas target" / "≈ sesuai target". Legenda; tanpa baris total hitungan (menjumlah paket menghitung petani berkali-kali) |
| **(B)** progres | Per paket (baris "pernah mengikuti" dipisah garis di bawah): % besar, bar realisasi vs total kontrak + garis penanda target s.d. tahun berjalan, status ≈ / ⚠ tertinggal / ✓, chip per periode ber-titik hijau (tercapai) / amber (di bawah) + "% dari target"; tahun mendatang "belum mulai". Dibiarkan berdampingan dengan (A) sampai manajemen memilih |

Catatan kaki definisi kartu disembunyikan di kedua tab ini. Target gagal dimuat → pesan di tab ini saja; belum ada target → arahan ke Master Data › Target Program.

## Matriks cakupan (`TrainingCoverageMatrix`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Collapsible trigger | "Capaian Paket per Lembaga" (ikon `Grid3x3`, default terbuka; judul final #198) |
| Sub-judul (terbuka) | Teks | "% petani aktif Lembaga yang sudah mengikuti paket tersebut, dibaca terhadap target program. Klik judul kolom untuk mengurutkan; klik sel yang belum mencapai target untuk melihat daftar petaninya." |
| Sub-judul (terlipat) | Ringkasan | "{n} Lembaga · {p}% petani terlatih" + " · {n} Lembaga belum tersentuh" (bila ada) + " · kurang {n} petani menuju target" (bila ada) |
| Kolom "Lembaga Petani" | Kolom tabel (sortable) | Nama + baris kecil "{kode} · {distrik}" |
| Kolom "Petani" | Kolom tabel (sortable) | Jumlah petani aktif Lembaga |
| Kolom paket | Kolom tabel (sortable, dinamis) | Header ringkas: "Paket 1", "Paket 2 - MK", "Paket 2 - HSE", "Paket 3 & 4", "Lainnya" — hanya paket yang aktif pada irisan; sel = persen + jumlah petani; tooltip header = label paket lengkap |
| Kolom "Pernah Ikut Pelatihan" | Kolom tabel (sortable) | Petani yang pernah mengikuti minimal 1 paket pelatihan (target 100%); sel diberi ring pembeda |
| Heatmap sel | Skala warna | 0% (rose), <25%, 25–49%, 50–74%, 75–99%, 100% (gradasi emerald, 100%/tuntas paling tua — #194); Lembaga tanpa petani aktif = sel abu "—" |
| Tooltip sel | Tooltip terstruktur (`StatTooltip`, #213) | Judul = label paket + subtitle nama Lembaga; baris chip+jumlah+persen: tanpa filter Tahun "Sudah ikut"/"Belum", dengan filter Tahun "Ikut {tahun}"/"Ikut tahun lain"/"Belum pernah" (#202, chip sinkron warna segmen bar Distrik); footer "dari {n} petani aktif" + baris target ("Kurang {n} menuju target {t}% — klik sel untuk daftar petaninya" / "Target {t}% tercapai" / "Di luar paket program — tanpa target"); Lembaga tanpa petani aktif → footer khusus |
| Sel dapat diklik | Tombol | Aktif hanya bila Lembaga punya petani aktif dan masih ada kekurangan menuju target → membuka dialog drill-down |
| Legenda skala | Legend | "Skala:" 0% · <25% · 25–49% · 50–74% · 75–99% · 100% (catatan "Target program … kurang N petani" di kanan legenda dihapus — ambigu, #194) |
| Empty state | Teks | "Tidak ada Lembaga Petani pada filter ini." |

Target cakupan per paket: `TRAINING_COVERAGE_TARGET` — Paket 1, Paket 2 - MK, Paket 2 - HSE, Paket 3 & 4 = 100%; `OTHER` (Lainnya) tanpa target (`null`).

## Dialog drill-down (`TrainingUntrainedModal`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul dialog | Dialog title | Nama Lembaga + sub "Petani belum mengikuti {paket} — {tahun / semua tahun}" |
| Data | Server action | `getUntrainedFarmers(groupId, packageCode \| "ANY", year)` |
| Loading | Spinner | "Memuat daftar petani..." |
| Tabel | Tabel scrollable | Kolom "ID Petani" (mono), "Nama", "L/P" (`F` → P, selain itu L); saat filter Tahun aktif + kolom "Tahun Lain" — badge **"Dilatih {tahun}"** bila petani pernah dilatih paket tsb di luar tahun terpilih (`lastTrainedOtherYear`, #202), "—" bila belum pernah |
| Ceklis saring | Checkbox | "Hanya yang belum pernah sama sekali mengikuti paket ini" — tampil saat filter Tahun aktif & ada baris ber-badge; menyaring tabel + Salin + Excel ke `lastTrainedOtherYear == null`; ringkasan berubah jadi "{n} petani · dari {total} baris irisan tahun ini" (#202) |
| Ringkasan | Teks | "{n} petani"; saat filter Tahun aktif + "· {x} pernah dilatih di tahun lain" bila ada |
| Tombol "Salin" | Tombol | Salin baris `ID\tNama\tL/P` (+ kolom tahun lain saat filter Tahun aktif) ke clipboard; toast "{n} baris disalin" / "Gagal menyalin — izin clipboard ditolak browser" — digate izin `EXPORT` (menyalin dataset yang sama dengan Excel) |
| Tombol "Excel" | Tombol | `exportToExcel` → `petani-{slug}-{nama-lembaga}.xlsx`, sheet "Belum Dilatih", kolom ID Petani / Nama Petani / L/P (+ "Dilatih Tahun Lain" saat filter Tahun aktif); toast "Excel diunduh" / "Gagal membuat file Excel" — digate izin `EXPORT` (#245) |
| Empty state | Teks | "Semua petani aktif di Lembaga ini sudah mengikuti pelatihan tersebut." |

## Chart tren (`TrainingTrendChart`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Tren Kehadiran Pelatihan — {label tahun}" |
| Deskripsi | Teks | "Tinggi batang = jumlah kehadiran (peserta per sesi), dipecah per paket." |
| Seri | Stacked bar | Kehadiran per bucket (per tahun bila "Semua Tahun", per bulan bila satu tahun dipilih), disegmen per paket |
| Warna paket | Legend | Paket 1 `#16a34a`, Paket 2 - MK `#0ea5e9`, Paket 2 - HSE `#f97316`, Paket 3 & 4 `#8b5cf6`, Lainnya `#94a3b8` |
| Tooltip hover | Tooltip | Label bucket, "{n} sesi · {n} kehadiran", rincian per paket |
| Empty state | Teks | "Belum ada data pelatihan pada filter ini." |

## Panel efektivitas (`TrainingEffectivenessPanel`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Efektivitas Pre / Post-Test" |
| Deskripsi | Teks | "Hanya peserta dengan skor pre dan post terisi yang dihitung." |
| Baris per paket | Bar horizontal | Label paket lengkap ("Paket 1 — BMP/PC/RSPO/NKT", "Paket 2 — MK", "Paket 2 — HSE (K3)", "Paket 3 & 4 — GEDSI/BusDev", "Lainnya") + selisih "+/−{n}" (hijau bila naik, merah bila turun) |
| Bar "Pre" / "Post" | Bar | Rata-rata skor; skala relatif skor tertinggi yang muncul |
| Catatan per paket | Teks | "{n} dari {n} kehadiran ber-skor · {n} turun · {n} tetap" |
| Empty state | Teks | "Belum ada peserta dengan skor pre & post terisi." |

## Panel kelulusan (`TrainingPassPanel`, #214)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Kelulusan Post-Test per Paket" (baris kedua kolom kanan, di bawah panel efektivitas, sejajar panel Kualitas Data yang menempati 2/3 kiri) |
| Deskripsi | Teks | "Petani unik ber-skor — lulus bila salah satu post-test-nya ≥ 60." |
| Baris per paket | Stacked bar | Label paket lengkap + persen lulus di kanan; bar dua segmen: lulus (emerald) vs belum lulus (amber), celah 2px antar segmen |
| Catatan per paket | Teks | "{n} lulus · {n} belum lulus · dari {n} petani ber-skor" |
| Empty state | Teks | "Belum ada peserta dengan skor pre & post terisi." |

Basis **petani unik per paket** (bukan kehadiran, beda dari panel efektivitas): petani yang ber-skor di beberapa sesi paket yang sama dihitung sekali, lulus bila salah satu post-test-nya mencapai ambang.

## Panel kualitas data (`TrainingQualityPanel`)

| Objek | Tipe | Keterangan |
|---|---|---|
| Judul | Heading kartu | "Kualitas Data" |
| Deskripsi | Teks | "Kelengkapan pengisian pada irisan yang sedang tampil." |
| "Sesi tanpa bukti" | Kartu ringkas | Nilai + "{persen} dari {total sesi}"; disorot amber bila > 0 |
| "Sesi tanpa lokasi" | Kartu ringkas | idem |
| "Sesi tanpa peserta" | Kartu ringkas | idem |
| "Peserta tanpa skor lengkap" | Kartu ringkas | Nilai + "{persen} dari {total kehadiran}" |
| Link tindak lanjut | Link | "Buka Master Data Pelatihan untuk melengkapi →" → `/admin/master-data/training` |
