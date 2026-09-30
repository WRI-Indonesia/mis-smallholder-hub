# Sprint Mingguan

[← Menu Data Analyst](README.md) · [← Katalog halaman](../README.md)

Sub menu `data-analyst-sprint`, satu halaman: `/admin/data-analyst/sprint` (#378). Seperti Metrik Rilis, halaman ini tentang pengembangan aplikasinya sendiri, bukan data petani. Audiensnya tim, manajemen, dan owner. Akses: **SUPERADMIN, ADMIN, dan MANAGEMENT** (VIEW), sama dengan Metrik Rilis. Dijaga `src/test/menu-access.test.ts`.

## Keputusan owner (2026-09-28)

- Pasca-MVP (v1.0.0) pengembangan memakai **sprint mingguan Senin → Minggu**.
- **Sumber data = `docs/project/sprint.md`** §Sprint Focus, di-bundle webpack (`asset/source`) dan diparse saat modul dimuat (pola Metrik Rilis). Tanpa DB, migrasi, atau token GitHub. Konsekuensinya, status baru berubah setelah deploy.
- **Tata letak = tab Sprint | Analisa + pemilih minggu** (putaran 2, menggantikan akordeon kartu per minggu dari putaran 1).
- **Tata letak tab Sprint = kanban** tahapan penyelesaian issue (#389, keputusan owner 2026-09-29: menggantikan daftar per status, bukan toggle; masuk v1.2.0).
- **Poin sprint = ukuran S/M/L = 1/3/5** (S ≤ ½ hari, M 1–2 hari, L 3+ hari, sebaiknya dipecah). Progres dihitung dalam poin karena jumlah butir menyesatkan bila ukurannya timpang.
- **Tab Semua Issue + keterangan "terakhir diperbarui"** (keputusan owner 2026-09-30): satu tabel `No. Issue | Sprint | Status | Deskripsi` diturunkan dari tabel Sprint + Backlog di `sprint.md`, **tanpa file md baru** (satu informasi satu tempat). Backlog diubah dari daftar bernomor menjadi tabel satu issue per baris; tabel Work Item lama di `sprint.md` diarsipkan. Karena halamannya statis, header menampilkan tanggal `Terakhir diperbarui` dokumen.
- **Perbaikan UI/UX (keputusan owner 2026-09-30, opsi ber-preview):** (1) **kartu kanban ringkas** — judul, ukuran, kategori, keputusan yang masih ditunggu; target di balik tombol Detail; kartu Selesai satu baris bercentang (dulu 8 kartu selesai ber-target 3 baris membuat papan ±3 layar); (2) **backlog disatukan ke tab Semua Issue** — tombol Backlog di pemilih minggu dihapus, Semua Issue mendapat filter Sprint (S1…Sn, Backlog) + kolom Kategori; (3) **strip ringkasan di header** — umur dokumen (kuning > 7 hari), progres sprint minggu ini, keputusan menunggu owner (tautan ke tab Analisa); ringkasan sprint di atas papan dipadatkan jadi dua baris.
- **Tab Analisa** memuat keempat analisa: velocity, keputusan tertunda, carry-over, dan komposisi fokus. Putaran 3 (2026-09-29): tata letak dirombak menjadi kartu ringkasan + satu grafik beban per status + matriks fokus per kategori.

## Diagram objek

```text
Halaman: Sprint Mingguan (/admin/data-analyst/sprint)
├── Header — judul + HelpHint (tutorial p-15) + deskripsi sumber data
├── Strip ringkasan (`sprint-header-strip.tsx`, dirender di `SprintViewClient`) — 3 kotak: Dokumen sprint diperbarui
│   (`updatedAt` + `daysBetween`, kuning bila > 7 hari) · Sprint aktif hari ke-n + bilah poin (atau "Tidak ada sprint aktif")
│   · Keputusan menunggu owner (`pendingDecisions`: butir sprint · poin · terlambat → tombol ke tab Analisa) + "+ n keputusan
│   di backlog" (butir backlog ⚖️ → tab Semua Issue, filter Backlog + Menunggu keputusan). Tombol memakai `setMany` induk,
│   BUKAN `<Link href="?tab=…">` — `useUrlFilters` membaca URL sekali saat mount, jadi navigasi router tak mengganti tab
├── Tabs (URL ?tab=analisa|issue; bawaan Sprint)
├── Tab Sprint
│   ├── Peringatan (kuning) — hanya bila SEMUA sprint sudah lewat
│   ├── Pemilih minggu (URL ?sprint=<n>; `backlog` lama jatuh ke bawaan) — tombol per sprint: titik "minggu ini", rentang, x/y poin
│   │   └── Bawaan: sprint aktif (tanggal WIB server) → mendatang terdekat → terakhir
│   ├── Ringkasan sprint (2 baris) — badge Minggu ini/Mendatang/Selesai · Sprint n · judul · rentang · "hari ke-n dari 7"
│   │   · bilah progres POIN + "x/y butir selesai"
│   ├── Papan kanban (#389, menggantikan kotak keputusan + daftar per status) — `sprintKanban`, 4 kolom urut alur:
│   │   Belum dimulai → Dikerjakan → Menunggu keputusan → Selesai; kepala kolom = label `SPRINT_STATUS_LABEL`
│   │   + jumlah butir + poin ("poin tertahan" di kolom keputusan, berlatar kuning bila berisi); kolom kosong = "Kosong";
│   │   grid 1 kolom (ponsel) · 2 (sm) · 4 (xl)
│   │   └── Kartu ringkas (2026-09-30): judul (markdown inline, `#nnn` → GitHub) · ukuran "M · 3" · titik kategori ·
│   │       keputusan owner yang masih terbuka (kotak kuning; yang sudah "✅ …" pindah ke Detail) · tombol "Detail"/"Tutup" (berlabel judul butir, `aria-expanded`) →
│   │       target minggu ini. Kartu SELESAI satu baris: ✓ + judul + ukuran + panah detail (kategori, target, keputusan
│   │       di dalam detail). Read-only — status diubah di sprint.md
│   ├── Lajur terlipat "Digeser ke sprint lain (n)" — kartu butir ⏭️ (poinnya dihitung di sprint tujuan)
│   └── (Backlog tidak lagi di tab ini — lihat tab Semua Issue, filter Backlog)
├── Tab Analisa
│   ├── 4 kartu (`planTotals`): Rencana (poin tanpa butir digeser · n sprint · tanggal akhir) · Tertahan keputusan owner
│   │   (poin + % rencana + rincian terlambat / minggu ini / mendatang — yang nol tidak ditulis) · Velocity rata-rata
│   │   (sprint lewat saja; bila belum ada: progres sprint berjalan + hari ke-n) · Carry-over (butir; kuning bila digeser > 1×)
│   ├── Beban & kemajuan per sprint — satu kolom per sprint, tinggi = KOMITMEN AWAL (termasuk butir yang kemudian digeser),
│   │   skala sama untuk semua sprint, ditumpuk per STATUS (`sprintStatusPoints`, urutan `SPRINT_STACK_ORDER`: selesai ·
│   │   dikerjakan · menunggu keputusan · belum dimulai · digeser putus-putus); label total di atas batang (di luar alur
│   │   flex agar batang tetap sejajar sumbu); garis putus rata-rata velocity; tooltip saat hover & fokus keyboard
│   │   └── Warna = STATUS, bukan kategori: enam warna kategori tak lolos validator bila ditumpuk bebas
│   ├── Fokus per kategori — matriks angka poin kategori × sprint (menggantikan batang bertumpuk 100%)
│   ├── Keputusan menunggu owner — SEMUA butir ⚖️, dikelompokkan per urgensi: Terlambat (sprint lewat) · Minggu ini · Sprint mendatang
│   └── Carry-over — butir ber-status Digeser: dari sprint mana → sprint tujuan (atau "belum dijadwalkan"), berapa kali
└── Tab Semua Issue (`sprint-issues.tsx`, `allIssues`)
    ├── Ringkasan: n issue unik (m baris)
    ├── Kotak Cari (URL ?q=, `matchesQuery`: setiap kata harus ada di nomor/sprint/status/deskripsi/catatan)
    ├── Chip filter Sprint (URL ?di=<n>|backlog; setiap kali filter berpindah ke Backlog — chip, tautan, strip — urutan
    │   jadi urutan prioritas) + jumlah. `get`/`setMany` dioper dari induk (instance hook kedua = URL basi)
    ├── Chip filter status (URL ?status=todo|progress|decision|done) + jumlah per status (setelah pencarian & filter sprint)
    └── Tabel No. Issue (tautan GitHub) · Sprint ("Sprint n" / "Backlog (urutan n)") · Kategori (— untuk backlog) · Status (badge) · Deskripsi (kolom Issue tanpa `#nnn`,
        catatan backlog di baris kedua). Satu baris per `#nnn` per bagian. Header No. Issue & Sprint bisa diklik
        (`sortIssueRows`, `aria-sort`; kunci kedua selalu menaik); bawaan urut nomor issue lalu sprint → backlog;
        butir ⏭️ dan baris SPRINT tanpa `#nnn` (rilis) tidak ikut; baris BACKLOG tanpa `#nnn` (TD-xxx) ikut, tanpa tautan
```

## Format sumber (`docs/project/sprint.md` §Sprint Focus)

| Elemen | Format | Diparse menjadi |
|---|---|---|
| Heading sprint | `#### Sprint <n> · <YYYY-MM-DD> → <YYYY-MM-DD> — <judul>` | `Sprint { number, start, end, title }` |
| Tabel sprint | 7 kolom: `# \| Issue \| Kategori \| Poin \| Target minggu ini \| Status \| ⚖️ Keputusan owner` | `SprintItem[]`; `#nnn` di kolom Issue → `issueRefs` |
| Kategori | Keamanan · Rilis · Performa · Data · Fitur · Kerapian (urutan = prioritas = urutan warna) | `SprintCategory` |
| Poin | S · M · L | `size` + `points` 1/3/5 |
| Status | awalan 🔲 Todo · 🟡 Dikerjakan · ⚖️ Menunggu keputusan · ✅ Selesai · ⏭️ Digeser | `todo`/`progress`/`decision`/`done`/`moved` |
| Keputusan owner | teks; `—` = tidak ada | `decision: string \| null` |
| Terakhir diperbarui | baris `Terakhir diperbarui: YYYY-MM-DD` di §Sprint Focus (wajib) | `updatedAt` |
| Heading backlog | `#### Backlog …` diikuti tabel 4 kolom `# \| Issue \| Status \| Catatan` (`#` = urutan kelompok, boleh berulang) | `backlog: BacklogItem[]` (judul heading tidak disimpan) |

- Butir yang digeser ditulis di sprint asal dengan ⏭️, **lalu** ditulis ulang di sprint tujuan dengan **teks kolom Issue yang sama persis**. Carry-over dikunci per teks Issue (satu baris = satu butir), bukan per `#nnn`: "**#253** · **#320**" satu butir, "#286 butir 2" dan "#286 butir 1 & 3" dua butir.
- Dua hitungan sengaja berbeda untuk butir ⏭️: **progres sprint** (kartu ringkasan) tidak menghitungnya, karena itu sisa kerja sprint tujuan; **velocity** menghitungnya di komitmen sprint asal, supaya selisih rencana vs selesai terlihat.
- Kolom Issue (sprint & backlog) memuat **paling banyak satu** `#nnn`, diikuti deskripsi singkat; rujukan issue lain ditulis di kolom Target/Catatan. Dijaga test file nyata, karena tab Semua Issue menampilkan satu baris per rujukan.
- `Terakhir diperbarui` tidak boleh lebih lama dari tanggal terbaru (≤ hari ini, WIB) di baris sprint berstatus ✅ — dijaga test. Hanya baris selesai, agar tenggat masa depan di baris Todo tidak membuat test merah saat harinya tiba.
- Pipa di dalam sel wajib di-escape `\|` (aturan GFM, juga di dalam `kode`); parser mengembalikannya menjadi `|`.
- Blok `<details>` di dalam §Sprint Focus (riwayat fokus lama, catatan) **dilewati**, tidak menghentikan parse; section berakhir di heading `###` berikutnya. Tag buka/tutup dihitung per baris, jadi `<details>…</details>` satu baris atau `teks </details>` juga aman (wrap-up 2026-09-29: dulu sisa section terbuang diam-diam).
- Format rusak (status/kategori/poin tak dikenal, jumlah kolom ≠ 7 (sprint) / ≠ 4 (backlog), baris `Terakhir diperbarui` hilang, heading `####` asing, sprint tanpa baris, nomor sprint atau nomor baris dobel) **melempar**, jadi build gagal alih-alih salah render diam-diam.

## Kode

| Berkas | Isi |
|---|---|
| `src/lib/sprint-plan.ts` | Parser murni `parseSprintPlan` + `sprintPhase`, `sprintDay`, `sprintProgress` (butir & poin), `sprintVelocity`, `pendingDecisions`, `carryOvers`, `sprintComposition`, `sprintStatusPoints` + `SPRINT_STACK_ORDER`, `planTotals`, `sprintKanban` + `KANBAN_COLUMNS` (#389), `allIssues` + `issueDescription` + `sortIssueRows` (tab Semua Issue), `daysBetween` (umur dokumen), `SPRINT_STATUS_LABEL` (label status — sumber tunggal UI) |
| `src/lib/sprint-plan-data.ts` | Import `sprint.md` + parse sekali (jangan diimport dari test) |
| `src/app/(admin)/admin/data-analyst/sprint/` | `page.tsx` (guard, tanggal WIB) · `sprint-view-client.tsx` (tabs, pemilih minggu, tab Sprint) · `sprint-analysis.tsx` (tab Analisa) · `sprint-issues.tsx` (tab Semua Issue + backlog) · `sprint-header-strip.tsx` (strip ringkasan, server) · `sprint-shared.tsx` (warna kategori, `fmtDate`, `Inline`, bilah progres, `SearchBox` + `matchesQuery`, `CategoryLabel`) · `loading.tsx` |
| `src/lib/chart-palette.ts` · `src/lib/repo-links.ts` | Palet kategorikal & tautan repo bersama — dipakai juga Metrik Rilis (review #378: dulu disalin/diimpor lintas route) |
| `scripts/seed/seed-menu-key.mjs <key>` | Seed parsial generik: menu + izin dibaca dari CSV |
| `src/test/sprint-plan.test.ts` | File nyata (Senin→Minggu berurutan) + fixture + format rusak + batas fase + velocity/keputusan/carry-over/hari ke-n + temuan review (pipa ter-escape, `<details>` di tengah / satu baris / tag tutup setelah teks, dobel, keputusan terlambat, carry-over per baris) + poin per status = komitmen awal, total rencana tanpa hitung ganda |

## Batas yang disadari

- `sprint.md` hanya menyimpan keadaan **terakhir**, bukan kapan status berubah. Karena itu burndown harian **tidak** dibuat. Bila diperlukan kelak, tambah kolom tanggal selesai atau baca riwayat git berkas ini.
- Di luar lingkup: status live dari GitHub API dan mengedit sprint dari UI (#378).
