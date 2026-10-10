# Proyek — Changelog & Decision Log

> Bagian dari dokumentasi **Proyek**. Indeks: [../README.md](../README.md) · Terkait: [brief.md](./brief.md) · [roadmap.md](./roadmap.md) · [sprint.md](./sprint.md) · [tech-debt.md](./tech-debt.md) · [contributing.md](./contributing.md)

> Riwayat historis Smallholder HUB: perintah audit, Decision Log, dan Changelog per bulan.
> **Jangan gunakan file ini sebagai acuan status.** Status resmi ada di tabel **Phase Status** pada [`roadmap.md`](./roadmap.md).
> Dipisah dari `progress.md` (restrukturisasi 2026-07-12) agar file status tetap ramping.

Format: satu berkas per bulan di [`changelog/`](./changelog/) — tiap berkas berisi **Decision Log** (`YYYY-MM-DD`) dan **Changelog** (`MM-DD`). Entri baru ditambahkan sebagai **baris teratas** tabel di berkas bulan berjalan; saat ganti bulan, buat `changelog/YYYY-MM.md` baru dan tambahkan barisnya di tabel di bawah. Keputusan besar (arsitektur, kebijakan, aturan yang berlaku lintas modul) juga ditulis sebagai catatan keputusan di [`../decisions/`](../decisions/README.md).

### Ringkasan Dua Minggu Terakhir (30 September – 10 Oktober 2026)

> Snapshot per 2026-10-10 — perbarui/ganti section ini saat menulis ringkasan periode berikutnya. Ringkasan 15–29 September ada di Changelog September 2026 (rilis v0.35.0 → v1.1.0).

- **Rilis:** **v1.3.0** (09-30, jalur rilis/keamanan/performa; 1 migrasi indeks) → **v1.4.0** (10-07, menu Platform Developer, Target Program `tbl_program_target`, Training Benefit per year, prototipe Rantai Pasok) → **v1.5.0** (10-09, #317 Fase 3 peringatan tumpang tindih saat upload, latar GIBS Fire Alert, kerapian) → **v1.5.1** hotfix keamanan (10-10, filter scope Lembaga tertimpa — kelas BUG-007, #408) → **v1.6.0** (10-10, prototipe Rantai Pasok diperluas + istilah "petani terdaftar"; pengecualian aturan 1 rilis/hari). Rencana kini **per rilis** (keputusan 2026-09-30); roadmap direset ke **Roadmap 2026–2027** (8,6% → **18,6%**).
- **Keamanan & DevOps:** role/`isActive` dibaca ulang dari DB ≤ 1 menit (#342); guard `migrate status` di deploy staging & prod (#277/#394); rollback teruji di staging (#232, OPS-02 ✅ Done); cek migrasi vs tag (#376); seed akun fiktif (#390). Celah laten #409/#386 diperbaiki di `mvp` → PATCH **v1.6.1** (10-11 → 10-25).
- **Data prod (DQ-01):** 2.213 tanggal lahir tertukar diperbaiki (#354) + parser tanggal upload (#400); Detail Lahan Siak 9 Lembaga (#366, APKASDU ditahan); Monev BMP Kampar 2026; tahun tanam/alamat/KT belasan Lembaga dari berkas fasilitator; produktivitas BMP **disetahunkan** (Ton/Ha/tahun).
- **Proses:** `/audit` jadi audit mingguan + workflow (fase F1–F6; 126 test guard 3 lapis, 25 koreksi Bantuan, register TD dirapikan 33 → 31, #412–#414); command `/lanjut`; catatan keputusan `decisions/` 0005–0007.
- **QA:** test 2.461 (v1.3.0) → **2.804** (v1.6.0); lint 0, typecheck & build ✅; run staging v1.6.0 0 Fail (smoke 17 · kasus 11), run prod P0 ≤ 1 jam pasca-deploy; paket QA v1.3.0 diarsipkan.

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
