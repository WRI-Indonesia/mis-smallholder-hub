# Metrik Rilis

[← Menu Data Analyst](README.md) · [← Katalog halaman](../README.md)

Sub menu `dashboard-metrics`, satu halaman: `/admin/dashboard/metrics` (#227). Dashboard internal development — audiens tim/manajemen/donor, bukan data petani. Akses efektif: **SUPERADMIN, ADMIN, dan MANAGEMENT** — bukan "SUPERADMIN saja" seperti tertulis di #227. SUPERADMIN lewat bypass peran di `src/lib/rbac.ts` (bukan kaskade); ADMIN & MANAGEMENT lewat baris VIEW eksplisit di `role-permissions.csv`. MANAGEMENT memang audiens yang dituju: `versioning.md` §Metrik Nilai Rilis menyebut Roadmap % dan Papan KPI untuk manajemen/donor. Dijaga `src/test/menu-access.test.ts` (#262).

## Diagram objek

Layout disederhanakan pada #250 (keputusan owner 2026-08-13, mencabut sebagian spec #227 §3) lalu dirombak **#421** (owner 2026-10-12, "ringkasan dulu, grafik bertab"): **apa yang sudah dirilis & sedang dikejar** → **sehat atau tidak** → **lajunya bagaimana** → **apa isinya**. Dua aturan yang dipegang: tidak ada angka yang tampil dua kali di layar yang sama, dan tidak ada kontrol waktu per chart (sumbu X ketiga grafik harus sebanding).

```text
Halaman: Metrik Rilis (/admin/dashboard/metrics)
├── Header
│   ├── Judul "Metrik rilis" + rentang tanggal + jumlah rilis
│   └── Badge "terukur sejak v0.21.0" + HelpHint
├── Baris ringkasan (lg:grid-cols-2) — #421
│   ├── Rilis terakhir: versi (tautan GitHub Release; tanggal cukup di subjudul halaman); RVS (ⓘ = Tooltip ber-tombol, terjangkau keyboard/sentuh, "+Δ dari rilis ini ·
│   │   anchor v0.9.0 = 1.000") · Progres roadmap (nilai SAAT rilis itu; "kini <x>%" bila roadmap.md sudah bergerak · "<poin>/<maks> poin · <n> fase · baseline lama beku <x>%")
│   │   — Progres roadmap = tombol → akordeon Detail roadmap
│   └── Rilis berjalan (CurrentReleaseCard): `summarizeCurrentRelease(releasePlan, today)` dari sprint.md
│       (rilis berjalan, atau rilis lewat target belum dirilis): versi + judul, target + "hari ke-n/N, sisa n hari"
│       / "lewat n hari", progressbar butir selesai (tanpa Digeser), poin, dikerjakan, menunggu keputusan
│       (kuning); data rencana **hanya dikirim** bila VIEW `data-analyst-sprint` (dicek server, override revoke dihormati) — tanpa akses: keterangan saja
├── Jalur kesehatan (1 baris, 4 sel bergaris rambut) — dipindah ke atas grafik (#421)
│   ├── Bug terbuka (0 → normal; >0 → latar warning)
│   ├── Tech debt aktif + panah arah (hijau turun / kuning naik) — DAPAT DIKLIK → akordeon Tech debt
│   ├── Bantuan (done/total + persen menu ber-tutorial)
│   └── Test otomatis + panah arah (hijau naik) + "+N sejak <rilis terakhir>" (nilai kini vs rilis terakhir; tepat sesudah rilis: "+N di <rilis>") · "awal ≈440"; panah tak tampil tanpa pembanding
│   (kartu **Payload peta DIHAPUS** #421 — terakhir diukur v0.35.0, tak pernah otomatis; riwayat di Daftar rilis)
├── Kartu grafik bertab (Tabs: RVS · Roadmap · Test — label ringkas agar muat 360 px; tinggi 300 px) + kontrol
│   rentang waktu TUNGGAL di kanan (time-window.tsx — berlaku untuk ketiga tab) — dulu tiga grafik 200 px sebaris
│   ├── Rentang: "1 Minggu" · "1 Bulan" · "6 Bulan" · "1 Tahun" · "Semua" (TIME_WINDOWS); menyaring data
│   │   (windowSlice), BUKAN zoom; pilihan setara "Semua" disembunyikan (availableWindows)
│   ├── Kurva RVS — line (TANPA area), sumbu X proporsional kalender, estimasi putus-putus + titik
│   │   berongga, anotasi "mulai diukur", tooltip versi · tanggal · RVS · Δ
│   ├── Progres roadmap — stepped line, plateau, garis TERPUTUS per baseline (#392: "reset <tgl>",
│   │   segmen lama opacity 0,35); tautan "lihat rincian fase" → akordeon Detail roadmap
│   └── Jumlah test — line, anotasi lonjakan terbesar
├── Detail roadmap (collapsible, default tertutup; meta "<Roadmap %> · <jumlah> fase", mis. "8,6% · 26 fase" sejak reset 2026-09-30)
│   ├── Dari mana angkanya — inti (×2, "fase komitmen roadmap") · pendukung (×1) · total poin · Roadmap % + "sisa … pp menuju target roadmap"
│   ├── Sebaran per stream — satu kotak = satu fase, lebar ∝ bobot, panjang baris ∝ porsi stream
│   │   pada total poin; tooltip per fase (status, bobot, poin, "+x pp bila selesai"); legenda berlabel
│   ├── Sisa fase roadmap — satu blok per horizon (#392, `groupRemainingByHorizon`): judul
│   │   "<Horizon> · <periode dari Horizon Definition roadmap.md>" + fase · poin terbuka · +pp bila tuntas;
│   │   baris urut inti → Partial → kode; tiap baris <details> (klik) membuka "Sudah ada" & "Langkah berikutnya"
│   └── Sumber: roadmap.md (parser `src/lib/roadmap.ts`) — angka dihitung, tidak diketik
├── Daftar rilis (collapsible, default TERTUTUP; terbaru di atas)
│   ├── Kolom (8 → 6): versi (link Release GitHub) · tanggal · RVS + Δ menempel · Roadmap (+pt saat
│   │   naik) · Test (+N saat bertambah) · catatan (#ref ter-link; issue yang tak tersebut ikut ditautkan)
│   └── Badge: "belum dirilis" (siklus berjalan) · "perubahan besar" (breaking) — ber-tooltip title
├── Laju RVS per periode (collapsible, default tertutup) — turun dari Panel 2, ISI UTUH
│   ├── Toggle granularitas: Hari · Minggu (default) · Bulan · Tahun
│   ├── 3 seri tetap: Senin–Jumat / Sabtu / Minggu + arsir 45°/135° (a11y) — permintaan eksplisit #227 §4.3
│   ├── Mode Hari dibatasi 90 periode terakhir (retensi)
│   ├── Peringatan periode tepi bisa belum genap di mode Bulan/Tahun
│   ├── Baris statistik: jumlah periode · rata-rata · puncak
│   └── Disclaimer atribusi: perolehan dicatat pada tanggal rilis
└── Tech debt aktif (collapsible, default tertutup; meta "N item")
    ├── Target klik sel Tech debt di jalur kualitas (buka + scroll + sorot sekilas)
    ├── Tabel: ID · Prioritas (badge, P2 amber) · Status · Judul — sumber tech-debt.md
    │   (parser `src/lib/tech-debt.ts`, hanya section "Debt Register — Aktif")
    └── Footer link ke tech-debt.md di GitHub
```

## Referensi teknis

| Aspek | Nilai |
|---|---|
| Menu key | `dashboard-metrics` (parent **`data-analyst`** di database — lihat catatan di [README menu](README.md); label "Metrik Rilis", icon `Activity`, order 5). Route tetap `/admin/dashboard/metrics`. |
| File | `src/app/(admin)/admin/dashboard/metrics/page.tsx` (+ `loading.tsx`) |
| Client | `metrics-dashboard-client.tsx` (orkestrasi + ringkasan Rilis terakhir/berjalan + jalur kesehatan + grafik bertab + akordeon; #421), `time-series-chart.tsx` (kerangka bersama 3 grafik: sumbu, ResizeObserver, tooltip, marka, render-prop anotasi), `rvs-curve-chart.tsx`, `metrics-small-charts.tsx`, `rvs-period-bars.tsx`, `roadmap-detail.tsx`, `time-window.tsx`, `metrics-shared.ts` (palet tervalidasi, formatter id-ID, `windowSlice`, `niceTicks`) |
| Guard | `requirePermission("dashboard-metrics")`; seed RolePermission VIEW untuk ADMIN & MANAGEMENT, SUPERADMIN lewat bypass peran → efektif SUPERADMIN/ADMIN/MANAGEMENT (dijaga `src/test/menu-access.test.ts`) |
| Sumber data | **`docs/project/metrics.md`** + **`docs/project/roadmap.md`** + `docs/project/tech-debt.md`, di-bundle webpack `asset/source` → `src/lib/release-metrics-data.ts` → parser murni `release-metrics.ts` (`parseReleaseMetrics`, `bucketRvsGains`), `roadmap.ts` (`parseRoadmapPhases`, `parseStreamLabels`, `parseHorizonLabels`, `summarizeRoadmap`, `groupRemainingByHorizon`), `tech-debt.ts`; TIDAK ada server action / query DB |
| Validasi | Parser melempar saat format tabel rusak, RVS turun, roadmap turun tanpa catatan, tanggal mundur, baris berjalan bukan terakhir (`src/test/release-metrics.test.ts`); tabel Phase Status: jumlah kolom salah, status/horizon/bobot di luar Definisi, kode fase ganda (`src/test/roadmap.test.ts`) — build/test gagal, bukan salah render |
| Guard konsistensi | `roadmap.test.ts` menghitung ulang Roadmap % dari `roadmap.md` dan membandingkannya dengan baris rilis terakhir `metrics.md`, toleransi **0,1 pp** → menambah/mengubah fase mewajibkan baris metrics.md ikut diperbarui pada rilis yang sama |
| Definisi metrik | `docs/standards/versioning.md` §Metrik Nilai Rilis (#226) |
| Seed menu | `scripts/local/other/seed-dashboard-metrics-menu.ts` (folder gitignored) (dry-run default, `--apply` untuk menulis) + baris `menu.csv` untuk DB baru |
| Aturan estimasi | Baris pra-`MEASURED_FROM_VERSION` (v0.21.0) = estimasi ± → putus-putus/berongga/prefiks ≈; `—` = null, tidak digambar sebagai 0; payload tidak ditarik ke belakang |
| Bantuan | Tutorial `p-8-metrik-rilis.md` (bab Memantau & Menindaklanjuti) |
