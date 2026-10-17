# Daftar Issue

[← Menu Platform Developer](README.md) · [← Katalog halaman](../README.md)

Sub menu `platform-developer-issues`, satu halaman: `/admin/platform-developer/issues` (#429). Menu pertama di grup Platform Developer yang route-nya memakai segmen grup itu sendiri. Isinya semua issue GitHub repo aplikasi (open + closed), tentang pengembangan aplikasinya sendiri, bukan data petani. Akses: **SUPERADMIN, ADMIN, dan MANAGEMENT** (VIEW), sama dengan saudaranya. Dijaga `src/test/menu-access.test.ts`.

## Keputusan owner (2026-10-13, bertahap)

- **Sumber data = GitHub REST API langsung + cache 30 menit**, bukan berkas md/json yang di-generate. Tidak ada berkas yang lupa diperbarui dan tidak perlu build ulang.
- **Submenu baru**, bukan tab di Rencana Pengembangan. Rencana Pengembangan = *rencana* dari `sprint.md`; Daftar Issue = *kondisi nyata* di GitHub, termasuk riwayat issue yang sudah ditutup.
- **Lima tampilan:** List · Kalender · Tren mingguan · Kanban · Unduh Excel. Lanjutan hari yang sama: Kalender **kiri 1/3 : kanan 2/3** + tooltip saat disorot; Tren + kartu **akumulasi area bertumpuk** ditutup + masih terbuka (awalnya batang, diganti area atas permintaan owner).
- **Kanban 5 kolom dari label `status:*`**, yang disamakan dengan `sprint.md` oleh `/pagi` Tahap 4 (sesudah owner menyetujui diff) dan dicabut oleh `/wrapup` saat issue ditutup.
- **Akses sama dengan saudaranya** (SUPERADMIN · ADMIN · MANAGEMENT) — isinya data repo public.

## Sumber data

`src/server/actions/github-issues.ts` → `getGithubIssues()`:

- Guard `hasPermission("platform-developer-issues", "VIEW")` (throw). Scope data & soft delete tidak berlaku: bukan data petani, repo public.
- `GET https://api.github.com/repos/WRI-Indonesia/mis-smallholder-hub/issues?state=all&per_page=100`, paginasi sampai halaman < 100 item (pengaman 20 halaman). Tanpa token: batas 60 permintaan/jam per IP server; satu penyegaran ±4 halaman.
- Dibungkus `unstable_cache` (revalidate 1.800 detik). Penyegaran latar yang gagal tetap menyajikan data lama, jadi pesan galat hanya muncul bila cache belum pernah terisi. Pesan: rate limit (+ jam reset WIB), GitHub tak terjangkau, HTTP gagal — Bahasa Indonesia, halaman tidak crash.
- Normalisasi murni di `src/lib/github-issues.ts`: pull request dibuang, status `open | closed | not_planned | duplicate` dari `state` + `state_reason`, tanggal **WIB** `YYYY-MM-DD`, urut nomor menurun.

## Diagram objek

```text
Halaman: Daftar Issue (/admin/platform-developer/issues)
├── Header — judul + HelpHint (tutorial p-19) + deskripsi sumber data
├── Galat (kartu kuning) bila getGithubIssues gagal
├── Ringkasan: n issue · n terbuka · data GitHub per <fetchedAt>
├── Bar filter (URL; berlaku ke List, Kalender, Kanban + Excel; Tren = cari + label saja, minggu dipotong ke rentang)
│   · Cari ?q= (nomor/judul/label, semua kata harus cocok)
│   · Label ?label= (FilterCombobox, jumlah per label)
│   · Aktivitas ?dari= ?sampai= — issue DIBUAT ATAU DITUTUP di rentang (inklusif, WIB)
│   · Status ?status=open|closed|not_planned|duplicate (chip + jumlah, dihitung tanpa filter status)
│   · ↺ Reset (ResetFiltersButton #427; tab/bulan/tanggal kalender tidak di-reset)
│   · Unduh Excel (issue tersaring, urutan = urutan List) — hanya bila `platform-developer-issues:EXPORT` (`canExport` dari page; seed EXPORT **SUPERADMIN saja** — EXPORT ADMIN/MANAGEMENT (owner 2026-10-13) dicabut di prod sesudah v1.8.0, seed disamakan 2026-10-17 (owner))
└── Tabs (?tab=kalender|tren|kanban; bawaan List)
    ├── List — No. (tautan GitHub) · Judul · Label (≥ lg) · Dibuat · Ditutup · Status; urut No./Dibuat/Ditutup
    ├── Kalender — kiri ±1/3 kalender, kanan ±2/3 detail (owner 2026-10-13, dipilih atas popup / di bawah kalender; layar < lg tersusun):
    │   · ?bulan=YYYY-MM (01–12, bawaan bulan berjalan WIB), sel +n dibuat / ✓n ditutup — dengan ?dari=/?sampai= hanya kejadian DI DALAM rentang yang diplot (`dailyActivity(issues, range)`, owner 2026-10-13); tanpa ?bulan= bawaannya `calendarDefaultMonth` = bulan berjalan, atau bulan akhir rentang bila rentang tak mencakup bulan berjalan
    │   · sorot sel = tooltip (jumlah + ≤ 3 judul per jenis); klik = ?tgl= → panel kanan hari itu, klik lagi / ← Seluruh bulan = seluruh bulan
    ├── Tren mingguan — minggu Senin–Minggu dari minggu issue pertama s.d. minggu ini:
    │   · batang Dibuat vs Ditutup (CATEGORICAL biru/aqua, lulus validator dataviz light & dark)
    │   · akumulasi area bertumpuk (owner 2026-10-13; batang → area): kumulatif Ditutup (aqua, bawah) + Masih terbuka (oranye, atas) = kumulatif dibuat
    │   · grafik TERPISAH garis "masih terbuka di akhir minggu" (bukan sumbu kedua)
    │   · data = cari + label saja (`clipWeeks` memotong ke rentang) — status/rentang tak boleh membuang issue yang terbuka sepanjang rentang
    │   · readout per kartu (sorot/ketuk minggu) + tabel per minggu (relief kontras aqua < 3:1 di light)
    └── Kanban (read-only) — Belum direncanakan (open tanpa label status) · Todo (status:todo) ·
        Dikerjakan (status:in-progress) · Menunggu keputusan (status:decision) · Closed (≤ 30 hari, terbaru di atas);
        label status ganda → tahap paling lanjut menang
```

## Unduh Excel

`src/lib/github-issues-xlsx.ts`, satu sheet **Issue List**: `Date Solved (Close) | No Issue | Simple Desc | Date Created | Status` — kolom sama dengan laporan manual `REPORTING/issue-list-*.xlsx`. Tanggal = sel tanggal Excel `dd/mm/yyyy` (WIB), Status memakai istilah GitHub (`Open`, `Closed`, `Closed (Not planned)`, `Closed (Duplicate)`), baris judul dibekukan + autofilter. Nama berkas `daftar-issue-<tanggal>.xlsx`.

## Berkas

| Berkas | Isi |
|---|---|
| `src/app/(admin)/admin/platform-developer/issues/page.tsx` | Guard halaman, hari ini (WIB), panggil action |
| `…/issues-view-client.tsx` | Filter URL, chip status, Reset, Excel, Tabs |
| `…/issues-list.tsx` · `issues-calendar.tsx` · `issues-trend.tsx` · `issues-kanban.tsx` | Keempat tab |
| `src/lib/github-issues.ts` | Normalisasi, filter, kalender, tren mingguan, kolom kanban, baris Excel (murni, diuji `src/test/github-issues.test.ts`) |
| `src/server/actions/github-issues.ts` | Fetch GitHub + cache + pesan galat (diuji `src/test/github-issues-action.test.ts`) |
