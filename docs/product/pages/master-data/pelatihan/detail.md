# Page: Detail Pelatihan

[← Pelatihan](./README.md) · [← Katalog halaman](../../README.md)

## Diagram objek

```text
Halaman: Detail Pelatihan (/admin/master-data/training/[id])
├── Header
│   ├── Tombol kembali
│   ├── Judul: Detail Pelatihan
│   └── Subjudul: nama paket
├── Kartu info
│   ├── Lembaga Petani, Distrik, Tanggal Pelatihan
│   └── Lokasi, Total Peserta, Evidence (Notulen)
├── Toolbar
│   ├── Tombol: Tambah Peserta
│   └── Tombol: Hapus Terpilih (n)
├── Tabel peserta
│   ├── Kolom: checkbox, No, Nama, ID Petani, NIK, L/P, Pre-Test, Post-Test, Aksi
│   ├── Input nilai Pre/Post-Test (onBlur)
│   └── Aksi baris: Hapus peserta
└── Dialog
    └── AddParticipantsModal
        ├── Tab: Pilih Manual
        ├── Tab: Upload List Peserta
        └── Tabel: Tinjauan Data (n baris)
```

| Atribut | Nilai |
|---|---|
| File | `training/[id]/page.tsx` + `training-detail-client.tsx` (+ `add-participants-modal.tsx`) |
| Tipe | Server Component + client component |
| Guard | `requirePermission("master-data-training")` + `getUserPermissionsForMenu`; `notFound()` bila kosong |
| Server action / data | `getTrainingActivityById(id)`; mutasi: `addParticipants`, `removeParticipant`, `removeParticipants`, `updateParticipantScores`, `getFarmersByGroup` |

## Objek halaman

| Objek | Tipe | Keterangan |
|---|---|---|
| `Detail Pelatihan` | Heading | Tombol kembali + subjudul nama paket |
| Kartu info | Kartu | `Lembaga Petani`, `Distrik`, `Tanggal Pelatihan`, `Lokasi`, `Total Peserta`, `Evidence (Notulen)` (link PDF presigned atau `—`) |
| `Peserta Pelatihan` | Heading | Judul seksi |
| Tombol `Tambah Peserta` | Tombol | EDIT — buka `AddParticipantsModal` |
| Tombol `Hapus Terpilih (n)` | Tombol | EDIT — muncul bila ada baris tercentang; `removeParticipants` (konfirmasi `confirm`) |
| Tabel peserta | Tabel | Kolom: checkbox (EDIT), `No`, `Nama`, `ID Petani`, `NIK` (disensor), `L/P`, `Pre-Test`, `Post-Test`, `Aksi` (EDIT) |
| Input nilai Pre/Post-Test | Input | EDIT — number 0–100, simpan `onBlur` via `updateParticipantScores` (`trainingParticipantScoreSchema`); non-EDIT tampil teks |
| Tombol hapus peserta | Tombol | EDIT — `removeParticipant` dengan konfirmasi |
| Empty state | Teks | `Belum ada peserta terdaftar untuk pelatihan ini.` |

## Dialog: `AddParticipantsModal`

Judul `Tambah Peserta Pelatihan`; aksi `addParticipants` (validasi `addParticipantsSchema`, `src/validations/training-participant.schema.ts`); dua tab.

| Objek | Tipe | Keterangan |
|---|---|---|
| Tab `Pilih Manual` | Tab | Panel kiri `Petani Tersedia (n)` + pencarian `Cari nama / ID...` + `Pilih Semua Halaman Ini`; badge `n terpilih`; panel kanan `Petani Terpilih (n)` + `Hapus Semua`; empty `Tidak ada kandidat petani` / `Belum ada petani dipilih` |
| Tab `Upload List Peserta` | Tab | Drop zone `Unggah List Peserta Pelatihan` (.xlsx/.csv), tombol `Template Excel` (kolom `ID Petani`, `Nilai Pre-Test`, `Nilai Post-Test`) |
| `Tinjauan Data (n baris)` | Tabel | Kolom `ID Petani`, `Nama`, `Pre-Test`, `Post-Test`, `Status`, `Keterangan`; ringkasan `n Valid` / `n Warning` / `n Error` |
| Validasi baris upload | Aturan | ERROR: nilai Pre/Post-Test bukan angka 0–100, `ID Petani tidak ditemukan di lembaga tani ini`, `Petani sudah terdaftar sebagai peserta`; WARNING: sudah pernah mengikuti paket sama di kegiatan lain |
| Footer | Tombol | `Batal` + `Tambahkan Peserta` (manual) / `Tambahkan n Peserta` (upload; VALID + WARNING ikut disimpan) |
