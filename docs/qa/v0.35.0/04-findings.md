# 04 · Temuan

Severity: **blocker** (rilis ditahan) · **major** (fitur salah, ada jalan lain) · **minor** (kosmetik/teks). Satu temuan major/blocker = satu issue; minor boleh digabung dalam satu issue "[QA v0.35.0] minor".

| # | Kasus | Halaman · langkah | Yang terjadi vs harapan | Severity | Env | Issue | Keputusan | Bukti |
|---|---|---|---|---|---|---|---|---|
| 1 | SM-24 · SM-26 | Bulk Upload › Lahan · Settings — dibuka dari sesi `demo@wri.org` | Dialihkan ke `/admin`; sidebar tanpa Bulk Upload/Settings, padahal `tbl_user.role` = SUPERADMIN (diubah 2026-09-11). Role dibekukan di JWT saat sign-in (`auth.config.ts`), perubahan role/nonaktif tidak berlaku pada sesi hidup | major (keamanan: penurunan role tak berlaku) | prod | #342 | defer — bukan regresi v0.35.0 (perilaku lama); perbaikan di siklus berikutnya. **Terkonfirmasi 21:50:** `/api/auth/session` masih `OPERATOR` walau token baru dirotasi (`expires` bergeser), berubah `SUPERADMIN` hanya setelah logout/login; SM-24/26 lalu Pass (`-ulang`) | run `2026-09-15-prod.md`, `-ulang.md` |

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
