# 0004 · Gate lint/build/typecheck/test dijalankan lokal, bukan CI

> Bagian dari dokumentasi **Keputusan**. Indeks: [README.md](./README.md)

- **Status:** Berlaku
- **Tanggal:** 2026-07-14 (Docs sync jadi gate) · gate lint dipulihkan 2026-07-12 (#126) · typecheck ditambahkan #288 · **Diputuskan:** owner

## Konteks
Lint pernah tidak ditegakkan dan menumpuk 193 error (BUG-006). Repo punya CI, tetapi hanya untuk keamanan (`gitleaks`, `semgrep`) dan deploy.

## Keputusan
Sebelum **setiap commit**: `npm run lint` → `npm run build` → `npm run typecheck` → `npm test` + Docs sync, semuanya dijalankan lokal. Tidak ditambahkan ke GitHub Actions.

## Alternatif yang ditolak
- Workflow CI untuk lint/build/test — owner memilih disiplin lokal (satu developer, gate cepat).

## Konsekuensi
Tidak ada jaring otomatis di PR untuk gate ini; pastikan hijau **sebelum** merge ke `main` (merge = deploy produksi).

## Rujukan
[../standards/workflow.md](../standards/workflow.md) §Pre-Commit Gate
