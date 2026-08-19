# Produk — Alur per Role

> Bagian dari dokumentasi **Produk**. Indeks: [../README.md](../README.md) · Terkait: [architecture.md](./architecture.md) · [access-context.md](./access-context.md) · [crud-flows.md](./crud-flows.md) · [module-status.md](./module-status.md)

<details>
<summary><strong>Role-Specific Access Summary</strong></summary>

> Matriks di bawah menggambarkan **grant awal seed** (`prisma/seeds/data/role-permissions.csv`) + pewarisan kaskade induk→anak (`getEffectiveMenuPermissions`, lihat [access-context.md](./access-context.md)). `RolePermission` dapat diubah runtime via **Settings → Role & Permission**, jadi instalasi berjalan bisa berbeda dari default ini.

## SUPERADMIN

- **Dashboard**: ✅ Main Dashboard + BMP (semua snapshot, semua data) · ✅ **Dashboard Pelatihan** (live query, semua Lembaga) · ✅ **Fire Alert (Risk Management)** (VIEW+PRINT, #266)
- **Master Data**: ✅ Full CRUD, all regions/groups/farmers
- **Settings**: ✅ User/Role/Menu/Region management
- **Report**: ✅ All reports, all data
- **Bulk Upload**: ✅ All modules
- **Tools**: ✅ Dashboard Snapshot (generate/view/delete), Export, S3/PDF, GIS

## ADMIN (District/Province Level)

- **Dashboard**: ✅ Main Dashboard + BMP (snapshot dalam scope distrik + org-wide) · ✅ **Dashboard Pelatihan** (live query, ter-scope distrik via `farmerGroupAccessFilter` per request) · ✅ **Fire Alert (Risk Management)** (VIEW+PRINT, #266)
- **Master Data**: ✅ CRUD penuh Pelatihan/Lahan/Produksi (scope distrik); Lembaga Petani & Petani **VIEW saja** (Petani lewat warisan `master-data`)
- **Settings**: ❌ No access (tidak ada baris seed `settings-*` untuk ADMIN)
- **Report**: ✅ Semua report (data ter-scope)
- **Bulk Upload**: ✅ Petani, Lahan, Pohon Sawit & Produksi (CREATE+VIEW, scope masing-masing)
- **Data Analyst**: ✅ VIEW (Ringkasan Petani + Analisa Ketersediaan Data + Dashboard Ketersediaan Data)
- **Bantuan**: ✅ VIEW
- **Tools**: ✅ Dashboard Snapshot + Snapshot BMP (generate/view/delete, scope distrik)

## OPERATOR (Field Level)

- **Dashboard**: ✅ Main Dashboard + BMP (VIEW; snapshot dalam scope KT + org-wide) · ✅ **Dashboard Pelatihan** (VIEW; live query ter-scope Lembaga yang di-assign) · ✅ **Fire Alert (Risk Management)** (VIEW+PRINT, #266)
- **Master Data**: ✅ Pelatihan CRUD penuh; Lahan & Produksi CREATE/EDIT/VIEW (**tanpa DELETE**); Lembaga Petani & Petani **VIEW saja** (Petani lewat warisan `master-data`) — dalam scope Lembaga yang di-assign
- **Settings**: ❌ No access
- **Report**: ✅ Semua report (data ter-scope Lembaga)
- **Bulk Upload**: ✅ Petani & Produksi (CREATE+VIEW); Lahan & Pohon Sawit hanya VIEW warisan dari `bulk-upload` (tanpa CREATE)
- **Data Analyst**: ✅ VIEW (Ringkasan Petani + Analisa Ketersediaan Data + Dashboard Ketersediaan Data)
- **Bantuan**: ✅ VIEW
- **Tools**: ❌ No access (tidak diberi akses Dashboard Snapshot)

## MANAGEMENT (Read-Only)

- **Dashboard**: ✅ Main Dashboard + BMP (view all metrics, organization-wide) · ✅ **Dashboard Pelatihan** (VIEW, organization-wide) · ✅ **Fire Alert (Risk Management)** (VIEW+PRINT, #266)
- **Master Data**: 🟠 View-only (semua modul master data VIEW, tanpa CRUD)
- **Settings**: ❌ No access
- **Report**: ✅ View all reports (all data)
- **Bulk Upload**: ❌ No access
- **Data Analyst**: ✅ VIEW (Ringkasan Petani + Analisa Ketersediaan Data + Dashboard Ketersediaan Data)
- **Bantuan**: ✅ VIEW
- **Tools**: 🟠 Dashboard Snapshot + Snapshot BMP (view-only, tanpa generate/delete)

## DONOR (Read-Only donor/funder, #187)

Tipe pengguna untuk pihak donor/funder — **VIEW-only** pada subset menu. Cakupan data mengikuti aturan yang sama (tanpa assignment = `ALL`, dengan assignment = ter-scope).

- **Dashboard**: ✅ Main Dashboard + BMP + Dashboard Pelatihan (VIEW) · ✅ **Fire Alert (Risk Management)** (VIEW+PRINT, #266)
- **Report**: 🔲 View reports (Petani, Pelatihan, Produksi, Kelompok Tani, Lahan) — ekspor Excel/PDF diizinkan
- **Map**: ✅ Peta Lahan + Peta BMP (VIEW)
- **Bantuan**: ✅ VIEW
- **Master Data**: ❌ No access
- **Data Analyst**: ❌ No access (termasuk Dashboard Ketersediaan Data — keputusan owner #193: alat kerja internal kualitas data)
- **Settings**: ❌ No access
- **Bulk Upload**: ❌ No access
- **Tools**: ❌ No access

> Privasi (sementara): DONOR masih melihat data individu petani (nama/NIK) seperti MANAGEMENT. Pemisahan agregat-saja via menu khusus DONOR = follow-up (lihat retro #187).

</details>
