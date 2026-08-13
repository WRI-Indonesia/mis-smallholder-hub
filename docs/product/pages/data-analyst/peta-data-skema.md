# Peta Data & Skema

[← Menu Data Analyst](./README.md) · [← Katalog halaman](../README.md)

Sub menu `data-analyst-data-map`, satu halaman: `/admin/data-analyst/data-map` (DA-07, #256). Menjawab tiga pertanyaan yang sebelumnya tersebar: **data apa saja yang ada**, **seberapa terisi**, dan **menu mana yang memakainya**.

Akses efektif: **SUPERADMIN & ADMIN** (VIEW, tanpa EXPORT/PRINT). Pembatasan itu berlaku bukan karena peran lain tidak disebut, melainkan karena menu induk `data-analyst` hanya ber-VIEW untuk SUPERADMIN — kaskade izin bersifat union tanpa pengurangan, sehingga sub-menu tak pernah bisa lebih ketat dari induknya (#262). Dijaga `src/test/menu-access.test.ts`.

## Lapis keamanan — penyimpangan yang disengaja

Dari tiga lapis standar, halaman ini **hanya memakai lapis pertama** (`requirePermission` / `hasPermission`):

| Lapis | Status | Alasan |
|---|---|---|
| Menu permission | dipakai | `requirePermission("data-analyst-data-map")` di page + `hasPermission` di tiap action |
| Access context | **sengaja tidak dipakai** | Yang ditampilkan bentuk & keterisian *skema* secara nasional, bukan baris milik wilayah tertentu; menyaring 22 entitas heterogen ke satu scope tidak punya arti yang konsisten |
| Soft delete | dipakai | Hitungan baris & keterisian memakai `isActive: true` bila entitasnya punya kolom itu |

Konsekuensi lapis kedua: angka di halaman ini bersifat **nasional**, sehingga menu ini hanya pantas untuk peran non-wilayah. Yang menjaganya adalah izin menu induk, bukan ketiadaan baris di sub-menu ini (#262). Catatan yang sama ada di kepala `src/server/actions/data-map.ts` dan `scripts/local/other/seed-data-map-menu.ts`.

## Diagram objek

```text
Halaman: Peta Data & Skema (/admin/data-analyst/data-map)
├── Header: judul + HelpHint
└── Tabs (3)
    ├── ERD — kanvas React Flow (impor dinamis, tanpa SSR)
    │   ├── Node per entitas: nama · nama tabel · jumlah kolom & relasi
    │   ├── Tata letak DETERMINISTIK: entitas dikelompokkan per domain (nama berkas
    │   │   .prisma), domain disusun sebagai GRID 4 kolom — bukan layout otomatis,
    │   │   supaya posisi entitas tidak berpindah tiap halaman dibuka
    │   ├── Saringan domain: menampilkan satu domain + tetangga langsungnya;
    │   │   fitView dibatasi minZoom 0,55 agar nama entitas tetap terbaca
    │   ├── Edge berlabel kardinalitas (1:1 · 1:n · n:n), arah dari sisi "memiliki banyak"
    │   ├── Klik entitas → sorot tetangga, sisanya diredupkan; klik latar → lepas
    │   └── Background · Controls · MiniMap; colorMode mengikuti tema aplikasi
    ├── Keterisian
    │   ├── 3 kartu: total baris aktif · entitas masih kosong · kolom tak pernah terisi
    │   ├── Sorotan kolom 0% (ada di skema, tidak pernah diisi) — kandidat tinjauan
    │   ├── Baris per entitas (collapsible): per kolom → persen, batang, terisi/total
    │   │   — panjang batang yang membawa besaran, warnanya tetap satu
    │   └── Blok "Belum ada di sistem": stream MD roadmap.md yang belum ✅
    └── Jalur data
        ├── Matriks menu × entitas, sel R / W / RW; kolom menu sticky
        ├── Saringan "hanya menu yang menulis"
        ├── Kolom diurut dari entitas yang paling banyak disentuh
        └── Catatan: entitas infrastruktur, rute induk tak terpetakan, granularitas per fungsi,
            dan penanda akses dinamis (huruf miring)
```

## Sumber data — empat, tak satu pun ditulis khusus untuk halaman ini

| Lapis | Sumber | Mekanisme |
|---|---|---|
| Struktur (entitas, kolom, relasi, enum) | `prisma/schema/*.prisma` | `npm run build:schema` → `src/lib/data-schema.generated.ts` |
| Keterisian | database, runtime | 1 kueri `aggregate._count` per tabel (~22), baris aktif saja |
| Jalur data (menu → entitas) | kode aplikasi | `npm run build:lineage` → `src/lib/data-lineage.generated.ts` |
| Rencana ("butuh tambah apa") | `docs/project/roadmap.md` | stream `MD` yang belum ✅, lewat parser #250 |

**Tidak ada tabel database baru.** Keputusan ini ditinjau ulang saat implementasi (owner, 2026-08-13) dan tetap: struktur & jalur data adalah *turunan dari kode*, sehingga menyalinnya ke tabel tidak menghapus pemindainya — hanya menambah langkah yang bisa terlupa, dan menukar kegagalan gate yang berisik dengan baris database yang diam-diam usang.

## Referensi teknis

| Aspek | Nilai |
|---|---|
| Menu key | `data-analyst-data-map` (parent `data-analyst`, label "Peta Data & Skema", icon `Network`, order 5) |
| File | `src/app/(admin)/admin/data-analyst/data-map/page.tsx` |
| Client | `data-map-client.tsx` (tabs), `schema-canvas.tsx` (React Flow), `fill-rates-panel.tsx`, `lineage-matrix.tsx` |
| Server action | `src/server/actions/data-map.ts` — `getEntityFillRates`, `getMenuLabels` |
| Pemindai | `scripts/schema-scan.ts`, `scripts/lineage-scan.ts` (+ `build-schema.ts`, `build-lineage.ts`) |
| Dependensi | `@xyflow/react` — **hanya** untuk tab ERD, di-load dinamis tanpa SSR |
| Guard artefak | `src/test/data-schema.test.ts`, `src/test/data-lineage.test.ts` — pindai ulang & bandingkan; artefak basi = test gagal |
| Silang sumber | Nama model, kolom, tipe, dan `@map`/`@@map` hasil pindai disilangkan dengan `Prisma.dmmf` |
| Seed menu | `scripts/local/other/seed-data-map-menu.ts` (dry-run default, `--apply` untuk menulis) + baris `menu.csv` & `role-permissions.csv` |
| Bantuan | Tutorial `p-10-peta-data-skema.md` (bab Memantau & Menindaklanjuti) |

## Batas yang diketahui

- **Akses dinamis tidak terlihat pemindai.** Halaman yang mengakses model lewat `prisma[namaModel]` — termasuk halaman ini sendiri — harus menyatakannya dengan penanda `@lineage-dynamic: R|W|RW` di kode. Di matriks, nilai hasil penanda dirender **miring**: dinyatakan, bukan ditemukan. Test menjaga agar penanda ini tetap langka.
- **Keterisian menghitung NULL, bukan "kosong".** String `""` atau `"-"` tetap terhitung terisi. Kualitas isi per Lembaga ada di Analisa Ketersediaan Data (DA-02/DA-03).
- **Perubahan skema baru tampil setelah rebuild**, karena artefaknya dibangun saat build — sama seperti Metrik Rilis yang membaca `.md`.
