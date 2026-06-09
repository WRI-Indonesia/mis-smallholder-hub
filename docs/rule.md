# Smallholder HUB — Development Rules

> Panduan development Smallholder HUB MIS.
> Lihat juga: [general-rule.md](./general-rule.md) untuk prinsip behavioral umum.

---

## Informasi Proyek

| Key | Value |
|-----|-------|
| **Stack** | Next.js 16 · React 19 · Tailwind 4 · Shadcn UI · Prisma 7 · MapLibre |
| **Repository** | `WRI-Indonesia/mis-smallholder-hub` |
| **Branch Aktif** | `dev-phase-4` |

---

## Prinsip Development

### 1. Think Before Coding

- Nyatakan asumsi secara eksplisit. Jika ragu, tanya.
- Jika ada beberapa interpretasi, paparkan — jangan pilih diam-diam.
- Jika ada pendekatan lebih sederhana, sampaikan. Push back jika perlu.
- Jika sesuatu tidak jelas, berhenti. Sebutkan apa yang membingungkan.

### 2. Simplicity First

- **Minimal code** — Sesedikit mungkin untuk menyelesaikan kebutuhan. Jangan over-engineer.
- **Flat over nested** — Prefer early return, guard clause.
- **Obvious over clever** — Code harus bisa dibaca tanpa penjelasan tambahan.
- **Single responsibility** — Satu fungsi/komponen = satu tugas.
- **No premature abstraction** — Baru abstraksi jika ada 3+ kasus sama.
- **Delete over comment** — Hapus dead code, jangan comment out.
- **No speculative features** — Tidak ada fitur/error handling untuk skenario yang tidak diminta.

Tes: Jika 200 baris bisa jadi 50, tulis ulang.

### 3. Surgical Changes

- Sentuh **hanya** yang harus diubah sesuai permintaan.
- Jangan "improve" code, comment, atau formatting yang berdekatan.
- Jangan refactor yang belum rusak.
- Match style existing, walau berbeda preferensi.
- Jika temukan dead code lain, sebutkan — jangan hapus tanpa diminta.
- Hapus imports/variables yang menjadi unused **akibat perubahan kamu** saja.

Tes: Setiap baris yang berubah harus bisa di-trace langsung ke permintaan user.

### 4. Goal-Driven Execution

Ubah task menjadi goal yang bisa diverifikasi:

- "Add validation" → Tulis test invalid input, lalu buat passing
- "Fix bug" → Tulis test reproduksi, lalu fix
- "Refactor X" → Pastikan tests pass sebelum dan sesudah

Untuk multi-step task, buat plan singkat:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

---

## Branching & Workflow

### Branching

- Satu branch yang ditentukan project owner
- Tidak boleh buat feature/experiment/PR branch terpisah

### Issue Workflow

1. **Pick Issue** — Ambil GitHub Issue yang sudah di-approve
2. **Implement** — Kerjakan **hanya** scope issue
3. **QA Lokal** — `npm run build` dan `npm test`
4. **Performance Test** — Pastikan tidak ada regresi
5. **Report** — Changed files, hasil verifikasi, QA notes, risk
6. **Approval** — Tunggu approval sebelum push

---

## Safety & Approval

**Wajib minta approval project owner** sebelum:

| Category | Actions |
|----------|---------|
| Destructive | Hapus file, drop table, reset DB, force push |
| Database Mutations | CREATE/UPDATE/DELETE data (Prisma seed, migration, manual query) |

---

## Code Standards

| Rule | Detail |
|------|--------|
| File naming | `kebab-case` |
| Variable naming | Bahasa Inggris |
| Import | Langsung dari sub-module, bukan barrel index |
| Default | Server Component, `"use client"` hanya jika perlu |
| Data layer | CSV = static, Prisma = dynamic |
| Validation | Zod di `src/validations/` |
| Server Actions | Di `src/server/actions/` |

### Data Access & Soft Delete

- **Soft delete** — Semua tabel punya `isActive Boolean @default(true)`. Tidak pernah hard delete dari app.
- **Data filtering** — Setiap query di server actions wajib filter berdasarkan context user:
  - `isActive: true` (exclude soft-deleted records)
  - Region sesuai assignment user (Province → District → KT)
  - Kelompok Tani sesuai assignment user
  - Role & Permission menentukan level akses (view/edit/delete)
- **Pattern** — Gunakan helper function untuk inject where clause RBAC, jangan copy-paste manual di setiap action.
- **Backend Permission Validation** — Setiap Server Action (terutama mutasi data) wajib divalidasi ulang di level server menggunakan helper `hasPermission(menuCode, permission)` sebelum melakukan query/mutasi database, untuk mencegah eksekusi request langsung yang tidak sah (bypass UI).

### RBAC Data Access Hierarchy

```
SUPERADMIN        → skip semua filter (akses ALL)
No assignment     → unrestricted (akses ALL)
UserFarmerGroup   → hanya KT spesifik (filter by FarmerGroup.id)
UserDistrict      → semua KT di district (filter by districtId)
UserProvince      → semua district di province → semua KT (filter by districtId)
```

Konvensi (urutan prioritas):
1. SUPERADMIN → `ALL`
2. Tidak ada assignment sama sekali → `ALL` (unrestricted)
3. **Hanya** `UserFarmerGroup` ada (tanpa Province/District) → filter `id IN [farmerGroupIds]`
4. `UserProvince` dan/atau `UserDistrict` ada → resolve ke district IDs → filter `districtId IN [...]`

> [!IMPORTANT]
> Jika user memiliki assignment campuran (Province + FarmerGroup), mode **BY_DISTRICT** yang berlaku — bukan BY_FARMER_GROUP. Rule #3 hanya aktif jika Province dan District **sama-sama kosong**.

**Implementation Pattern** — Gunakan discriminated union `AccessContext` di server action:

```ts
type AccessContext =
  | { mode: "ALL" }
  | { mode: "BY_FARMER_GROUP"; ids: string[] }
  | { mode: "BY_DISTRICT"; ids: string[] };

// Resolusi where clause:
const accessFilter =
  access.mode === "BY_FARMER_GROUP" ? { id: { in: access.ids } } :
  access.mode === "BY_DISTRICT"     ? { districtId: { in: access.ids } } :
  {};
```

> [!WARNING]
> **Bug pattern lama** — Jangan filter hanya berdasarkan `districtId` tanpa handle case `BY_FARMER_GROUP`. Jika user hanya assign KT dan code menghasilkan `districtId: { in: [] }`, semua data KT akan hilang dari query.

### User Data Access Assignment UI

Untuk assign data access per user (Province/District/KT):
- **Server Actions** — di `src/server/actions/user-data-access.ts`: `getUserDataAccess`, `getRegionsForSelect`, `assignUserProvince/District/FarmerGroup`, `removeUserProvince/District/FarmerGroup`
- **Modal** — `UserDataAccessModal` (Tabs: Provinsi | Distrik | KT) dengan live-save checkbox per item
- **Table Summary** — Gunakan komponen `AccessSummaryCell` di kolom "Akses Data": badge per assignment, `—` jika kosong
- **Real-time refresh** — Pass `onDataChange` callback ke modal → panggil `startTransition(() => router.refresh())` setiap toggle berhasil

### User Menu Access Override UI

Untuk melakukan override permission menu per user (grant/revoke):
- **Server Actions** — di `src/server/actions/user-menu-access.ts`: `getUserMenuOverrides`, `getMenuItemsForSelect`, `getUserEffectivePermissions`, `setUserMenuOverride`, `removeUserMenuOverride`
- **Modal** — `UserMenuAccessModal` dengan matrix C | V | E | D per menu, visual code status (`role` | `granted` | `revoked`), dan interactive toggle saving.
- **Keamanan** — Pengecekan di server action wajib menolak override terhadap user berkole `SUPERADMIN`.
- **Soft Delete** — Penghapusan override menggunakan update `isActive: false` (bukan physical delete).
- **Optimasi Caching** — Fungsi pembacaan permission di `src/lib/rbac.ts` wajib dibungkus dengan React `cache` untuk mereduksi kueri ganda pada render lifecycle.

---

## UI/UX

### Prinsip

- Komponen **Shadcn UI** + utility **Tailwind 4**
- Warna pakai variabel `oklch` di `globals.css`
- Font: Acumin Pro Condensed
- Mobile-first responsive

### Layout Admin

- Header halaman (judul & deskripsi) wajib
- Pembungkus data pakai `<Card>`
- Form kompleks → pisah seksi, hindari scroll bertumpuk

### Table Typography

| Element | Styling |
|---------|---------|
| Header | `bg-muted/70 border-b-2` · `text-xs font-semibold uppercase tracking-wider text-muted-foreground` |
| Data utama | `text-sm font-medium` |
| Kode/ID | `text-sm font-mono text-muted-foreground` |
| Data sekunder | `text-sm text-muted-foreground` |
| Angka | `text-sm tabular-nums` |
| Kosong/null | `—` + `text-muted-foreground` |
| Status | `<Badge>` |

### Table Actions

Untuk aksi dalam tabel (tombol Edit, Lihat, Hapus, Nonaktifkan, dll), ikuti aturan berikut untuk konsistensi:
- **Posisi Kolom**: Kolom **Aksi** wajib diletakkan di bagian paling kiri tabel (kolom pertama).
- **Lebar Kolom (Autofit)**: Kolom **Aksi** wajib memiliki lebar seminimal mungkin (autofit) agar tidak memakan ruang kolom lainnya. Gunakan kelas `w-[1%] whitespace-nowrap` pada `TableHead` dan `TableCell` pembungkus kolom Aksi.
- **Format Tombol**: Gunakan tombol berbasis icon tanpa teks dengan properti `<Button variant="ghost" size="icon">`.
- **Desain Icon & Tooltip**:
  - Setiap tombol wajib memiliki properti `title` untuk aksesibilitas dan penjelasan singkat aksi.
  - Aksi **Lihat**: Gunakan icon `<Eye className="h-4 w-4" />` dengan `title="Lihat"`.
  - Aksi **Edit**: Gunakan icon `<Pencil className="h-4 w-4" />` dengan `title="Edit"`.
  - Aksi **Nonaktifkan**: Gunakan icon `<Trash2 className="h-4 w-4" />` dengan `title="Nonaktifkan"`.
- **Visibilitas Berbasis Izin (Role & Permission)**: Semua tombol aksi dan tombol penambahan data (Tambah/Create) harus dilindungi (show/hide) secara dinamis menggunakan daftar izin (`permissions`) yang diperoleh dari backend:
  - Tombol **Tambah / Create** di atas tabel di-render jika: `permissions.includes("CREATE")`.
  - Tombol **Lihat / View** di-render jika: `permissions.includes("VIEW")`.
  - Tombol **Edit** di-render jika: `permissions.includes("EDIT")`.
  - Tombol **Nonaktifkan / Aktifkan kembali (Delete/Restore)** di-render jika: `permissions.includes("DELETE")`.
- **Abstraksi Komponen (`TableActions`)**: Gunakan komponen pembungkus `<TableActions>` dari `@/components/shared` untuk merender seluruh tombol aksi baris tabel secara otomatis berdasarkan daftar izin (`permissions`) dan array konfigurasi `actions` untuk menghindari pengulangan kode inline.
- **Loading Placeholder (`TableSkeleton`)**: Gunakan komponen `<TableSkeleton>` pada file `loading.tsx` dari menu tabel bersangkutan untuk menampilkan placeholder table-row loading saat data sedang dimuat secara asinkron, guna meminimalkan layout shift.

### Table Pagination

Untuk tabel dengan pagination, ikuti aturan layout dan state berikut untuk konsistensi:
- **State Halaman**: Gunakan 0-based index untuk variabel state `page` (halaman pertama = `0`).
- **Reset Halaman**: Selalu reset `page` kembali ke `0` ketika input pencarian (`search`) atau dropdown filter berubah.
- **Batas Indeks Aman**: Hitung indeks halaman aman (`safePage = Math.min(page, totalPages - 1)`) untuk mencegah tampilan halaman kosong jika jumlah data berkurang secara dinamis.
- **Pilihan Ukuran Halaman**: Sediakan pilihan ukuran halaman (`[10, 25, 50, 100]`) menggunakan dropdown `<Select>` Shadcn UI.
- **Layout Kontrol**:
  - Bagian Kiri: Dropdown pemilihan ukuran halaman ("Tampilkan [dropdown] dari [total] data").
  - Bagian Kanan: Indikator halaman ("Halaman [aktif] dari [total_halaman]") beserta tombol navigasi sebelumnya/selanjutnya menggunakan `<Button variant="outline" size="icon" className="h-8 w-8">` dan icon `<ChevronLeft>` / `<ChevronRight>` berukuran `h-4 w-4`.

### Table Export & Column Selection (DataTable)

Untuk tabel yang menggunakan komponen `<DataTable>`, konfigurasi berikut harus didukung:
- **Show/Hide Kolom**: Disediakan tombol dropdown "Kolom" untuk memilih visibilitas kolom.
- **Export Excel**:
  - Disediakan tombol "Excel" untuk mengunduh data tabel saat ini (hasil pencarian/filter aktif).
  - Diaktifkan dengan menyertakan prop `exportFilename` (misalnya `exportFilename="data-users"`).
  - Kustomisasi mapping baris dilakukan melalui prop `getExportRow` untuk meratakan relasi atau data kompleks.
- **Posisi Tombol Tambah**: Tombol "Tambah / Create" di-render secara konsisten di paling kanan toolbar menggunakan prop `toolbarRight` dari `<DataTable>`.

### State & Feedback

- Loading state wajib (skeleton/spinner)
- Toast setelah action berhasil/gagal

### Bulk Upload UI/UX & Validation Pattern

Untuk fitur bulk upload data massal (misalnya Petani, Kelompok Tani, atau Region), ikuti aturan alur dan antarmuka berikut:
- **Alur Step-by-Step**:
  1. Pilih context / parent entity (misalnya Kelompok Tani) di paling atas menggunakan searchable Combobox. Pilihan file input harus tetap *disabled* sampai context dipilih.
  2. Pilih berkas Excel (`.xlsx`) atau CSV. Input file dinonaktifkan jika context di atas belum dipilih.
  3. Pemetaan kolom dinamis (*Dynamic Column Mapping*): sediakan pemetaan drop-down kolom file dengan field target database, lengkap dengan aturan auto-matching.
  4. Hasil validasi dan review: Tampilkan status per baris, jumlah ringkasan valid vs error, serta filter tampilan data.
- **Smart Validations**:
  - Validasi keunikan ID: Cek keunikan baik di tingkat berkas (*file-level*) maupun terhadap database (*DB-level*).
  - Normalisasi data: Konversi format gender (L/P -> M/F), bersihkan format NIK (hanya angka 16 digit), dan parse berbagai format tanggal (Excel serial number atau string tanggal).
- **Download Feedback**:
  - Pengguna wajib diberikan opsi untuk mengunduh laporan hasil validasi baik data penuh (*full data*) maupun baris yang gagal saja (*error-only*), dengan menyertakan kolom "Keterangan" penjelasan error.

### Searchable Kelompok Tani Filters

- **Wajib menggunakan Combobox**: Untuk mempermudah pencarian dan penyaringan data di semua halaman list master data (terutama data Petani) atau alur lainnya, semua komponen filter/dropdown **Kelompok Tani** wajib menggunakan komponen **searchable Combobox** (kombinasi Popover & Command Shadcn UI) dengan kemampuan pencarian teks, dan tidak diperbolehkan menggunakan dropdown Select box standar.

---

## Arsitektur

```
src/
├── app/
│   ├── (admin)/admin/        # Dashboard, master-data, settings, tools
│   ├── (public)/             # Home, community, knowledge
│   └── globals.css           # Design tokens
├── components/
│   ├── ui/                   # Shadcn primitives
│   ├── shared/               # DataTable, DeleteDialog
│   ├── dashboard/            # Dashboard components
│   └── layout/               # Admin & public layout
├── lib/                      # Prisma, utils, static-data
├── server/actions/           # Server Actions
├── validations/              # Zod schemas
└── types/                    # Custom types
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Shadcn UI |
| Styling | Tailwind 4 + oklch tokens |
| Database | PostgreSQL + PostGIS |
| ORM | Prisma 7 (modular schema) |
| Maps | MapLibre GL JS |
| Charts | Recharts |
| Validation | Zod + React Hook Form |
