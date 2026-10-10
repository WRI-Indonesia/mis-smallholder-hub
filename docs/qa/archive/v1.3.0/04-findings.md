# 04 · Temuan

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../../README.md) · Paket: [README.md](README.md)

Severity: **blocker** (rilis ditahan) · **major** (fitur salah, ada jalan lain) · **minor** (kosmetik/teks). Satu temuan major/blocker = satu issue; minor boleh digabung dalam satu issue "[QA v1.3.0] minor".

| # | Kasus | Halaman · langkah | Yang terjadi vs harapan | Severity | Env | Issue | Keputusan | Bukti |
|---|---|---|---|---|---|---|---|---|
| 1 | TC-392-01 | Metrik Rilis › grafik Jumlah test otomatis · rentang **1 Minggu** | Label anotasi "+495 (v1.2.0)" di titik terakhir terpotong tepi kanan kartu (terbaca "+495 · 1.2"); rentang Semua normal | minor | staging | — (belum dibuka; kandidat digabung issue minor QA v1.3.0) | defer — kosmetik, tidak memblokir rilis | tangkapan layar sesi 2026-09-30 (tidak disimpan) |

## Membuka issue dari temuan

Simpan body ke berkas sementara lalu:

```bash
gh issue create --label bug --label "status:todo" \
  --title "[QA v1.3.0] <Menu › halaman>: <gejala singkat>" \
  --body-file /tmp/qa-issue.md
```

Isi `/tmp/qa-issue.md`:

```markdown
## Kasus uji
TC-…-nn (docs/qa/v1.3.0/02-test-cases.md) · run `runs/<tanggal>-staging.md`

## Langkah
1. …

## Harapan
…

## Yang terjadi
…

## Lingkungan
staging · commit `<sha>` · deploy run `<id>` · browser <nama versi> · akun <peran>

## Bukti
`scripts/local/QA-QC/v1.3.0/evidence/<berkas>` (lokal — tidak diunggah, memuat data petani)
```
