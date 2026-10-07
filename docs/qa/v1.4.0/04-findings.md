# 04 · Temuan

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Severity: **blocker** (rilis ditahan) · **major** (fitur salah, ada jalan lain) · **minor** (kosmetik/teks). Satu temuan major/blocker = satu issue; minor boleh digabung dalam satu issue "[QA v1.4.0] minor".

| # | Kasus | Halaman · langkah | Yang terjadi vs harapan | Severity | Env | Issue | Keputusan | Bukti |
|---|---|---|---|---|---|---|---|---|
| 1 | SM-04 · TC-403-03 | Dashboard › Pelatihan › vs Kontrak, tema gelap | label "+N di atas target"/"tertinggal N" hijau tua/amber di latar gelap — sulit dibaca | minor | staging | — | ✅ diperbaiki (`dark:fill-*-400`) — terverifikasi di staging (deploy `37641547337`, tema gelap: emerald-400/amber-400) | screenshot run |
| 2 | SM-35 | Dashboard Rantai Pasok · Peta Rantai Pasok | CSV prototipe belum ada di S3 env → keadaan kosong; pesan memuat path skrip internal & nama bucket untuk semua peran | minor | staging | — | ✅ pesan: path/bucket hanya untuk SUPERADMIN (server tak mengirimnya ke peran lain) — staging SUPERADMIN tetap melihat detail (sesuai rancangan); peran lain dicakup unit test (akun tak tersedia). Data: owner pilih unggah CSV ke S3 staging — **ditahan**: skrip lewat `.env.staging` menulis ke bucket `mis-dev`, server staging membaca `mis-staging` (env server ≠ `.env.staging` lokal; `.env.staging` juga tanpa `S3_ENDPOINT`) | screenshot run |

## Membuka issue dari temuan

Simpan body ke berkas sementara lalu:

```bash
gh issue create --label bug --label "status:todo" \
  --title "[QA v1.4.0] <Menu › halaman>: <gejala singkat>" \
  --body-file /tmp/qa-issue.md
```

Isi `/tmp/qa-issue.md`:

```markdown
## Kasus uji
TC-…-nn (docs/qa/v1.4.0/02-test-cases.md) · run `runs/<tanggal>-staging.md`

## Langkah
1. …

## Harapan
…

## Yang terjadi
…

## Lingkungan
staging · commit `<sha>` · deploy run `<id>` · browser <nama versi> · akun <peran>

## Bukti
`scripts/local/QA-QC/v1.4.0/evidence/<berkas>` (lokal — tidak diunggah, memuat data petani)
```
