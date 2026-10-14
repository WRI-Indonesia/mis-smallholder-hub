# QA/QC v1.8.0

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md)

| | |
|---|---|
| Versi | v1.8.0 (MINOR — 1 menu baru Daftar Issue, fitur Excel Dashboard BMP; tanpa migrasi) |
| Rentang | `v1.7.0..bc62ed6` (`7baffec..bc62ed6`; staging `000ced9` = kode `fff04c3`, sesudahnya hanya docs) |
| Migrasi | tidak — seed menu `platform-developer-issues` + izin VIEW/EXPORT (`seed-menu-key.ts`, #430) dan generate ulang snapshot BMP (#428) |
| Run | lihat `runs/` — satu berkas per eksekusi |

## Rekap (tempel keluaran `node scripts/qa/summary.mjs docs/qa/v1.8.0`)

| Run | Bagian | Pass | Fail | Blocked | N/A | Belum diisi |
|---|---|---:|---:|---:|---:|---:|
| 2026-10-14-lokal.md | Kasus uji | 7 | 0 | 0 | 1 | 0 |
| 2026-10-14-staging.md | Smoke | 13 | 0 | 0 | 1 | 0 |
| 2026-10-14-staging.md | Kasus uji | 16 | 0 | 0 | 0 | 0 |
| 2026-10-14-staging.md | Regresi | 3 | 0 | 0 | 0 | 0 |

_Semua Fail sudah merujuk issue._

## Keputusan

**Go / No-go:** **Go** 2026-10-14 — Developer & QA (Claude), Owner (Sofyan); lihat [05-signoff.md](05-signoff.md). Syarat tag: seed menu `platform-developer-issues` prod (dry-run → `--apply`), generate ulang snapshot BMP prod (#428), run prod `--only P0` ≤ 1 jam setelah deploy.

## Known issues yang dibawa

| Issue | Dampak ke pengguna | Kenapa ditunda |
|---|---|---|
| #434 | Layer hutan/EUDR (#433) **visual saja** — belum ada % hutan 2020 / deforestasi per lahan atau per Mill | ⚖️ menunggu keputusan owner (sumber, cara hitung, penyimpanan) — backlog |
| TD-062 | Master Data › Produksi selalu memuat seluruh record (juga dari tautan Kalender & saat Reset) — makin lambat seiring data produksi tumbuh | desain #427 (filter terlihat, tanpa saringan server tersembunyi); paginasi server dibahas bersama PLATFORM-10 |
| TD-065 | Rencana Pengembangan › Semua Issue menulis pencarian ke URL tiap ketukan — Safari bisa melempar galat saat mengetik sangat cepat (Daftar Issue sudah diperbaiki) | di luar rentang rilis ini; perbaikan bersama `SearchBox` ber-debounce |
| TD-064 | Daftar Issue: penyegaran pertama sesudah cache kedaluwarsa bisa lambat (halaman GitHub diambil berurutan) | ±430 issue = 5 halaman, belum terasa |
| TD-060 · TD-066 | — (internal: guard "A ATAU B" kini 4 salinan; state filter + Reset disalin per halaman) | kerapian, tak berdampak perilaku |
| Tile GFW langsung | Layer EUDR dimuat dari server Global Forest Watch tanpa proxy — area peta yang dilihat pengguna terlihat oleh GFW | keputusan implementasi #433 (data publik CC BY 4.0, CORS `*`, tak membebani server); dicatat di `ui-ux-map.md` |
| Cakupan uji | Peran **DONOR** dan akun **ber-override** (tanpa EXPORT Daftar Issue; hanya `map-supply-chain`) tidak diuji di staging; Safari tidak diuji | tak ada akun uji; dijaga test RBAC & `map-overlay-route.test.ts` |
