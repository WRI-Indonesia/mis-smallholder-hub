---
description: Matriks cakupan — issue & objek (menu, fitur, tabel, field, enum) yang baru/berubah/terdampak sejak rilis terakhir
argument-hint: "[rentang/issue, mis. #365 atau v0.38.0..HEAD] (kosong = sejak rilis terakhir)"
---

Laporkan cakupan perubahan development. **Read-only**: jangan mengedit berkas, commit, membuat/menutup issue, menjalankan migrasi, atau menulis ke DB. Kalau menemukan masalah, catat di laporan — jangan diperbaiki di sini.

Rentang (kosong = commit `chore(release)` terakhir di `mvp` .. `HEAD`): $ARGUMENTS

**Selalu sertakan perubahan yang belum di-commit**, bukan hanya yang sudah. Kode fitur sering masih uncommitted sementara commit terakhir cuma docs/QA — melewatkannya membuat laporan ini bohong tanpa terlihat bohong.

## Sumber bukti

Telusuri, jangan menyimpulkan dari pesan commit saja:

| Objek | Sumber |
|---|---|
| Tabel · Field · Enum | `prisma/schema/*.prisma` · `prisma/migrations/` |
| Menu · Sub-menu | `prisma/seeds/data/menu.csv` · rute `src/app/(admin)/admin/**` |
| Fitur · Aksi | `src/server/actions/*.ts` · komponen halaman terkait |
| Artefak turunan | `src/lib/data-schema.generated.ts` · `src/lib/data-lineage.generated.ts` (basi = perlu regenerasi) |
| Bantuan | `src/content/help/` |

## Keluaran

**Tabel A — Issue.** `Issue` · `Judul` · `Status` (selesai / sebagian / **tanpa issue**) · `Jenis` (fitur baru / perubahan / perbaikan / docs) · `Ringkas dampak`.

**Tabel B — Matriks objek terdampak.** Satu baris per objek konkret: `Objek` (nama persisnya, mis. `LandParcelNkt.purpose`) · `Tipe` (Menu / Sub-menu / Fitur-Aksi / Tabel / Field / Enum) · `Status` (**Baru** / **Berubah** / **Terdampak**) · `Issue` · `Keterangan`.

"Terdampak" = tidak diubah tapi perilakunya ikut berubah (mis. aksi lain yang membaca field yang berubah maknanya). Jangan dilewat — di situ regresi bersembunyi. Kalau ragu antara Berubah dan Terdampak, tulis Terdampak dan sebut alasannya.

**Tabel C — Kerja lanjutan yang tersirat.** Turunkan dari Tabel B, tandai **sudah / belum**:

- **Tabel / Field / Enum** Baru-Berubah → migrasi Prisma · `npm run build:schema` · `docs/database/models.md` + `erd.md` (Schema Version) + `migrations.md`
- **Menu / Sub-menu** Baru-Berubah → seed menu + RBAC (`UserPermissionOverride`) · `npm run build:lineage` · cek `ICON_MAP` di prod sebelum seed (ikon tak dikenal = jendela 404) · `docs/product/*` navigasi per-peran
- **Fitur-Aksi** Baru-Berubah → tiga lapis keamanan (`hasPermission` · `getAccessContext` · soft delete) · Zod schema · `revalidatePath` · materi Bantuan
- Perubahan apa pun → `docs/project/{roadmap,sprint,changelog,tech-debt}.md` tidak menyisakan baris usang

## Penutup

Tutup dengan **satu paragraf**: apa yang paling berisiko dari cakupan ini, dan objek mana yang paling perlu diverifikasi manual. Sebutkan juga apa yang **tidak bisa** kamu pastikan dari kode saja (mis. status data di prod) — jangan ditebak.
