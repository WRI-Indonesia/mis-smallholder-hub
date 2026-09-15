# 05 · Sign-off vX.Y.Z

| Peran | Nama | Tanggal | Keputusan | Syarat / catatan |
|---|---|---|---|---|
| Developer | | | Go / No-go | gate lokal hijau, `02` lengkap |
| QA | | | Go / No-go | `01` staging + `02` selesai, `04` tuntas |
| Owner | | | Go / No-go | known issues diterima |

Prasyarat tag `vX.Y.Z`: ketiga baris **Go**; migrasi prod applied + checksum disegarkan; smoke prod (`01` kolom P) diisi ≤ 1 jam setelah deploy.
