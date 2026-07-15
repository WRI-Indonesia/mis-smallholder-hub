# Standar — Versioning & Release

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Terkait: [workflow.md](./workflow.md) · [principles.md](./principles.md) · [../project/roadmap.md](../project/roadmap.md) · [../project/changelog.md](../project/changelog.md)

## Skema Versi

Menggunakan **Semantic Versioning** (`MAJOR.MINOR.PATCH`) yang diadaptasi untuk aplikasi: "breaking change" didefinisikan dari sisi **pengguna dan operasional**, bukan API library. Tag Git berformat `vX.Y.Z` dan hanya dibuat di branch `main`.

### Kriteria Bump

| Bump | Kapan dianggap naik versi | Contoh |
| --- | --- | --- |
| **MAJOR** | Perubahan yang memutus kompatibilitas: migrasi DB yang butuh intervensi manual/berisiko data, perombakan RBAC/alur login, perubahan struktur data yang membuat data lama tidak kompatibel, atau milestone besar (go-live produksi = `1.0.0`) | Restrukturisasi hierarki Petani → Kelompok Tani → Lembaga Petani yang mengubah data existing |
| **MINOR** | Fitur baru yang terlihat pengguna: satu phase roadmap berstatus ✅ Done, modul/menu baru, kolom atau alur baru di UI | Phase MAP-01 selesai, bulk upload region baru, report baru |
| **PATCH** | Perbaikan tanpa fitur baru: bugfix, perbaikan performa, penyesuaian UI kecil, koreksi validasi | Perbaikan performa list action (#163) |

**Tidak memicu naik versi:** perubahan `docs:`, `chore:`, refactor internal tanpa dampak perilaku, dan perubahan seed/script dev. Perubahan seperti ini menumpang di rilis berikutnya.

### Hubungan dengan Conventional Commits

Prefix commit menentukan bump minimal pada rilis berikutnya:

- Ada `feat:` sejak rilis terakhir → minimal **MINOR**
- Hanya `fix:` / `perf:` → **PATCH**
- Hanya `docs:` / `chore:` / `refactor:` → tidak perlu rilis
- Breaking change (lihat kriteria MAJOR) → **MAJOR** — tandai di body commit dengan `BREAKING CHANGE:`

### Aturan Pre-1.0

Selama versi masih `0.x`:

- MAJOR ditahan di `0`; perubahan breaking cukup menaikkan MINOR (mis. `0.5.0` → `0.6.0`).
- `1.0.0` disimpan untuk **go-live produksi**.

## Alur Rilis

Versi mengikuti governance roadmap: status phase hanya naik jika terverifikasi lewat code, dan rilis mengikuti status tersebut.

1. **Kerja harian di branch aktif** (`mvp`) dengan conventional commits — sesuai [workflow.md](./workflow.md).
2. **Titik rilis** — setiap **phase roadmap Done** ([roadmap.md](../project/roadmap.md)) atau setiap **ringkasan dua mingguan** di [changelog.md](../project/changelog.md), mana yang lebih dulu terasa utuh. Tidak rilis per commit.
3. **Gate lokal**: `npm run lint`, `npm run build`, dan `npm test` lulus (Pre-Commit Gate di [workflow.md](./workflow.md)). Tidak ada CI otomatis — gate dijalankan lokal.
4. **Bump versi**: update `version` di `package.json`, tambah entri rilis di [changelog.md](../project/changelog.md), commit dengan pesan `chore(release): vX.Y.Z`.
5. **PR `mvp` → `main`**, merge setelah approval.
6. **Tag & Release di `main`**:
   - Annotated tag: `git tag -a vX.Y.Z -m "vX.Y.Z"` pada merge commit di `main`, lalu `git push origin vX.Y.Z`.
   - GitHub Release: `gh release create vX.Y.Z` dengan release notes diambil dari ringkasan changelog — **bukan** auto-generate dari commit mentah, agar konsisten dengan changelog sebagai catatan historis.

### Checklist Rilis

- [ ] Semua commit sejak rilis terakhir sudah ter-review (issue workflow selesai)
- [ ] Lint, build, dan test lulus lokal
- [ ] `package.json` `version` sudah di-bump sesuai kriteria
- [ ] Entri rilis tercatat di `docs/project/changelog.md`
- [ ] PR `mvp` → `main` merged
- [ ] Annotated tag `vX.Y.Z` dibuat di `main` dan di-push
- [ ] GitHub Release dibuat dengan notes dari changelog

## Catatan Historis

- Tag lama `v1.8-complete` (April 2026) **tidak mengikuti skema ini** dan tidak dipakai sebagai acuan; dibiarkan apa adanya karena menghapus tag yang sudah di-push berisiko membingungkan.
- Skema ini mulai bersih dari tag SemVer pertama (`v0.x.0`); penentuan angka awal dicatat di Decision Log ([changelog.md](../project/changelog.md)) saat rilis pertama dibuat.
