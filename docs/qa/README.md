# QA/QC Manual per Rilis

> Bagian dari dokumentasi proyek. Indeks: [../README.md](../README.md) · Terkait: [../standards/versioning.md](../standards/versioning.md) §Alur Rilis · [../standards/workflow.md](../standards/workflow.md) §Issue Close

Pengujian manual **per versi** yang berjalan **setelah deploy `staging` dan sebelum PR `staging → main`**; `05-signoff.md` adalah prasyarat tag. Gate otomatis (lint/build/test) menjaga kode; folder ini menjaga **apa yang dilihat pengguna** dan **angka di DB** — dua hal yang lolos gate pada setiap siklus review (#238, #318, #331).

## Aturan folder

| Lokasi | Isi | Di-track? |
|---|---|---|
| `docs/qa/_template/` | Master 6 berkas + README — **disalin** ke folder versi, jangan diedit langsung kecuali proses berubah | ✅ |
| `docs/qa/vX.Y.Z/` | Satu folder per **versi** (bukan tanggal — staging dan prod diuji di hari berbeda; tanggal ditulis di dalam) | ✅ |
| `scripts/local/QA-QC/vX.Y.Z/evidence/` | Screenshot, PDF, Excel hasil uji | ❌ gitignored — repo **publik**; bukti memuat nama petani/NIK |

Rujuk bukti dari berkas ter-track dengan path relatif `evidence/<nama>` — cukup bagi yang punya laptop yang sama; jangan tempel gambarnya.

## Berkas & siapa mengisi

| Berkas | Isi | Kapan · siapa |
|---|---|---|
| `README.md` | Versi, rentang commit, env, ringkasan Pass/Fail/Blocked, **Go / No-go**, known issues yang dibawa | Ditutup saat sign-off · QA |
| `00-scope.md` | Issue + commit dalam rilis, menu terdampak, migrasi/izin/Bantuan | Awal siklus rilis · dev |
| `01-smoke.md` | Checklist tetap per menu & peran (±15 menit) — dijalankan **dua kali**: staging, lalu prod | QA |
| `02-test-cases.md` | Kasus uji per issue (`TC-<issue>-<nn>`) | Ditulis dev saat menutup issue (bersama retro) · dijalankan QA di staging |
| `03-data-qc.md` | QC data/DB: kueri read-only + angka harapan vs aktual per env | Sebelum & sesudah migrasi · dev + owner |
| `04-findings.md` | Temuan → issue GitHub; keputusan fix-now / defer | Selama pengujian · QA |
| `05-signoff.md` | Tanda tangan dev / QA / owner + syarat go | Akhir · ketiganya |

## Alur

1. Dev menyalin `_template/` → `vX.Y.Z/`, mengisi `00-scope.md` dan `02-test-cases.md` (kasus uji ditulis saat issue ditutup — bagian dari retro).
2. #333-style: migrasi + seed ke `mis-staging` → deploy `mvp → staging`.
3. QA menjalankan `01-smoke.md` + `02-test-cases.md` di staging; angka `03-data-qc.md` diisi dev/owner.
4. Temuan → `04-findings.md` → issue GitHub (label `bug`), diputuskan **fix di rilis ini** atau **defer** (tercatat di README sebagai known issue).
5. `05-signoff.md` lengkap → bump versi, PR `staging → main`, tag.
6. Setelah prod: `01-smoke.md` kolom **Prod** diisi ulang (smoke saja, bukan seluruh kasus uji) + `03-data-qc.md` kolom prod.

Status kasus: **Pass** · **Fail** (buka temuan) · **Blocked** (prasyarat belum ada — data/izin) · **N/A** (tidak berlaku di env itu). Satu kasus = satu baris; jangan menggabungkan dua hasil dalam satu baris.
