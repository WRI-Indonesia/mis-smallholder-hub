# Proyek — Changelog & Decision Log

> Bagian dari dokumentasi **Proyek**. Indeks: [../README.md](../README.md) · Terkait: [brief.md](./brief.md) · [roadmap.md](./roadmap.md) · [sprint.md](./sprint.md) · [tech-debt.md](./tech-debt.md) · [contributing.md](./contributing.md)

> Riwayat historis Smallholder HUB: perintah audit, Decision Log, dan Changelog per bulan.
> **Jangan gunakan file ini sebagai acuan status.** Status resmi ada di tabel **Phase Status** pada [`roadmap.md`](./roadmap.md).
> Dipisah dari `progress.md` (restrukturisasi 2026-07-12) agar file status tetap ramping.

Format: satu berkas per bulan di [`changelog/`](./changelog/) — tiap berkas berisi **Decision Log** (`YYYY-MM-DD`) dan **Changelog** (`MM-DD`). Entri baru ditambahkan sebagai **baris teratas** tabel di berkas bulan berjalan; saat ganti bulan, buat `changelog/YYYY-MM.md` baru dan tambahkan barisnya di tabel di bawah. Keputusan besar (arsitektur, kebijakan, aturan yang berlaku lintas modul) juga ditulis sebagai catatan keputusan di [`../decisions/`](../decisions/README.md).

### Ringkasan Dua Minggu Terakhir (8 – 21 Oktober 2026)

> Snapshot per 2026-10-21 — perbarui/ganti section ini saat menulis ringkasan periode berikutnya. Ringkasan 30 September – 10 Oktober (v1.3.0 → v1.6.0) ada di riwayat git berkas ini; rincian per hari di Changelog Oktober 2026.

- **Rilis:** **v1.5.0** (10-09) · **v1.5.1** hotfix keamanan + **v1.6.0** (10-10) → **v1.7.0** (10-12, menu induk Ketersediaan Data + kalender Produksi #416, Semua Lembaga ringkas #417, template & pemetaan berkelompok Upload Massal #419/#420; PATCH v1.6.1 batal karena #416 ikut) → **v1.8.0** (10-14, Excel produktivitas per umur tanaman #426 + batas TBM/TM #428, Reset filter seragam #427, menu Daftar Issue #429, layer hutan & deforestasi Kemenhut + EUDR/GFW #433) → **v1.9.0** (10-17, menu Peta Fitur 12 tampilan #437 + prototipe Aliran TBS 10 tab #381). Roadmap 2026–2027 **18,6% → 28,6%** (DA-08 🟠, PLATFORM-08/09 ✅, GIS-02 🟠). Berjalan: **v1.10.0** Supply Chain versi DB (10-18 → 11-08).
- **Keamanan:** celah laten #409 (distrik tujuan Lembaga), #386 (anti-eskalasi Settings › Users) dan guard Peta BMP #384 dirilis di v1.7.0 → bug open 4 → **0**; izin prod dijadikan acuan sesudah `rbac:compare` v1.9.0 (Dashboard Rantai Pasok & Excel Daftar Issue).
- **Data prod (DQ-01):** produktivitas BMP disetahunkan (10-08); Monev BMP Kampar 2026 (10-08); label `Estimasi` dilepas dari 6.215 record produksi (10-12) — penggantinya penanda Meragukan #424 di v1.10.0; snapshot BMP prod di-generate ulang (#428).
- **Proses:** alur rilis owner 2026-10-14 — `/scope` → `/wrapup` → QA lokal (`runs/<tanggal>-lokal.md`) sebelum merge staging; `/audit` mingguan 10-12 (#431) dan audit penuh 10-21 (#440); TD aktif 33 → 23 (#412) → **30** (TD-060…068 dibuka); berkas docs besar ber-`Ringkasan` + arsip beku ke `project/archive/` (10-12).
- **QA:** test 2.804 (v1.6.0) → **3.138** (v1.9.0); run staging & prod P0 0 Fail di v1.7.0–v1.9.0, run lokal sejak v1.8.0 (v1.9.0 Go dengan catatan: peran OPERATOR/DONOR Blocked); paket QA v1.5.0 & v1.6.0 diarsipkan (10-17).

---

### Audit Commands

Audit terakhir menggunakan:

```text
find src/app -type f
find src/server src/lib src/components src/validations src/test -type f
find prisma -type f
rg "Dashboard|BMP|Training|Farmer|Parcel|Production|Staff|HCV|Coming soon" src prisma scripts docs
git ls-files | grep '\.DS_Store$'
npm test
```

### Per bulan

| Bulan | Berkas |
|---|---|
| Oktober 2026 | [changelog/2026-10.md](./changelog/2026-10.md) |
| September 2026 | [changelog/2026-09.md](./changelog/2026-09.md) |
| Agustus 2026 | [changelog/2026-08.md](./changelog/2026-08.md) |
| Juli 2026 | [changelog/2026-07.md](./changelog/2026-07.md) |
| Juni 2026 | [changelog/2026-06.md](./changelog/2026-06.md) |
| Mei 2026 | [changelog/2026-05.md](./changelog/2026-05.md) |
| April 2026 | [changelog/2026-04.md](./changelog/2026-04.md) |
| Maret 2026 | [changelog/2026-03.md](./changelog/2026-03.md) |
