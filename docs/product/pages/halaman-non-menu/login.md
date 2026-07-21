# Login

[← Halaman Non-Menu & Layout Bersama](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Login (/login)
├── Sidebar / Nav
│   └── — (di luar layout admin & publik)
├── Konten
│   ├── Panel branding (≥lg, bg #166534)
│   │   ├── Logo Leaf + "Smallholder HUB"
│   │   ├── Kutipan pemberdayaan petani
│   │   └── Footer "Sawit Swadaya Program - WRI Indonesia"
│   ├── Logo ringkas (mobile <lg)
│   ├── h1 "Selamat Datang Kembali" + sub judul
│   ├── Pesan galat "Email atau password salah"
│   └── Toast "Login berhasil" → /admin
└── Tombol / Form
    ├── Email (type=email, required)
    ├── Password (type=password, required, tombol mata)
    ├── "Masuk" (submit, spinner Loader2)
    └── "Kembali ke Beranda Utama" → /
```

| Atribut | Nilai |
|---|---|
| File | `src/app/login/page.tsx` (+ `src/components/auth/login-form.tsx`) |
| Tipe | Server Component + form Client Component |
| Guard | Publik; diproteksi middleware NextAuth pada matcher `/login` |
| Server action / data | Tidak ada Server Action — `signIn("credentials", { redirect: false })` dari `next-auth/react` |
| Metadata | `title: "Login - Smallholder HUB"`, `description: "Login untuk masuk ke sistem manajemen"` |

**Objek halaman**

| Objek | Tipe | Keterangan |
|---|---|---|
| Panel branding | Konten | Kolom kiri (≥lg), latar `#166534`, logo `Leaf` + `Smallholder HUB` |
| Kutipan | Konten | `"Memberdayakan petani sawit swadaya untuk produksi kelapa sawit berkelanjutan dan kehidupan yang lebih baik."` — footer `Sawit Swadaya Program - WRI Indonesia` |
| Logo ringkas | Konten | Versi mobile (<lg): ikon `Leaf` + judul `Smallholder HUB` |
| `Selamat Datang Kembali` | Heading | `h1` panel form |
| Sub judul | Konten | `Masukkan email dan kredensial Anda untuk masuk ke sistem` |
| `Email` | Form | Input `type="email"`, `required`, placeholder `nama@wri.org` |
| `Password` | Form | Input `type="password"`, `required`, dengan tombol mata (`Tampilkan password` / `Sembunyikan password`) |
| `Masuk` | Tombol | Submit; saat proses menampilkan spinner `Loader2` dan seluruh input `disabled` |
| Pesan galat | Konten | Blok `Email atau password salah` bila `signIn` mengembalikan error |
| Toast sukses | Konten | `Login berhasil` (sonner), lalu `router.push("/admin")` + `router.refresh()` |
| `Kembali ke Beranda Utama` | Nav | Tautan ke `/` |
