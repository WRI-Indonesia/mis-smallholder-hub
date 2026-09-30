# Rencana Pengembangan

[← Menu Data Analyst](README.md) · [← Katalog halaman](../README.md)

Sub menu `data-analyst-sprint`, satu halaman: `/admin/data-analyst/sprint` (#378; dulu **Sprint Mingguan** — key, URL, dan izin sengaja tidak diganti). Seperti Metrik Rilis, halaman ini tentang pengembangan aplikasinya sendiri, bukan data petani. Audiensnya tim, manajemen, dan owner. Akses: **SUPERADMIN, ADMIN, dan MANAGEMENT** (VIEW), sama dengan Metrik Rilis. Dijaga `src/test/menu-access.test.ts`.

## Keputusan owner

**2026-09-28 (#378)**
- **Sumber data = `docs/project/sprint.md`**, di-bundle webpack (`asset/source`) dan diparse saat modul dimuat (pola Metrik Rilis). Tanpa DB, migrasi, atau token GitHub. Konsekuensinya, status baru berubah setelah deploy.
- **Poin = ukuran S/M/L = 1/3/5** (S ≤ ½ hari kerja, M 1–2 hari, L 3+ hari, sebaiknya dipecah). Progres dihitung dalam poin karena jumlah butir menyesatkan bila ukurannya timpang.
- **Tab Analisa** memuat empat analisa: velocity, keputusan tertunda, carry-over, komposisi fokus (putaran 3, 2026-09-29: kartu ringkasan + satu grafik beban per status + matriks fokus per kategori).

**2026-09-29 (#389)** — tab utama = **kanban** tahapan penyelesaian issue (menggantikan daftar per status, bukan toggle).

**2026-09-30 — perombakan (opsi ber-preview)**
- **Unit rencana = RILIS, bukan sprint mingguan.** Pengembangan dikerjakan satu orang di sela cleaning data dan kunjungan distrik: ada minggu padat, ada minggu tanpa coding. Ritme Senin–Minggu membuat minggu kosong tampak seperti sprint gagal. Setiap rilis punya tanggal mulai & target bebas. Sprint 1–6 lama dipetakan: Sprint 1 selesai → v1.2.0, sisa Sprint 1 + Sprint 2–4 → v1.3.0, Sprint 5–6 → v1.4.0.
- **Nama menu = "Rencana Pengembangan"** (label di `menu.csv`; seed per menu ke staging/prod ikut rilis berikutnya).
- **Velocity = poin selesai per MINGGU KALENDER** (Σ selesai ÷ Σ minggu rilis yang lewat target), bukan per rilis — panjang rilis berbeda-beda. Grafik beban tidak lagi punya satu garis rata-rata; tiap kolom mendapat **penanda kapasitas** = velocity × panjang rilis.
- **Pemilih tidak tumbuh bersama riwayat:** tombol hanya untuk rilis yang belum tuntas (berjalan / terlambat / mendatang); rilis yang sudah dirilis masuk combobox **Riwayat** ber-cari. Filter Rilis di Semua Issue juga combobox ber-cari (`shared/filter-combobox.tsx`), bukan chip.
- **Tab Semua Issue** (`No. Issue | Rilis | Kategori | Status | Deskripsi`) diturunkan dari tabel Rilis + Backlog, **tanpa file md baru** (satu informasi satu tempat). Backlog berupa tabel satu issue per baris dan **hanya** tampil di tab ini; tabel Work Item lama di `sprint.md` diarsipkan.
- **Kartu kanban ringkas** (judul, ukuran, kategori, keputusan yang masih terbuka; target di balik Detail; kartu Selesai satu baris bercentang) dan **strip ringkasan** di header (umur dokumen, rilis yang sedang dikejar, keputusan menunggu owner).

## Diagram objek

```text
Halaman: Rencana Pengembangan (/admin/data-analyst/sprint)
├── Header — judul + HelpHint (tutorial p-15) + deskripsi sumber data
├── Strip ringkasan (`sprint-header-strip.tsx`, dirender di `SprintViewClient`) — 3 kotak:
│   · Dokumen rencana diperbarui (`updatedAt` + `daysBetween`, kuning bila > 14 hari)
│   · Rilis yang sedang dikejar: berjalan, atau — bila tak ada — terlambat pertama; "sisa n hari (target …)"
│     atau "target lewat n hari" (kuning) + bilah poin; tanpa keduanya: "Tidak ada rilis yang sedang dikejar"
│   · Keputusan menunggu owner (`pendingDecisions`: butir · poin · terlambat → tombol ke tab Analisa) + "+ n keputusan
│     di backlog" (butir backlog ⚖️ → tab Semua Issue, filter Backlog + Menunggu keputusan)
│   Tombol memakai `setMany` induk, BUKAN `<Link href="?tab=…">` — `useUrlFilters` membaca URL sekali saat mount
├── Tabs (URL ?tab=analisa|issue; bawaan Rilis)
├── Tab Rilis
│   ├── Peringatan (kuning) — hanya bila SEMUA rilis sudah dirilis
│   ├── Pemilih (URL ?rilis=<versi>; `?sprint=` lama diabaikan) — tombol untuk rilis BELUM TUNTAS
│   │   (`releaseState`: berjalan bertitik · terlambat · mendatang) + rilis terpilih bila dari riwayat;
│   │   combobox "Riwayat (n)" untuk rilis yang sudah dirilis, terbaru dulu
│   │   └── Bawaan: berjalan → terlambat pertama → mendatang terdekat → terakhir
│   ├── Ringkasan rilis (2 baris) — badge Berjalan/Terlambat/Mendatang/Dirilis · versi · judul · rentang ·
│   │   "hari ke-n dari m · sisa k hari" / "target lewat n hari" / "mulai n hari lagi" · bilah POIN + "x/y butir selesai"
│   ├── Papan kanban (`releaseKanban`, 4 kolom urut alur): Belum dimulai → Dikerjakan → Menunggu keputusan → Selesai;
│   │   kepala kolom = label + jumlah butir + poin ("poin tertahan" di kolom keputusan, kuning bila berisi);
│   │   grid 1 kolom (ponsel) · 2 (sm) · 4 (xl)
│   │   └── Kartu ringkas: judul (markdown inline, `#nnn` → GitHub) · ukuran "M · 3" · titik kategori ·
│   │       keputusan owner yang masih terbuka (kotak kuning; yang sudah "✅ …" pindah ke Detail) · tombol "Detail"/"Tutup"
│   │       (`aria-expanded`) → target. Kartu SELESAI satu baris: ✓ + judul + ukuran + panah detail. Read-only
│   └── Lajur terlipat "Digeser ke rilis lain (n)" — kartu butir ⏭️ (poinnya dihitung di rilis tujuan)
├── Tab Analisa
│   ├── 4 kartu (`planTotals`): Rencana (poin tanpa butir digeser · n rilis · tanggal akhir) · Tertahan keputusan owner
│   │   (poin + % rencana + rincian terlambat / rilis berjalan / mendatang — yang nol tidak ditulis) · Velocity rata-rata
│   │   (poin/minggu kalender dari rilis lewat target + ukuran sampel "n rilis (m minggu)", "sampel masih kecil" bila < 4
│   │   minggu; bila belum ada: progres rilis berjalan + hari ke-n dari m) · Carry-over
│   ├── Beban & kemajuan per rilis — satu kolom per rilis, tinggi = KOMITMEN AWAL (termasuk butir yang kemudian digeser),
│   │   skala sama, ditumpuk per STATUS (`releaseStatusPoints`, `PLAN_STACK_ORDER`); penanda putus per kolom = kapasitas
│   │   (velocity × minggu rilis) setelah ada rilis lewat target; tooltip saat hover & fokus keyboard
│   │   └── Warna = STATUS, bukan kategori: enam warna kategori tak lolos validator bila ditumpuk bebas
│   ├── Fokus per kategori — matriks angka poin kategori × rilis
│   ├── Keputusan menunggu owner — butir ⚖️ di rilis, per urgensi: Terlambat (target lewat) · Rilis berjalan · Mendatang
│   └── Carry-over — butir Digeser: dari rilis mana → rilis tujuan (atau "belum dijadwalkan"), berapa kali
└── Tab Semua Issue (`sprint-issues.tsx`, `allIssues`)
    ├── Ringkasan: n issue unik (m baris)
    ├── Kotak Cari (URL ?q=, `matchesQuery`: setiap kata harus ada di nomor/rilis/status/kategori/deskripsi/catatan)
    ├── Combobox Rilis (URL ?di=<versi>|backlog; urutan opsi: belum tuntas → Backlog → riwayat; setiap kali filter
    │   berpindah ke Backlog urutan jadi urutan prioritas). `get`/`setMany` dioper dari induk (instance hook kedua = URL basi)
    ├── Chip Status (URL ?status=todo|progress|decision|done) + jumlah (4 nilai tetap — tidak tumbuh)
    └── Tabel No. Issue (tautan GitHub) · Rilis (versi / "Backlog (urutan n)") · Kategori (md+, — untuk backlog) ·
        Status · Deskripsi (kolom Issue tanpa `#nnn`, catatan backlog di baris kedua). Header No. Issue & Rilis bisa
        diklik (`sortIssueRows`, `aria-sort`). Butir ⏭️ dan baris RILIS tanpa `#nnn` tidak ikut; baris BACKLOG tanpa
        `#nnn` (TD-xxx) ikut tanpa tautan
```

## Format sumber (`docs/project/sprint.md` §Rencana Rilis)

| Elemen | Format | Diparse menjadi |
|---|---|---|
| Terakhir diperbarui | baris `Terakhir diperbarui: YYYY-MM-DD` (wajib) | `updatedAt` |
| Heading rilis | `#### Rilis v<x.y.z> · <mulai YYYY-MM-DD> → <target YYYY-MM-DD> — <judul>` | `Release { version, start, end, title }` |
| Tabel rilis | 7 kolom: `# \| Issue \| Kategori \| Poin \| Target \| Status \| ⚖️ Keputusan owner` | `PlanItem[]`; `#nnn` di kolom Issue → `issueRefs` |
| Kategori | Keamanan · Rilis · Performa · Data · Fitur · Kerapian (urutan = prioritas = urutan warna) | `PlanCategory` |
| Poin | S · M · L | `size` + `points` 1/3/5 |
| Status | awalan 🔲 Todo · 🟡 Dikerjakan · ⚖️ Menunggu keputusan · ✅ Selesai · ⏭️ Digeser | `todo`/`progress`/`decision`/`done`/`moved` |
| Keputusan owner | teks; `—` = tidak ada | `decision: string \| null` |
| Backlog | `#### Backlog …` + tabel 4 kolom `# \| Issue \| Status \| Catatan` (`#` = urutan kelompok, boleh berulang) | `backlog: BacklogItem[]` |

- Rilis ditulis **urut** dan tidak tumpang tindih (mulai rilis berikutnya > target rilis sebelumnya). Versi unik. Konvensi: rilis dimulai **sehari setelah rilis sebelumnya dirilis**, agar velocity mencerminkan siklus sebenarnya (pemetaan awal v1.2.0 = 2 hari sempat menghasilkan 52,5 poin/minggu).
- Keadaan rilis (`releaseState`): sebelum mulai = mendatang; dalam rentang = berjalan; lewat target + semua butir (tanpa digeser) selesai = **dirilis**; lewat target + masih ada sisa = **terlambat** (tetap tampil di depan).
- Butir yang digeser ditulis di rilis asal dengan ⏭️, **lalu** ditulis ulang di rilis tujuan dengan **teks kolom Issue yang sama persis**. Carry-over dikunci per teks Issue (satu baris = satu butir): "#286 butir 2" dan "#286 butir 1 & 3" dua butir.
- Dua hitungan sengaja berbeda untuk butir ⏭️: **progres rilis** tidak menghitungnya (sisa kerja rilis tujuan); **velocity** menghitungnya di komitmen rilis asal, supaya selisih rencana vs selesai terlihat.
- Kolom Issue memuat **paling banyak satu** `#nnn`; rujukan lain ditulis di kolom Target/Catatan — dijaga test file nyata.
- `Terakhir diperbarui` tidak boleh lebih lama dari tanggal terbaru (≤ hari ini, WIB) di baris berstatus ✅ — dijaga test. Hanya baris selesai, agar tenggat masa depan di baris Todo tidak membuat test merah saat harinya tiba.
- Pipa di dalam sel wajib di-escape `\|` (aturan GFM, juga di dalam `kode`); parser mengembalikannya menjadi `|`.
- Blok `<details>` di dalam section **dilewati**, tidak menghentikan parse; section berakhir di heading `###` berikutnya. Tag buka/tutup dihitung per baris.
- Format rusak (status/kategori/poin tak dikenal, jumlah kolom ≠ 7 / ≠ 4, heading `####` asing — termasuk format lama `#### Sprint …`, versi dobel, rilis tumpang tindih atau mulai sesudah target, rilis tanpa baris, baris dobel, `Terakhir diperbarui` hilang) **melempar**, jadi build gagal alih-alih salah render diam-diam.

## Kode

| Berkas | Isi |
|---|---|
| `src/lib/release-plan.ts` | Parser murni `parseReleasePlan` + `releasePhase`, `releaseTimeline`, `releaseState`, `releaseProgress`, `releaseVelocity` (poin/minggu), `pendingDecisions`, `carryOvers`, `releaseComposition`, `releaseStatusPoints` + `PLAN_STACK_ORDER`, `planTotals`, `releaseKanban` + `KANBAN_COLUMNS`, `allIssues` + `issueDescription` + `sortIssueRows`, `daysBetween`, `PLAN_STATUS_LABEL` (dulu `sprint-plan.ts`) |
| `src/lib/release-plan-data.ts` | Import `sprint.md` + parse sekali (jangan diimport dari test) |
| `src/app/(admin)/admin/data-analyst/sprint/` | `page.tsx` (guard, tanggal WIB) · `sprint-view-client.tsx` (tabs, pemilih rilis, tab Rilis) · `sprint-header-strip.tsx` (strip ringkasan) · `sprint-analysis.tsx` (tab Analisa) · `sprint-issues.tsx` (tab Semua Issue + backlog) · `sprint-shared.tsx` (warna kategori, `fmtDate`, `Inline`, bilah progres, `SearchBox` + `matchesQuery`, `CategoryLabel`) · `loading.tsx`. Nama berkas mengikuti URL `/sprint`, bukan unit rencana |
| `src/lib/chart-palette.ts` · `src/lib/repo-links.ts` | Palet kategorikal & tautan repo bersama — dipakai juga Metrik Rilis |
| `scripts/seed/seed-menu-key.mjs <key>` | Seed parsial generik: menu + izin dibaca dari CSV (dipakai untuk label baru di staging/prod) |
| `src/test/release-plan.test.ts` | File nyata (rilis urut, ≤ 1 `#nnn` per kolom Issue, kesegaran tanggal) + fixture + format rusak + fase/linimasa/keadaan rilis + velocity per minggu + keputusan/carry-over + kanban + Semua Issue (TD-xxx, urutan) + helper tampilan |

## Batas yang disadari

- `sprint.md` hanya menyimpan keadaan **terakhir**, bukan kapan status berubah. Karena itu burndown harian **tidak** dibuat. Bila diperlukan kelak, tambah kolom tanggal selesai atau baca riwayat git berkas ini.
- Velocity per minggu kalender tetap menghitung minggu tanpa coding (cleaning data, kunjungan distrik). Itu disengaja: kapasitas perkiraan harus realistis terhadap waktu yang benar-benar tersedia, bukan hanya minggu produktif.
- Di luar lingkup: status live dari GitHub API dan mengedit rencana dari UI (#378).
