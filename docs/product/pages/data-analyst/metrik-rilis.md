# Metrik Rilis

[← Menu Data Analyst](./README.md) · [← Katalog halaman](../README.md)

Sub menu `dashboard-metrics`, satu halaman: `/admin/dashboard/metrics` (#227). Dashboard internal development — audiens tim/manajemen/donor, bukan data petani. Akses **SUPERADMIN saja** (tanpa baris RolePermission; role lain via Role & Permission bila diputuskan).

## Diagram objek

Layout disederhanakan pada #250 (keputusan owner 2026-08-13, mencabut sebagian spec #227 §3): halaman disusun mengikuti tiga pertanyaan berurutan — **sekarang di mana** → **lajunya bagaimana** → **apa isinya**. Dua aturan yang dipegang: tidak ada angka yang tampil dua kali di layar yang sama, dan tidak ada kontrol waktu per chart (sumbu X ketiga grafik harus sebanding).

```text
Halaman: Metrik Rilis (/admin/dashboard/metrics)
├── Header
│   ├── Judul "Metrik rilis" + rentang tanggal + jumlah rilis
│   └── Badge "terukur sejak v0.21.0" + HelpHint
├── Baris KPI (3 kartu, auto-fit) — kartu "Kualitas" DIHAPUS (mengulang jalur kualitas di bawah)
│   ├── RVS sekarang (+% dari anchor 1000)
│   ├── Roadmap (% tertimbang, +pt sejak v0.9.0, sisa pp) — DAPAT DIKLIK → akordeon Detail roadmap
│   └── Test otomatis (+% dari baseline ≈)
├── Kontrol rentang waktu TUNGGAL (time-window.tsx)
│   ├── Menyaring data (windowSlice), BUKAN zoom kanvas → sumbu X ketiga grafik identik
│   └── Pilihan yang sudah setara "Semua" disembunyikan mengikuti umur data (availableWindows)
├── Tiga grafik sebaris (lg:grid-cols-3) di atas kerangka bersama time-series-chart.tsx
│   ├── Kurva RVS — line (TANPA area: domain Y ikut data, area ber-baseline terpotong menyesatkan)
│   │   ├── Sumbu X waktu PROPORSIONAL kalender (jeda antar rilis terlihat)
│   │   ├── Estimasi (pra-v0.21.0): ruas garis putus-putus + titik berongga
│   │   ├── Anotasi vertikal "mulai diukur" — hanya bila rilis terukur pertama ada di rentang
│   │   └── Tooltip hover: versi · tanggal · RVS (≈ bila estimasi) · Δ
│   ├── Progres roadmap — stepped line, domain Y dinamis ±margin clamp 0–100, shading + label
│   │   plateau (plateau dihitung dari SELURUH riwayat, digambar terpotong di tepi rentang)
│   │   └── Aksi "lihat rincian" di kanan judul → akordeon Detail roadmap
│   └── Jumlah test — line, sumbu Y mengikuti data, anotasi lonjakan terbesar; warna = seri RVS
├── Jalur Kualitas (1 baris, 4 sel bergaris rambut — dulu 4 kartu setinggi KPI)
│   ├── Bug terbuka (0 → normal; >0 → latar warning)
│   ├── Tech debt aktif + indikator arah (naik/turun/tetap) — DAPAT DIKLIK → akordeon Tech debt
│   ├── Audit Bantuan (done/total + persen menu ber-tutorial)
│   └── Payload peta (delta 2 titik terukur — sengaja bukan grafik)
├── Detail roadmap (collapsible, default tertutup; meta "87,1% · 48 fase")
│   ├── Dari mana angkanya — inti (×2) · pendukung (×1) · total poin · Roadmap % + sisa pp
│   ├── Sebaran per stream — satu kotak = satu fase, lebar ∝ bobot, panjang baris ∝ porsi stream
│   │   pada total poin; tooltip per fase (status, bobot, poin, "+x pp bila selesai"); legenda berlabel
│   ├── Sisa menuju 1.0 — chip per Horizon (jumlah fase + total pp) lalu tabel peringkat pp menurun
│   │   dengan evidence & next step tiap fase non-Done
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
| Menu key | `dashboard-metrics` (parent **`data-analyst`** di database — lihat catatan di [README menu](./README.md); label "Metrik Rilis", icon `Activity`, order 4). Route tetap `/admin/dashboard/metrics`. |
| File | `src/app/(admin)/admin/dashboard/metrics/page.tsx` (+ `loading.tsx`) |
| Client | `metrics-dashboard-client.tsx` (orkestrasi + KPI + jalur kualitas + akordeon), `time-series-chart.tsx` (kerangka bersama 3 grafik: sumbu, ResizeObserver, tooltip, marka, render-prop anotasi), `rvs-curve-chart.tsx`, `metrics-small-charts.tsx`, `rvs-period-bars.tsx`, `roadmap-detail.tsx`, `time-window.tsx`, `metrics-shared.ts` (palet tervalidasi, formatter id-ID, `windowSlice`, `niceTicks`) |
| Guard | `requirePermission("dashboard-metrics")`; tanpa seed RolePermission → efektif SUPERADMIN-only (bypass) |
| Sumber data | **`docs/project/metrics.md`** + **`docs/project/roadmap.md`** + `docs/project/tech-debt.md`, di-bundle webpack `asset/source` → `src/lib/release-metrics-data.ts` → parser murni `release-metrics.ts` (`parseReleaseMetrics`, `bucketRvsGains`), `roadmap.ts` (`parseRoadmapPhases`, `parseStreamLabels`, `summarizeRoadmap`), `tech-debt.ts`; TIDAK ada server action / query DB |
| Validasi | Parser melempar saat format tabel rusak, RVS turun, roadmap turun tanpa catatan, tanggal mundur, baris berjalan bukan terakhir (`src/test/release-metrics.test.ts`); tabel Phase Status: jumlah kolom salah, status/horizon/bobot di luar Definisi, kode fase ganda (`src/test/roadmap.test.ts`) — build/test gagal, bukan salah render |
| Guard konsistensi | `roadmap.test.ts` menghitung ulang Roadmap % dari `roadmap.md` dan membandingkannya dengan baris rilis terakhir `metrics.md`, toleransi **0,1 pp** → menambah/mengubah fase mewajibkan baris metrics.md ikut diperbarui pada rilis yang sama |
| Definisi metrik | `docs/standards/versioning.md` §Metrik Nilai Rilis (#226) |
| Seed menu | `scripts/local/seed-dashboard-metrics-menu.ts` (dry-run default, `--apply` untuk menulis) + baris `menu.csv` untuk DB baru |
| Aturan estimasi | Baris pra-`MEASURED_FROM_VERSION` (v0.21.0) = estimasi ± → putus-putus/berongga/prefiks ≈; `—` = null, tidak digambar sebagai 0; payload tidak ditarik ke belakang |
| Bantuan | Tutorial `p-8-metrik-rilis.md` (bab Memantau & Menindaklanjuti) |
