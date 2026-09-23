# 04 · Temuan

Severity: **blocker** (rilis ditahan) · **major** (fitur salah, ada jalan lain) · **minor** (kosmetik/teks). Satu temuan major/blocker = satu issue; minor boleh digabung dalam satu issue "[QA vX.Y.Z] minor".

| # | Kasus | Halaman · langkah | Yang terjadi vs harapan | Severity | Env | Issue | Keputusan | Bukti |
|---|---|---|---|---|---|---|---|---|
| — | — | — | **Tidak ada temuan dari run lokal 2026-09-23** (5 Pass · 0 Fail · 4 Blocked). Blocked bukan temuan: kasusnya tak terpicu / butuh simulasi kegagalan jaringan. | — | local | — | — | — |
| 1 | QC data C2/E5 + `rbac:compare` | Settings › Role & Permission (drift DB, bukan halaman) | **4 akun DONOR aktif di produksi memegang VIEW + PRINT pada `master-data-farmers`, `master-data-groups`, `master-data-parcels`, `master-data-training`, `master-data-bmp-monev`** — yaitu akses daftar petani yang **dicabut #263** di v0.26.0 karena di luar spesifikasi peran DONOR. Saat itu dinilai aman "karena belum ada akun donor"; sekarang ada 4, dan `rbac_user_permission_override` untuk DONOR = 0 sehingga tak ada yang menahannya. Sebaliknya DONOR **kehilangan** izin yang seharusnya ia punya menurut seed: `dashboard`, `map`, `report` (induk), `report-kelompok-tani`, `report-kelompok-tani-detail`, `report-marker`. Selisih total **21 baris**. | **major** | **prod** | _(usul issue)_ | **bukan disebabkan v1.0.0** — rilis ini nol perubahan izin; drift pra-ada yang baru terlihat karena run prod dijalankan | `rbac:compare` di `runs/2026-09-23-prod.md` |

Enam temuan review pra-rilis (`/code-review high` rentang penuh, bukan QA) tercatat di Decision Log `changelog.md` 2026-09-23 dan sudah ditindak sebelum rilis: 5 diperbaiki di `433551a`, 1 (dua angka "Dalam Boundary") diputuskan owner dan diperbaiki di `de1edb7`.

## Membuka issue dari temuan

Simpan body ke berkas sementara lalu:

```bash
gh issue create --label bug --label "status:todo" \
  --title "[QA vX.Y.Z] <Menu › halaman>: <gejala singkat>" \
  --body-file /tmp/qa-issue.md
```

Isi `/tmp/qa-issue.md`:

```markdown
## Kasus uji
TC-…-nn (docs/qa/vX.Y.Z/02-test-cases.md) · run `runs/<tanggal>-staging.md`

## Langkah
1. …

## Harapan
…

## Yang terjadi
…

## Lingkungan
staging · commit `<sha>` · deploy run `<id>` · browser <nama versi> · akun <peran>

## Bukti
`scripts/local/QA-QC/vX.Y.Z/evidence/<berkas>` (lokal — tidak diunggah, memuat data petani)
```
