# 04 · Temuan

Severity: **blocker** (rilis ditahan) · **major** (fitur salah, ada jalan lain) · **minor** (kosmetik/teks). Satu temuan major/blocker = satu issue; minor boleh digabung dalam satu issue "[QA v0.35.0] minor".

| # | Kasus | Halaman · langkah | Yang terjadi vs harapan | Severity | Env | Issue | Keputusan | Bukti |
|---|---|---|---|---|---|---|---|---|
| 1 | TC-… | | | | staging | #… | fix rilis ini / defer | `evidence/…` |

## Membuka issue dari temuan

Simpan body ke berkas sementara lalu:

```bash
gh issue create --label bug --label "status:todo" \
  --title "[QA v0.35.0] <Menu › halaman>: <gejala singkat>" \
  --body-file /tmp/qa-issue.md
```

Isi `/tmp/qa-issue.md`:

```markdown
## Kasus uji
TC-…-nn (docs/qa/v0.35.0/02-test-cases.md) · run `runs/<tanggal>-staging.md`

## Langkah
1. …

## Harapan
…

## Yang terjadi
…

## Lingkungan
staging · commit `<sha>` · deploy run `<id>` · browser <nama versi> · akun <peran>

## Bukti
`scripts/local/QA-QC/v0.35.0/evidence/<berkas>` (lokal — tidak diunggah, memuat data petani)
```
