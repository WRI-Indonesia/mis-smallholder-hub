# Sprint Mingguan

[← Menu Data Analyst](README.md) · [← Katalog halaman](../README.md)

Sub menu `data-analyst-sprint`, satu halaman: `/admin/data-analyst/sprint` (#378). Seperti Metrik Rilis, halaman ini tentang pengembangan aplikasinya sendiri, bukan data petani. Audiensnya tim, manajemen, dan owner. Akses: **SUPERADMIN, ADMIN, dan MANAGEMENT** (VIEW), sama dengan Metrik Rilis. Dijaga `src/test/menu-access.test.ts`.

## Keputusan owner (2026-09-28)

- Pasca-MVP (v1.0.0) pengembangan memakai **sprint mingguan Senin → Minggu**.
- **Sumber data = `docs/project/sprint.md`** §Sprint Focus, di-bundle webpack (`asset/source`) dan diparse saat modul dimuat (pola Metrik Rilis). Tanpa DB, migrasi, atau token GitHub. Konsekuensinya, status baru berubah setelah deploy.
- **Tata letak = tab Sprint | Analisa + pemilih minggu** (putaran 2, menggantikan akordeon kartu per minggu dari putaran 1).
- **Poin sprint = ukuran S/M/L = 1/3/5** (S ≤ ½ hari, M 1–2 hari, L 3+ hari, sebaiknya dipecah). Progres dihitung dalam poin karena jumlah butir menyesatkan bila ukurannya timpang.
- **Tab Analisa** memuat keempat analisa: velocity, keputusan tertunda, carry-over, dan komposisi fokus.

## Diagram objek

```text
Halaman: Sprint Mingguan (/admin/data-analyst/sprint)
├── Header — judul + HelpHint (tutorial p-15) + deskripsi sumber data
├── Tabs (URL ?tab=analisa; bawaan Sprint)
├── Tab Sprint
│   ├── Peringatan (kuning) — hanya bila SEMUA sprint sudah lewat
│   ├── Pemilih minggu (URL ?sprint=<n>|backlog) — tombol per sprint: titik "minggu ini", rentang, x/y poin
│   │   └── Bawaan: sprint aktif (tanggal WIB server) → mendatang terdekat → terakhir
│   ├── Ringkasan sprint — badge Minggu ini/Mendatang/Selesai · rentang · "hari ke-n dari 7" · judul
│   │   · bilah progres POIN + "x/y butir selesai"
│   ├── Kotak "Butuh keputusan owner (n)" — butir ⚖️ + teks keputusan + poin tertahan (hanya bila ada)
│   ├── Kelompok butir: "Dikerjakan" · "Belum dimulai" · "Selesai" · "Digeser ke sprint lain" (butir ⚖️ TIDAK diulang di sini)
│   │   └── Baris: tombol (issue teks polos · titik kategori · ukuran "M · 3"; klik → Target & Keputusan)
│   │       + tautan "#nnn ↗" ke GitHub DI LUAR tombol (tidak ada <a> bersarang dalam <button>)
│   └── Backlog (bila dipilih) — daftar bernomor dari "#### Backlog …"
└── Tab Analisa
    ├── 3 stat: velocity rata-rata (sprint lewat saja; "—" bila belum ada) · poin tertahan keputusan (+ n terlambat) · butir digeser
    ├── Velocity per sprint — batang KOMITMEN AWAL (netral, termasuk butir yang kemudian digeser) vs selesai (slot 1)
    │   + garis putus rata-rata + label angka
    ├── Komposisi fokus — batang bertumpuk 100% per sprint, warna = kategori (slot 1–6 palet Metrik Rilis),
    │   celah 2px; angka di teks bertinta netral di bawah batang (bukan di dalam batang: slot terang kurang kontras)
    ├── Keputusan tertunda — SEMUA butir ⚖️; yang berasal dari sprint lewat ditandai "terlambat" (tidak hilang dari antrean)
    └── Carry-over — butir ber-status Digeser: dari sprint mana → sprint tujuan (atau "belum dijadwalkan"), berapa kali
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
| Heading backlog | `#### Backlog …` diikuti daftar `1. …` | `backlog: string[]` |

- Butir yang digeser ditulis di sprint asal dengan ⏭️, **lalu** ditulis ulang di sprint tujuan dengan **teks kolom Issue yang sama persis**. Carry-over dikunci per teks Issue (satu baris = satu butir), bukan per `#nnn`: "**#253** · **#320**" satu butir, "#286 butir 2" dan "#286 butir 1 & 3" dua butir.
- Dua hitungan sengaja berbeda untuk butir ⏭️: **progres sprint** (kartu ringkasan) tidak menghitungnya, karena itu sisa kerja sprint tujuan; **velocity** menghitungnya di komitmen sprint asal, supaya selisih rencana vs selesai terlihat.
- Pipa di dalam sel wajib di-escape `\|` (aturan GFM, juga di dalam `kode`); parser mengembalikannya menjadi `|`.
- Blok `<details>` di dalam §Sprint Focus (riwayat fokus lama, catatan) **dilewati**, tidak menghentikan parse; section berakhir di heading `###` berikutnya.
- Format rusak (status/kategori/poin tak dikenal, jumlah kolom ≠ 7, heading `####` asing, sprint tanpa baris, nomor sprint atau nomor baris dobel) **melempar**, jadi build gagal alih-alih salah render diam-diam.

## Kode

| Berkas | Isi |
|---|---|
| `src/lib/sprint-plan.ts` | Parser murni `parseSprintPlan` + `sprintPhase`, `sprintDay`, `sprintProgress` (butir & poin), `sprintVelocity`, `pendingDecisions`, `carryOvers`, `sprintComposition` |
| `src/lib/sprint-plan-data.ts` | Import `sprint.md` + parse sekali (jangan diimport dari test) |
| `src/app/(admin)/admin/data-analyst/sprint/` | `page.tsx` (guard, tanggal WIB) · `sprint-view-client.tsx` (tabs, pemilih minggu, tab Sprint) · `sprint-analysis.tsx` (tab Analisa) · `sprint-shared.tsx` (warna kategori, `fmtDate`, `Inline` + `IssueRefLinks`, bilah progres) · `loading.tsx` |
| `src/lib/chart-palette.ts` · `src/lib/repo-links.ts` | Palet kategorikal & tautan repo bersama — dipakai juga Metrik Rilis (review #378: dulu disalin/diimpor lintas route) |
| `scripts/seed/seed-menu-key.mjs <key>` | Seed parsial generik: menu + izin dibaca dari CSV |
| `src/test/sprint-plan.test.ts` | File nyata (Senin→Minggu berurutan) + fixture + format rusak + batas fase + velocity/keputusan/carry-over/hari ke-n + temuan review (pipa ter-escape, `<details>` di tengah, dobel, keputusan terlambat, carry-over per baris) |

## Batas yang disadari

- `sprint.md` hanya menyimpan keadaan **terakhir**, bukan kapan status berubah. Karena itu burndown harian **tidak** dibuat. Bila diperlukan kelak, tambah kolom tanggal selesai atau baca riwayat git berkas ini.
- Di luar lingkup: status live dari GitHub API dan mengedit sprint dari UI (#378).
