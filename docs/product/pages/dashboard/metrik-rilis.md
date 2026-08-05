# Metrik Rilis

[← Menu Dashboard](./README.md) · [← Katalog halaman](../README.md)

Sub menu `dashboard-metrics`, satu halaman: `/admin/dashboard/metrics` (#227). Dashboard internal development — audiens tim/manajemen/donor, bukan data petani. Akses **SUPERADMIN saja** (tanpa baris RolePermission; role lain via Role & Permission bila diputuskan).

## Diagram objek

```text
Halaman: Metrik Rilis (/admin/dashboard/metrics)
├── Header
│   ├── Judul "Metrik rilis" + rentang tanggal + jumlah rilis
│   └── Badge "terukur sejak v0.21.0" + HelpHint
├── Baris KPI (4 kartu, auto-fit)
│   ├── RVS sekarang (+% dari anchor 1000)
│   ├── Roadmap (% tertimbang, +pt sejak v0.9.0)
│   ├── Test (+% dari baseline ≈)
│   └── Kualitas (bug · TD · Bantuan)
├── Panel 1 — Kurva RVS (line + area 10%)
│   ├── Sumbu X waktu PROPORSIONAL kalender (jeda antar rilis terlihat)
│   ├── Estimasi (pra-v0.21.0): garis putus-putus + titik berongga
│   ├── Anotasi vertikal "mulai diukur" (rilis terukur pertama)
│   ├── Titik provisional = siklus berjalan (ditempatkan pada "hari ini" WIB)
│   └── Tooltip hover: versi · tanggal · RVS (≈ bila estimasi) · Δ
├── Panel 2 — Perolehan RVS per periode (stacked bar, panel utama)
│   ├── Toggle granularitas: Hari · Minggu (default) · Bulan · Tahun
│   ├── 3 seri tetap: Senin–Jumat / Sabtu / Minggu + arsir 45°/135° (a11y)
│   ├── Mode Hari dibatasi 90 periode terakhir (retensi)
│   ├── Peringatan "rentang belum genap" di mode Bulan/Tahun
│   ├── Baris statistik: jumlah periode · rata-rata · puncak
│   └── Disclaimer atribusi: perolehan dicatat pada tanggal rilis
├── Panel 3 — Progres roadmap (stepped line, Y 68–90, shading + label plateau)
├── Panel 4 — Jumlah test (line, Y mulai 400, anotasi lonjakan terbesar; warna = seri RVS)
├── Panel 5 — Kualitas (4 kartu)
│   ├── Bug register (0 → normal; >0 → warna warning)
│   ├── Tech debt aktif + indikator arah (naik/turun/tetap — sorot perubahan arah)
│   ├── Audit Bantuan (meter satu ramp, done/total per era)
│   └── Payload peta (kartu delta 2 titik terukur — sengaja bukan grafik)
└── Daftar rilis (terbaru di atas)
    ├── Kolom: versi · tanggal · RVS (≈ bila estimasi) · Δ · catatan · issue refs
    └── Badge: provisional (siklus berjalan) · breaking (dari catatan)
```

## Referensi teknis

| Aspek | Nilai |
|---|---|
| Menu key | `dashboard-metrics` (parent `dashboard`, label "Metrik Rilis", icon `Activity`, order 4) |
| File | `src/app/(admin)/admin/dashboard/metrics/page.tsx` (+ `loading.tsx`) |
| Client | `metrics-dashboard-client.tsx` (orkestrasi + KPI + kualitas + daftar), `rvs-curve-chart.tsx`, `rvs-period-bars.tsx`, `metrics-small-charts.tsx`, `metrics-shared.ts` (palet tervalidasi + formatter id-ID) |
| Guard | `requirePermission("dashboard-metrics")`; tanpa seed RolePermission → efektif SUPERADMIN-only (bypass) |
| Sumber data | **`docs/project/metrics.md`** di-bundle webpack `asset/source` → `src/lib/release-metrics-data.ts` → parser murni `src/lib/release-metrics.ts` (`parseReleaseMetrics`, `bucketRvsGains`); TIDAK ada server action / query DB |
| Validasi | Parser melempar saat format tabel rusak, RVS turun, roadmap turun tanpa catatan, tanggal mundur, baris berjalan bukan terakhir — dilindungi `src/test/release-metrics.test.ts` (build/test gagal, bukan salah render) |
| Definisi metrik | `docs/standards/versioning.md` §Metrik Nilai Rilis (#226) |
| Seed menu | `scripts/local/seed-dashboard-metrics-menu.ts` (dry-run default, `--apply` untuk menulis) + baris `menu.csv` untuk DB baru |
| Aturan estimasi | Baris pra-`MEASURED_FROM_VERSION` (v0.21.0) = estimasi ± → putus-putus/berongga/prefiks ≈; `—` = null, tidak digambar sebagai 0; payload tidak ditarik ke belakang |
| Bantuan | Tutorial `p-8-metrik-rilis.md` (bab Memantau & Menindaklanjuti) |
