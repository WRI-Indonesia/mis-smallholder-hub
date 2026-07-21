# Halaman Non-Menu & Layout Bersama

[← Katalog halaman](../README.md) · [← Indeks dokumentasi](../../../README.md)

| Atribut | Nilai |
|---|---|
| Menu key | — (tidak terdaftar di `prisma/seeds/data/menu.csv`) |
| URL | `/login`, `/admin/profile`, `/`, `/community`, `/knowledge-management` |
| Icon | — |

Halaman di sini tidak muncul di sidebar dan tidak dijaga `requirePermission`. `/admin/profile` tetap berada di balik matcher NextAuth (`middleware.ts`: `/admin/:path*`); halaman publik dan `/login` bebas akses.

## Diagram objek

```text
Halaman non-menu
├── Layout (admin) — kerangka bersama semua halaman admin
│   ├── Sidebar (app-sidebar) — nav-search, nav-main, nav-user
│   ├── Topbar — SidebarTrigger, breadcrumb, toggle tema
│   ├── Menu profil → /admin/profile · Log out
│   └── <main> konten halaman
│       └── Profil (/admin/profile)            → profil.md
├── Layout (public) — Navbar + Footer
│   ├── Beranda Publik (/)                     → beranda-publik.md
│   ├── Community (/community)                 → community.md
│   └── Knowledge Management (/knowledge-management) → knowledge-management.md
└── Login (/login) — di luar kedua layout      → login.md
```

## Daftar halaman

| Halaman | Route | Berkas dokumentasi |
|---|---|---|
| Login | `/login` | [login.md](./login.md) |
| Profil | `/admin/profile` | [profil.md](./profil.md) |
| Beranda Publik | `/` | [beranda-publik.md](./beranda-publik.md) |
| Community | `/community` | [community.md](./community.md) |
| Knowledge Management | `/knowledge-management` | [knowledge-management.md](./knowledge-management.md) |

## Layout: `(admin)` — kerangka bersama semua halaman admin

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/layout.tsx` |
| Tipe | Server Component; `SidebarProvider` + header sticky + `<main>` |
| Guard | Middleware NextAuth (matcher `/admin/:path*`); guard per-halaman via `requirePermission(menuKey)` |
| Server action / data | `getMenuItems()` (`src/server/actions/menu.ts`) + `auth()` di `AppSidebar`; filter akses `getAccessibleMenuKeys()` (`src/lib/rbac.ts`) & `filterMenuTreeByAccess()` (`src/lib/menu-utils.ts`) |
| Metadata | Template judul `%s \| Admin - Smallholder HUB`, default `Admin - Smallholder HUB` |

**Objek halaman**

| Objek | Tipe | Keterangan |
|---|---|---|
| Sidebar | Nav | `src/components/layout/admin/app-sidebar.tsx` (Server) → `app-sidebar-client.tsx` (Client). Menu 3 level dari tabel `Menu`; SUPERADMIN melihat semua, role lain difilter permission. `collapsible="icon"`, disembunyikan saat cetak (`print:hidden`) |
| Header sidebar | Nav | Tombol logo `Leaf` + `Smallholder HUB` menuju `/admin` |
| `Cari menu…` | Form | `nav-search.tsx`: filter menu client-side, pintasan `Ctrl/⌘+K` untuk fokus, `Esc` mengosongkan, tombol `Hapus pencarian` |
| `Tutup semua menu` | Tombol | Ikon `ChevronsDownUp`, menutup semua grup menu |
| Daftar menu | Nav | `nav-main.tsx`: item tanpa anak jadi tautan langsung; item bergrup memakai `Collapsible` (grup yang memuat rute aktif terbuka otomatis; saat memfilter semua grup dibuka). Hasil kosong → `Menu tidak ditemukan.` |
| Footer sidebar | Nav | `nav-user.tsx`: nama + email pengguna, dropdown berisi `Profile` → `/admin/profile` dan `Log out` (destructive) → `signOut({ callbackUrl: "/login" })` — sama seperti menu profil di topbar |
| Topbar | Konten | Header sticky tinggi 14, `print:hidden`, berisi `SidebarTrigger` + separator + breadcrumb + aksi kanan |
| Breadcrumb | Nav | `admin-breadcrumb.tsx` (Client): akar `AdminPanel` → `/admin/dashboard`, lalu tiap segmen URL dipetakan lewat `labelMap` (mis. `master-data` → `Master Data`, `farmers` → `Data Petani`, `groups` → `Lembaga Petani`, `parcels` → `Data Lahan`, `roles` → `Role & Permission`); halaman detail ber-`[id]` menimpa label segmen terakhir via `breadcrumb-override.tsx` |
| Toggle tema | Tombol | `admin-header-actions.tsx`: ikon `Moon`/`Sun`, sr-only `Toggle theme` |
| Menu profil | Nav | Avatar berinisial + nama pengguna; dropdown menampilkan nama & email, item `Profile` → `/admin/profile` |
| `Log out` | Tombol | Item dropdown (warna destructive) → `signOut({ callbackUrl: "/login" })` |
| Konten halaman | Konten | `<main className="flex-1 p-6 overflow-auto">` memuat halaman aktif |

## Layout: `(public)`

| Atribut | Nilai |
|---|---|
| File | `src/app/(public)/layout.tsx` (+ `error.tsx`, `loading.tsx`) |
| Tipe | Server Component; `Navbar` & `Footer` dari `src/components/layout/public/` |
| Guard | — |
| Server action / data | Tidak ada |

**Objek halaman**

| Objek | Tipe | Keterangan |
|---|---|---|
| Navbar | Nav | `src/components/layout/public/navbar.tsx` (Client), sticky; logo `Smallholder HUB` → `/`; tautan `Home`, `Community`, `Knowledge Management` |
| Toggle tema | Tombol | Ikon `Moon`/`Sun` via `next-themes`, label sr-only `Toggle theme` |
| Toggle bahasa | Tombol | Label `ID` / `EN` — hanya state lokal, belum mengubah konten |
| `Login` | Tombol | Tautan ke `/login` (desktop) |
| Menu mobile | Nav | Sheet kanan (`Toggle navigation menu`, judul sr-only `Menu Navigasi`) berisi `Home`, `Community`, `Knowledge Management`, `Login Admin` |
| Footer | Konten | `src/components/layout/public/footer.tsx`; kolom brand + tautan sosial, `Tautan Cepat` (Tentang Kami, Komunitas, Media, Kontak), `Sumber Daya` (Praktik Terbaik, Materi Pelatihan, Laporan, FAQ), `Hubungi Kami` (Riau Province, Indonesia · info-mis@wri.org · +62 8xxx xxxx xxxx) |
| Bottom bar | Konten | `© {tahun} WRI Indonesia - Sawit Swadaya Program. Semua Hak Dilindungi.` + `Kebijakan Privasi`, `Ketentuan Layanan` |
| Error boundary | Konten | `Terjadi Kesalahan` + `Mohon maaf, halaman tidak dapat dimuat saat ini. Silakan coba kembali beberapa saat lagi.` + tombol `Coba Lagi` |
| Loading | Konten | Spinner + `Memuat konten...` |
