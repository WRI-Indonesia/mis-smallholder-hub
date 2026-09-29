# Proyek — Changelog & Decision Log

> Bagian dari dokumentasi **Proyek**. Indeks: [../README.md](../README.md) · Terkait: [brief.md](./brief.md) · [roadmap.md](./roadmap.md) · [sprint.md](./sprint.md) · [tech-debt.md](./tech-debt.md) · [contributing.md](./contributing.md)

> Riwayat historis Smallholder HUB: perintah audit, Decision Log, dan Changelog per bulan.
> **Jangan gunakan file ini sebagai acuan status.** Status resmi ada di tabel **Phase Status** pada [`roadmap.md`](./roadmap.md).
> Dipisah dari `progress.md` (restrukturisasi 2026-07-12) agar file status tetap ramping.

Format: satu berkas per bulan di [`changelog/`](./changelog/) — tiap berkas berisi **Decision Log** (`YYYY-MM-DD`) dan **Changelog** (`MM-DD`). Entri baru ditambahkan sebagai **baris teratas** tabel di berkas bulan berjalan; saat ganti bulan, buat `changelog/YYYY-MM.md` baru dan tambahkan barisnya di tabel di bawah. Keputusan besar (arsitektur, kebijakan, aturan yang berlaku lintas modul) juga ditulis sebagai catatan keputusan di [`../decisions/`](../decisions/README.md).

### Ringkasan Dua Minggu Terakhir (15–29 September 2026)

> Snapshot per 2026-09-29 — perbarui/ganti section ini saat menulis ringkasan periode berikutnya. Ringkasan Juli ada di Changelog Juli 2026.

- **Rilis:** **v0.35.0** (09-15) → **v0.36.0** (09-20) → **v0.37.0** (09-21) → **v0.38.0** (09-22) → **v1.0.0 milestone MVP** + **v1.1.0 hotfix** (09-23). Sejak v0.38.0 rilis lewat `mvp → staging → main`; paket QA manual per versi di `docs/qa/`.
- **Satelit lahan tahap 2 (v0.35.0):** `geom` PostGIS + GiST, sepadan, lahan tetangga ≤ 25 m, status NKT, patok batas + kode unik, menu Report › Patok, Laporan NKT per Lembaga.
- **Monev BMP (v0.36.0):** skor per petani per tahun + rincian 32 indikator + penilaian Lembaga, import rekap & form survei, Dashboard Monev BMP.
- **Ketersediaan Data (v0.37.0):** skor mengikuti skema (registri check), radar + heatmap + drill-down; audit dead code #353.
- **Profil Petani PDF (v0.38.0)** · **Laporan bulanan Fire Alert** + **Excel per KT/Blok** + **UL Parcel Code ganda** (v1.0.0/v1.1.0).
- **Belum dirilis (kandidat v1.2.0):** #317 Fase 2 menu Tumpang Tindih Lahan · #378 Sprint Mingguan. Rencana 6 sprint mingguan s.d. 2026-11-08 termasuk epic Supply Chain #379–#382.
- **QA:** test 1.507 (v0.35.0) → **1.868** (v1.1.0); lint 0, typecheck & build ✅.

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
| September 2026 | [changelog/2026-09.md](./changelog/2026-09.md) |
| Agustus 2026 | [changelog/2026-08.md](./changelog/2026-08.md) |
| Juli 2026 | [changelog/2026-07.md](./changelog/2026-07.md) |
| Juni 2026 | [changelog/2026-06.md](./changelog/2026-06.md) |
| Mei 2026 | [changelog/2026-05.md](./changelog/2026-05.md) |
| April 2026 | [changelog/2026-04.md](./changelog/2026-04.md) |
| Maret 2026 | [changelog/2026-03.md](./changelog/2026-03.md) |
