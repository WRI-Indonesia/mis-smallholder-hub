# 04 · Temuan

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Severity: **blocker** (rilis ditahan) · **major** (fitur salah, ada jalan lain) · **minor** (kosmetik/teks). Satu temuan major/blocker = satu issue; minor boleh digabung dalam satu issue "[QA v1.7.0] minor".

| # | Kasus | Halaman · langkah | Yang terjadi vs harapan | Severity | Env | Issue | Keputusan | Bukti |
|---|---|---|---|---|---|---|---|---|
| 1 | SM-07 · SM-26 | Report › Lahan: klik filter **Jenis Surat** ("Semua jenis") · Settings › Role & Permission: klik ikon **Preset izin baris** | Halaman jatuh ke "Terjadi Kesalahan" (konsol: `Base UI error #31` — `Menu.GroupLabel` dirender di luar `Menu.Group`). Harapan: menu terbuka. Bug lama (berkas & versi Base UI tak berubah di rilis ini; kemungkinan juga di prod v1.6.0) | major | staging | #418 | fix rilis ini — `DropdownMenuLabel` dibungkus `DropdownMenuGroup` di 2 tempat + test penjaga statis `dropdown-label-in-group.test.ts`; Preset terverifikasi lokal; **uji ulang staging `040e975` Pass** (SM-07 & SM-26) | konsol staging 2026-10-11 21:09 |
| 2 | TC-REV-06 | Report › Lahan: unduh **PDF** (Lembaga mana pun) — kotak Ringkasan Legalitas & baris filter | Label "Selisih Luas ≥ 0,50 Ha" tercetak `Selisih Luas "e 0,50 Ha` — font bawaan jsPDF (Helvetica/WinAnsi) tak punya "≥" (U+2265), jsPDF menulis string itu sebagai UTF-16. Harapan: tanda terbaca. Bug lama sejak #305 (2026-08-29; `src/lib/report-land-parcel.ts` label ringkasan & filter), kemungkinan juga di prod. Em-dash & "·" aman | minor | staging | — | menunggu owner (perbaiki di rilis ini: ganti "≥" → "min." / ">=" di teks PDF, atau issue backlog) | teks PDF staging 2026-10-11 dicegat dari blob; uji render jsPDF lokal → pdftoppm menampilkan `"e` |

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
