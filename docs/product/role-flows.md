# Produk — Alur per Role

> Bagian dari dokumentasi **Produk**. Indeks: [../README.md](../README.md) · Terkait: [navigation.md](navigation.md) · [access-context.md](./access-context.md) · [crud-flows.md](./crud-flows.md) · [../project/roadmap.md](../project/roadmap.md#phase-status-indeks)

<details>
<summary><strong>Role-Specific Access Summary</strong></summary>

> Matriks di bawah menggambarkan **grant awal seed** (`prisma/seeds/data/role-permissions.csv`) + pewarisan kaskade induk→anak (`getEffectiveMenuPermissions`, lihat [access-context.md](./access-context.md)). `RolePermission` dapat diubah runtime via **Settings → Role & Permission**, jadi instalasi berjalan bisa berbeda dari default ini.

## SUPERADMIN

- **Dashboard**: ✅ Main Dashboard + BMP (semua snapshot, semua data) · ✅ **Dashboard Pelatihan** (live query, semua Lembaga) · ✅ **Dashboard Monev BMP** (live query, #344) · ✅ **Fire Alert (Risk Management)** (VIEW+PRINT, #266)
- **Master Data**: ✅ Full CRUD, all regions/groups/farmers
- **Settings**: ✅ User/Role/Menu/Region management
- **Report**: ✅ All reports, all data
- **Bulk Upload**: ✅ All modules
- **Tools**: ✅ Dashboard Snapshot (generate/view/delete), Export, S3/PDF, GIS

## ADMIN (level Distrik/Provinsi)

- **Dashboard**: ✅ Main Dashboard + BMP (snapshot dalam scope distrik + org-wide) · ✅ **Dashboard Pelatihan** (live query, ter-scope distrik via `farmerGroupAccessFilter` per request) · ✅ **Dashboard Monev BMP** (live query, scope sama, #344) · ✅ **Fire Alert (Risk Management)** (VIEW+PRINT, #266)
- **Master Data**: ✅ Keenam modul (Lembaga Petani, Petani, Pelatihan, Lahan, Produksi, Monev BMP) CREATE/EDIT/VIEW/EXPORT/PRINT, **tanpa DELETE** (DELETE hanya SUPERADMIN) — scope distrik
- **Settings**: ❌ No access (tidak ada baris seed `settings-*` untuk ADMIN)
- **Report**: ✅ Semua report (data ter-scope)
- **Bulk Upload**: ✅ Petani, Lahan, Pohon Sawit & Produksi (CREATE/EDIT/VIEW/EXPORT/PRINT, scope masing-masing)
- **Data Analyst**: ✅ Ketersediaan Data — Per Lembaga & Semua Lembaga (CREATE/EDIT/VIEW/EXPORT/PRINT) · ✅ **Tumpang Tindih Lahan** VIEW+EXPORT (#317 — pasangan tampil bila minimal satu sisi dalam scope, sisi lawan lengkap; lihat access-context.md) · ✅ **Komparasi Data Acuan** CREATE/EDIT/VIEW/EXPORT/PRINT · ✅ Peta Data & Skema, Rencana Pengembangan, Metrik Rilis (VIEW) · ✅ **Rencana Pengembangan** (VIEW, #378) · ❌ Ringkasan Petani (hanya SUPERADMIN)
- **Map**: ✅ Peta Lahan + Peta BMP (CREATE/EDIT/VIEW/EXPORT/PRINT, tanpa DELETE)
- **Bantuan**: ✅ VIEW/EXPORT/PRINT
- **Tools**: ✅ Dashboard Snapshot + Snapshot BMP (generate/view, **tanpa delete** — tidak ada baris DELETE; scope distrik)

## OPERATOR (level lapangan)

- **Dashboard**: ✅ Main Dashboard + BMP (VIEW/EXPORT/PRINT; snapshot dalam scope KT + org-wide) · ✅ **Dashboard Pelatihan** (VIEW/EXPORT/PRINT; live query ter-scope Lembaga yang di-assign) · ✅ **Dashboard Monev BMP** (VIEW/EXPORT/PRINT, scope sama, #344) · ✅ **Fire Alert (Risk Management)** (VIEW+PRINT, #266)
- **Master Data**: 🟠 Keenam modul VIEW/EXPORT/PRINT saja, **tanpa CREATE/EDIT/DELETE** (dikunci `menu-access.test.ts`: "OPERATOR & MANAGEMENT tidak punya hak tulis") — dalam scope Lembaga yang di-assign
- **Settings**: ❌ No access
- **Report**: ✅ Semua report (data ter-scope Lembaga)
- **Bulk Upload**: ❌ No access (tidak ada baris seed `bulk-upload*` untuk OPERATOR)
- **Data Analyst**: ✅ Ketersediaan Data — Per Lembaga & Semua Lembaga (VIEW/EXPORT/PRINT) · ✅ **Tumpang Tindih Lahan** VIEW+EXPORT (#317 — pasangan tampil bila minimal satu sisi dalam scope, sisi lawan lengkap; lihat access-context.md) · ✅ **Komparasi Data Acuan** VIEW/EXPORT/PRINT · ❌ Ringkasan Petani (hanya SUPERADMIN)
- **Map**: ✅ Peta Lahan + Peta BMP (VIEW/EXPORT/PRINT)
- **Bantuan**: ✅ VIEW/EXPORT/PRINT
- **Tools**: ❌ No access (tidak diberi akses Dashboard Snapshot)

## MANAGEMENT (hanya baca)

- **Dashboard**: ✅ Main Dashboard + BMP (view all metrics, organization-wide) · ✅ **Dashboard Pelatihan** (VIEW, organization-wide) · ✅ **Dashboard Monev BMP** (VIEW, #344) · ✅ **Fire Alert (Risk Management)** (VIEW+PRINT, #266)
- **Master Data**: 🟠 Keenam modul VIEW/EXPORT/PRINT, tanpa CREATE/EDIT/DELETE
- **Settings**: ❌ No access
- **Report**: ✅ View all reports (all data)
- **Bulk Upload**: ❌ No access
- **Data Analyst**: ✅ Ketersediaan Data — Per Lembaga & Semua Lembaga (VIEW/EXPORT/PRINT) · ✅ **Tumpang Tindih Lahan** VIEW+EXPORT (#317 — pasangan tampil bila minimal satu sisi dalam scope, sisi lawan lengkap; lihat access-context.md) · ✅ **Komparasi Data Acuan** VIEW/EXPORT/PRINT · ✅ Peta Data & Skema, Rencana Pengembangan, Metrik Rilis (VIEW) · ✅ **Rencana Pengembangan** (VIEW, #378) · ❌ Ringkasan Petani (hanya SUPERADMIN)
- **Map**: ✅ Peta Lahan + Peta BMP (VIEW/EXPORT/PRINT)
- **Bantuan**: ✅ VIEW/EXPORT/PRINT
- **Tools**: ❌ No access (tidak ada baris seed `tools`/`dashboard-snapshot*` untuk MANAGEMENT)

## DONOR (hanya baca, donor/funder, #187)

Tipe pengguna untuk pihak donor/funder — **VIEW + PRINT** pada subset menu (tanpa EXPORT maupun hak tulis). Cakupan data mengikuti aturan yang sama (tanpa assignment = `ALL`, dengan assignment = ter-scope).

- **Dashboard**: ✅ Main Dashboard + BMP + Dashboard Pelatihan + Dashboard Monev BMP (VIEW+PRINT) · ✅ **Fire Alert (Risk Management)** (VIEW+PRINT, #266)
- **Report**: ✅ Petani, Pelatihan, Produksi, Lahan — VIEW + PRINT (PDF) saja, **tanpa EXPORT** (Excel) · ❌ Kelompok Tani (Summary/Detail) & Patok (dicabut 2026-09-23 di produksi, diadopsi seed 2026-09-29)
- **Map**: ✅ Peta Lahan + Peta BMP (VIEW+PRINT)
- **Bantuan**: ✅ VIEW+PRINT
- **Master Data**: ✅ Lembaga Petani, Petani, Pelatihan, Lahan, Monev BMP — VIEW + PRINT saja (tanpa CREATE/EDIT/DELETE/EXPORT); ❌ Produksi. Revisi #263 (keputusan owner 2026-09-29)
- **Data Analyst**: ❌ No access (termasuk Dashboard Ketersediaan Data — keputusan owner #193: alat kerja internal kualitas data; Tumpang Tindih Lahan #317 juga tidak — identitas lintas scope, dikunci `menu-access.test.ts`)
- **Settings**: ❌ No access
- **Bulk Upload**: ❌ No access
- **Tools**: ❌ No access

> Privasi: DONOR melihat data individu petani (nama/NIK) lewat Master Data › Petani dan laporan — **disengaja** (keputusan owner 2026-09-29, merevisi #263). Pemisahan agregat-saja via menu khusus DONOR = follow-up (lihat retro #187).

</details>
