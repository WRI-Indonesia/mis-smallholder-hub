# 04 · Temuan

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Severity: **blocker** (rilis ditahan) · **major** (fitur salah, ada jalan lain) · **minor** (kosmetik/teks). Satu temuan major/blocker = satu issue; minor boleh digabung dalam satu issue "[QA v1.6.0] minor".

| # | Kasus | Halaman · langkah | Yang terjadi vs harapan | Severity | Env | Issue | Keputusan | Bukti |
|---|---|---|---|---|---|---|---|---|
| 1 | TC-381-05 | Map › Peta Rantai Pasok · strip legenda bawah | Strip legenda melipat 2–3 baris dan terdorong ke kanan walau ruang cukup (viewport 1.400 px: 2 baris; harapan satu baris). Penyebab: posisi `left: 50% + …` + `translate(-50%)` membatasi lebar strip ke jarak titik tengah → tepi kanan | minor | local (build produksi :3100) | — | **fix rilis ini** — pembungkus selebar area bebas panel + `justify-center`; kini satu baris bila area peta ≥ 1.038 px (panel terbuka) / ≥ 686 px (panel terlipat) | diukur via DOM (lebar alami strip 662 px) |
| 2 | SM-24 | Bulk Upload › Petani | Spesifikasi smoke menuntut "template terunduh" di tiap tab, padahal Upload Petani **tidak pernah** punya template (pencocokan kolom dinamis; tak ada di riwayat kode maupun Bantuan `u-1`) | minor (spesifikasi) | local | — | spesifikasi SM-24 dikoreksi (template & v1.6.0) | — |

## Membuka issue dari temuan

Simpan body ke berkas sementara lalu:

```bash
gh issue create --label bug --label "status:todo" \
  --title "[QA v1.6.0] <Menu › halaman>: <gejala singkat>" \
  --body-file /tmp/qa-issue.md
```

Isi `/tmp/qa-issue.md`:

```markdown
## Kasus uji
TC-…-nn (docs/qa/v1.6.0/02-test-cases.md) · run `runs/<tanggal>-staging.md`

## Langkah
1. …

## Harapan
…

## Yang terjadi
…

## Lingkungan
staging · commit `<sha>` · deploy run `<id>` · browser <nama versi> · akun <peran>

## Bukti
`scripts/local/QA-QC/v1.6.0/evidence/<berkas>` (lokal — tidak diunggah, memuat data petani)
```
