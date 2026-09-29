# 04 · Temuan

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Severity: **blocker** (rilis ditahan) · **major** (fitur salah, ada jalan lain) · **minor** (kosmetik/teks). Satu temuan major/blocker = satu issue; minor boleh digabung dalam satu issue "[QA v1.2.0] minor".

| # | Kasus | Halaman · langkah | Yang terjadi vs harapan | Severity | Env | Issue | Keputusan | Bukti |
|---|---|---|---|---|---|---|---|---|
| 1 | SM-24 | Bulk Upload · spesifikasi smoke | Spesifikasi menyebut peran OPERATOR, padahal OPERATOR tak punya menu Bulk Upload (seed & prod) — kasus tak bisa dijalankan sesuai tulisan | minor (dokumen) | local | — | diperbaiki di spesifikasi (peran → ADMIN) | — |
| 2 | TC-317-03/05/06 | spesifikasi kasus uji | Kode Lembaga ASERMISAS tertulis `ISH-1408-04`, yang benar `ICS-1408-04` | minor (dokumen) | local | — | diperbaiki | — |

## Membuka issue dari temuan

Simpan body ke berkas sementara lalu:

```bash
gh issue create --label bug --label "status:todo" \
  --title "[QA v1.2.0] <Menu › halaman>: <gejala singkat>" \
  --body-file /tmp/qa-issue.md
```

Isi `/tmp/qa-issue.md`:

```markdown
## Kasus uji
TC-…-nn (docs/qa/v1.2.0/02-test-cases.md) · run `runs/<tanggal>-staging.md`

## Langkah
1. …

## Harapan
…

## Yang terjadi
…

## Lingkungan
staging · commit `<sha>` · deploy run `<id>` · browser <nama versi> · akun <peran>

## Bukti
`scripts/local/QA-QC/v1.2.0/evidence/<berkas>` (lokal — tidak diunggah, memuat data petani)
```
