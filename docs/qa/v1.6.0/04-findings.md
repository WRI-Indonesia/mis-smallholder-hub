# 04 · Temuan

> Bagian dari dokumentasi **QA/QC**. Indeks: [../README.md](../README.md) · Paket: [README.md](README.md)

Severity: **blocker** (rilis ditahan) · **major** (fitur salah, ada jalan lain) · **minor** (kosmetik/teks). Satu temuan major/blocker = satu issue; minor boleh digabung dalam satu issue "[QA v1.6.0] minor".

| # | Kasus | Halaman · langkah | Yang terjadi vs harapan | Severity | Env | Issue | Keputusan | Bukti |
|---|---|---|---|---|---|---|---|---|
| 1 | TC-381-05 | Map › Peta Rantai Pasok · strip legenda bawah | Strip legenda melipat 2–3 baris dan terdorong ke kanan walau ruang cukup (viewport 1.400 px: 2 baris; harapan satu baris). Penyebab: posisi `left: 50% + …` + `translate(-50%)` membatasi lebar strip ke jarak titik tengah → tepi kanan | minor | local (build produksi :3100) | — | **fix rilis ini** — pembungkus selebar area bebas panel + `justify-center`; kini satu baris bila area peta ≥ 1.038 px (panel terbuka) / ≥ 686 px (panel terlipat) | diukur via DOM (lebar alami strip 662 px) |
| 2 | SM-24 | Bulk Upload › Petani | Spesifikasi smoke menuntut "template terunduh" di tiap tab, padahal Upload Petani **tidak pernah** punya template (pencocokan kolom dinamis; tak ada di riwayat kode maupun Bantuan `u-1`) | minor (spesifikasi) | local | — | spesifikasi SM-24 dikoreksi (template & v1.6.0) | — |
| 3 | TC-381-06 · SM-35 · SM-13 | Map › Peta Rantai Pasok (juga Peta Lahan, Peta BMP, Detail Lahan, Sebaran Lahan) · klik Mill dekat tepi kanan | Popup meluber ±40–130 px keluar tepi kanan dan tidak digeser balik; harapan (#222): peta auto-pan agar kartu utuh. Penyebab: `popupViewRect` menyalin DOMRect dengan spread → `right/top/bottom` hilang (getter prototype), `computePopupPan` selalu 0 di kanan/atas/bawah. Ada sejak `49cb568` (v1.5.0, sudah di prod) | minor (ada jalan lain: geser peta/seret popup) | staging + local (build produksi :3100) | — | **fix rilis ini** `4e218cf` + test regresi objek ber-getter; diverifikasi lokal (tepi kanan popup 1.911 → 1.788 px = viewport − 12); **perlu cek ulang di staging** sesudah merge | `runs/2026-10-10-staging.md` |

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
