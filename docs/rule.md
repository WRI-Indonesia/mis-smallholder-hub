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
UserProvince → semua District di province → semua KT di district
UserDistrict → semua KT di district tersebut
UserFarmerGroup → hanya KT spesifik
SUPERADMIN → skip semua filter
```

Konvensi:
- `UserFarmerGroup` ada → filter ke KT tersebut saja
- `UserFarmerGroup` kosong + `UserDistrict` ada → semua KT di district
- `UserDistrict` kosong + `UserProvince` ada → semua district di province → semua KT
- SUPERADMIN → akses semua tanpa filter

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

### State & Feedback

- Loading state wajib (skeleton/spinner)
- Toast setelah action berhasil/gagal

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
