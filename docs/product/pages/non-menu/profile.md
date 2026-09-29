# Profil

[← Halaman Non-Menu & Layout Bersama](README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Profil (/admin/profile)
├── Header
│   └── Topbar layout (admin) — breadcrumb + menu profil
├── Sidebar / Nav
│   └── AppSidebar layout (admin) — halaman ini tidak punya entri menu
├── Konten
│   ├── h1 "Profile" + "Informasi akun Anda"
│   ├── Kartu identitas (read-only): Nama · Email · Role
│   └── Toast sukses/gagal
└── Tombol / Form
    └── Kartu "Ganti Password"
        ├── Password Lama (required)
        ├── Password Baru (required, minLength=6)
        ├── Konfirmasi Password Baru (required, minLength=6)
        └── "Simpan Password" (submit, spinner)
```

| Atribut | Nilai |
|---|---|
| File | `src/app/(admin)/admin/profile/page.tsx` (+ `change-password-form.tsx`) |
| Tipe | Server Component + form Client Component |
| Guard | `auth()`; tanpa sesi → `redirect("/login")`. Tidak memakai `requirePermission` (bukan menu) |
| Server action / data | Data akun dari sesi (`session.user`); mutasi: `changePassword(currentPassword, newPassword)` — `src/server/actions/profile.ts`, validasi `changePasswordSchema` (`src/validations/profile.schema.ts`), verifikasi bcrypt password lama |

**Objek halaman**

| Objek | Tipe | Keterangan |
|---|---|---|
| `Profile` | Heading | `h1` |
| `Informasi akun Anda` | Konten | Deskripsi halaman |
| Kartu identitas | Kartu | Grid berisi `Nama`, `Email`, `Role` dari sesi (read-only) |
| `Ganti Password` | Heading | `h2` kartu form |
| `Password Lama` | Form | Input `type="password"`, `required` |
| `Password Baru` | Form | Input `type="password"`, `required`, `minLength=6` |
| `Konfirmasi Password Baru` | Form | Input `type="password"`, `required`, `minLength=6` |
| `Simpan Password` | Tombol | Submit dengan spinner saat proses |
| Toast | Konten | Sukses: `Password berhasil diubah` (form di-reset, `router.push("/admin")`). Gagal: pesan dari action — `Password baru tidak cocok` (cek klien), `Tidak terautentikasi`, `User tidak ditemukan`, `Password lama salah`, pesan Zod pertama yang gagal (`Password lama wajib diisi` / `Password baru minimal 6 karakter`), fallback `Input tidak valid` |
