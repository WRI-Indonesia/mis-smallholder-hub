# Beranda Publik

[← Halaman Non-Menu & Layout Bersama](./README.md) · [← Katalog halaman](../README.md)

## Diagram objek

```text
Halaman: Beranda Publik (/)
├── Header
│   └── Navbar layout (public) — Home · Community · Knowledge Management
├── Konten
│   ├── Ikon hero Leaf (bg-primary/10)
│   ├── h1 "Smallholder HUB"
│   └── Sub judul "Management Information System"
├── Tombol / Form
│   └── "Login" → /login (ikon ArrowRight)
└── Footer
    └── Footer layout (public)
```

| Atribut | Nilai |
|---|---|
| File | `src/app/(public)/page.tsx` |
| Tipe | Server Component statis |
| Guard | Publik |
| Server action / data | Tidak ada |

**Objek halaman**

| Objek | Tipe | Keterangan |
|---|---|---|
| Ikon hero | Konten | `Leaf` dalam kotak `bg-primary/10` |
| `Smallholder HUB` | Heading | `h1` |
| `Management Information System` | Konten | Sub judul |
| `Login` | Tombol | Tautan ke `/login`, ikon `ArrowRight` |
