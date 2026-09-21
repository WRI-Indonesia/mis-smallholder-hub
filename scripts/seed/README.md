# scripts/seed

Skrip seed yang **satu-satunya definisi tereksekusi** dari sebagian data produksi. Ditaruh di sini — bukan di `scripts/local/` yang gitignored — agar ikut ter-review, ter-`gitleaks`/`semgrep`, dan tidak hilang bersama satu laptop ([#279](https://github.com/WRI-Indonesia/mis-smallholder-hub/issues/279)).

## Aturan isi folder ini

**Skrip di-track, data tidak.** `scripts/local/` tetap gitignored karena memuat berkas ber-PII (`data-petani/`, `data-user/`, `Progress MIS.xlsx`) dan repo ini **publik**. Yang boleh masuk `scripts/seed/`:

- kode skrip,
- berkas kecil hasil **pemetaan manual** yang sudah dipastikan bebas PII dan kredensial (saat ini hanya `data/boundary-mapping.csv`).

Shapefile, Excel, ZIP, dan apa pun yang berisi data petani/pengguna **tetap di `scripts/local/`**. Setiap berkas baru di sini wajib diperiksa dulu isinya — sekali ter-commit, ia tersaji ke internet dan tetap ada di riwayat git meski kemudian dihapus.

## Skrip

| Berkas | Fungsi | Butuh data eksternal |
| --- | --- | --- |
| `seed-boundary-lembaga.ts` | 30 poligon ICS (UTM 47S → WGS84) → `tbl_farmer_group_boundary`, ditulis `geojson` + `geom` PostGIS | `Groups-Boundary.zip` |
| `seed-batas-administrasi.ts` | 12 kabupaten BIG → `tbl_administrative_boundary`, `geojson` disimpan tersimplifikasi 0,001° | `Batas_Administrasi_Kabupaten_Riau.zip` |
| `seed-menu-only.ts` | menu + role-permissions saja, tanpa `prisma db seed` penuh (yang tidak idempotent). Menu: baris baru dibuat, baris yang ada **diperbarui kolom strukturalnya** (judul, url, ikon, order, induk); `isActive`/`isVisible` tidak disentuh | — |
| `seed-menu-report-marker.mjs` | **parsial**: hanya menu `report-marker` (Report › Patok, #331) + izin per peran dari `role-permissions.csv`; hanya menambah yang belum ada (tidak memulihkan izin yang sengaja dihapus admin) | — |

`seed-menu-only.ts` juga ber-`--apply`; dry-run-nya mencetak **diff menu** (dibuat / diperbarui: `kolom: lama → baru`) — jalankan dan baca diff itu sebelum `--apply` ke staging/prod. `menu.csv` adalah **sumber kebenaran struktur & label** menu: sampai 2026-09-21 `seedMenu` memakai `update: {}` sehingga CSV dan prod saling menjauh (15 baris — urutan Report/Map/Master Data/Settings, judul Upload Data …) tanpa ada yang sadar; CSV disinkronkan ke prod pada QA v0.37.0 dan sejak itu perubahan harus lewat CSV, bukan Menu Management UI (kecuali `isActive`/`isVisible`). Perhatikan peringatannya: `seedRolePermissions` memakai upsert `update: {}`, sehingga baris permission yang sengaja **dihapus admin akan dipulihkan** — cek `npm run rbac:compare` dulu.

`data/boundary-mapping.csv` memetakan nama ICS di shapefile → `FarmerGroup.code`, karena keduanya tidak sama persis. Satu poligon bisa dimiliki beberapa lembaga (kode dipisah `+`). Ini hasil pemetaan manual — bagian yang paling mahal dibuat ulang, dan alasan utama ia ikut di-track.

## Menjalankan

Ketiganya **dry-run secara bawaan**; menulis hanya dengan `--apply`.

```bash
# lokal (.env)
npx dotenv -e .env -- npx tsx scripts/seed/seed-boundary-lembaga.ts
npx dotenv -e .env -- npx tsx scripts/seed/seed-boundary-lembaga.ts --apply

# data di tempat lain
npx dotenv -e .env -- npx tsx scripts/seed/seed-boundary-lembaga.ts --data=/path/ke/folder
SEED_DATA_DIR=/path/ke/folder npx dotenv -e .env -- npx tsx scripts/seed/seed-batas-administrasi.ts
```

Bawaannya mencari data di `scripts/local/seed/data-boundary-lembaga/` dan `scripts/local/seed/data-batas-administrasi/`. Bila tidak ada, skrip berhenti dengan pesan yang menyebut lokasi yang dicari dan cara menunjuk folder lain — bukan diam-diam "berhasil" tanpa mengerjakan apa pun.

Setiap skrip mencetak **DB efektif** (host/port/nama, tanpa kredensial) sebelum bekerja. Periksa baris itu sebelum `--apply`.

> [!PENTING]
> Menulis ke non-lokal harus eksplisit: `npx dotenv -e .env.prod -- …` (lihat `docs/standards/environments.md`). Untuk produksi: dry-run dulu, tunjukkan hasilnya, minta persetujuan owner, baru `--apply`.

## Catatan teknis

- **Idempotent** lewat soft-delete → insert: baris aktif lama di-`isActive: false`, baris baru disisipkan. Bukan dijaga constraint DB — lihat #274 untuk akibat bila seed gagal di tengah.
- **`{ timeout: 600_000 }`** pada transaksi bukan hiasan: payload geometri besar lewat tunnel pernah menembus batas 5 detik transaksi interaktif Prisma dan me-rollback seluruh seed.
- **`globalThis.self = globalThis`** dipasang sebelum impor dinamis `shpjs`: build CJS-nya merujuk global milik browser, dan impor statis akan mengeksekusi modul sebelum shim terpasang.
- Kolom `geom` bertipe `Unsupported` di Prisma, jadi diisi lewat `$executeRaw` + `ST_GeomFromGeoJSON` pada baris yang sama.
