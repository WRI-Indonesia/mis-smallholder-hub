# 04 · Temuan

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Severity: **blocker** (rilis ditahan) · **major** (fitur salah, ada jalan lain) · **minor** (kosmetik/teks). Satu temuan major/blocker = satu issue; minor boleh digabung dalam satu issue "[QA v1.7.0] minor".

| # | Kasus | Halaman · langkah | Yang terjadi vs harapan | Severity | Env | Issue | Keputusan | Bukti |
|---|---|---|---|---|---|---|---|---|
| 1 | SM-07 · SM-26 | Report › Lahan: klik filter **Jenis Surat** ("Semua jenis") · Settings › Role & Permission: klik ikon **Preset izin baris** | Halaman jatuh ke "Terjadi Kesalahan" (konsol: `Base UI error #31` — `Menu.GroupLabel` dirender di luar `Menu.Group`). Harapan: menu terbuka. Bug lama (berkas & versi Base UI tak berubah di rilis ini; kemungkinan juga di prod v1.6.0) | major | staging | (dibuat setelah persetujuan owner) | fix rilis ini — `DropdownMenuLabel` dibungkus `DropdownMenuGroup` di 2 tempat + test penjaga statis `dropdown-label-in-group.test.ts`; Preset terverifikasi lokal | konsol staging 2026-10-11 21:09 |

## Membuka issue dari temuan

Simpan body ke berkas sementara lalu:

```bash
gh issue create --label bug --label "status:todo" \
  --title "[QA v1.7.0] <Menu › halaman>: <gejala singkat>" \
  --body-file /tmp/qa-issue.md
```

Isi `/tmp/qa-issue.md`:

```markdown
## Kasus uji
TC-…-nn (docs/qa/v1.7.0/02-test-cases.md) · run `runs/<tanggal>-staging.md`

## Langkah
1. …

## Harapan
…

## Yang terjadi
…

## Lingkungan
staging · commit `<sha>` · deploy run `<id>` · browser <nama versi> · akun <peran>

## Bukti
`scripts/local/QA-QC/v1.7.0/evidence/<berkas>` (lokal — tidak diunggah, memuat data petani)
```
