# 0003 · Alur rilis `mvp` → `staging` → `main`

- **Status:** Berlaku
- **Tanggal:** 2026-08-28 (staging hidup) · 2026-08-29 (rilis pertama lewat staging, v0.32.0) · **Issue:** #265, #277 · **Diputuskan:** owner

## Konteks
Merge ke `main` langsung men-deploy produksi (`deploy-main.yml`). Tanpa lingkungan antara, QA manual dan migrasi DB diuji pertama kali di produksi.

## Keputusan
- Kerja harian hanya di `mvp`; tidak ada branch feature/experiment.
- Rilis: merge `mvp` → `staging` (deploy staging otomatis) → QA manual `docs/qa/vX.Y.Z/` → PR `staging` → `main` (deploy produksi) → tag + GitHub Release.
- Migrasi DB diterapkan manual ke `mis-staging` lalu `mis-prod` **sebelum** kode yang membutuhkannya di-deploy.

## Alternatif yang ditolak
- PR `mvp` → `main` langsung — dipakai sebelum staging ada; kini hanya pengecualian atas keputusan owner (preseden v0.35.0–v0.37.0).

## Konsekuensi
Workflow deploy belum menjalankan `migrate deploy` (#277) dan staging ber-RAM kecil (#363) — dua risiko terbuka di Sprint 2.

## Rujukan
[../standards/versioning.md](../standards/versioning.md) §Alur Rilis · [../standards/workflow.md](../standards/workflow.md) · [../qa/README.md](../qa/README.md)
