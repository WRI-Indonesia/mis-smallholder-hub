# Standar — Panduan Model & Effort AI (Claude Code)

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Terkait: [workflow.md](./workflow.md) · [principles.md](./principles.md)

Panduan memilih model Claude dan level *reasoning effort* saat mengerjakan sh-mis lewat Claude Code. Tujuannya konsisten: kualitas cukup untuk kelas tugasnya, tanpa membayar model termahal untuk kerja rutin.

> Harga dan perilaku model berubah seiring rilis baru. Data di sini per **Agustus 2026** — verifikasi ulang saat ada model generasi baru.

## Ringkasan cepat

| Kelas tugas | Model · Effort | Alasan singkat |
|---|---|---|
| **Default harian** — fitur CRUD, kolom + migrasi, fix bug, update Bantuan | **Opus 5 · high** | Pola sudah mapan di codebase; `high` (default API) sudah lebih dari cukup |
| **Tugas ringan** — tweak copy/UI, tanya-jawab kode, edit 1–2 file | **Sonnet 5 · high** | Hasil setara untuk kelas ini, ±⅓ harga Opus |
| **Tugas terberat** — review pra-rilis, debugging lintas modul, refactor besar (mis. TD-013/TD-014) | **Fable 5 · high** | Model terkuat paling terasa bedanya di tugas panjang & ambigu |
| **Import/upsert data Excel kotor** ke database | **Fable 5 · high** (alternatif: Opus 5 · xhigh + gerbang dry-run) | Judgment data + tulis DB = biaya kesalahan tinggi |

Kalau tidak mau gonta-ganti: **Opus 5 · high** sebagai satu-satunya setting.

## Perbandingan model

| | Sonnet 5 | Opus 5 | Fable 5 |
|---|---|---|---|
| Harga input/output per 1M token | $3 / $15 (intro $2/$10 s.d. 31 Agu 2026) | $5 / $25 | $10 / $50 |
| Kualitas | Mendekati kelas Opus untuk coding; unggul di tugas sedang | Paling unggul justru di tugas *sulit* (multi-file, end-to-end) | Model paling pintar yang dirilis luas |
| Kecepatan | Paling cepat | Menengah | Paling lambat — satu turn tugas berat bisa beberapa menit (thinking selalu aktif) |

Catatan penting soal biaya: model lebih pintar sering butuh **lebih sedikit putaran** untuk selesai, jadi selisih biaya nyata per tugas lebih kecil daripada selisih tarif per token.

## Memahami effort

- **Effort bukan skala linier antar model.** `high` di model generasi baru sering melampaui `xhigh`/`max` model generasi sebelumnya. "Fable high" umumnya masih di atas "Opus xhigh" untuk kualitas reasoning.
- **`high` adalah default dan sweet spot** untuk hampir semua kerja di proyek ini.
- **`xhigh` hanya untuk tugas agentic terberat** — refactor besar sekali jalan, debugging eksploratif lintas modul, review menyeluruh. Effort tinggi di awal kadang justru lebih murah total: perencanaan matang mengurangi jumlah putaran tool call.
- **Sinyal naik effort:** hasil terasa dangkal atau model berhenti terlalu cepat. Naikkan effort — jangan turunkan model.

## Kasus khusus: import/upsert data Excel

Kelas tugas ini layak model terkuat bukan karena kodenya sulit, tapi karena sifatnya:

1. **Data kotor butuh judgment** — ejaan nama beda, NIK setengah kosong, kolom geser, format tanggal campur. Satu salah cocok orang = data salah di database. (Lihat pola resolusi ID → flip → NIK → nama pada alur import pelatihan.)
2. **Upsert = tulis ke DB, sulit rollback** — apalagi risiko skrip lokal default ke mis-prod (jebakan dual `DATABASE_URL` di `.env`).
3. **Alurnya panjang & agentic** — parse → profil data → dry-run → review → konfirmasi → upsert → Excel hasil.

**Aturan dua fase (wajib, apa pun modelnya):**

- **Fase 1 — Review only:** parse + cocokkan + hasilkan Excel review (baris valid, baris gagal + alasan). **Nol tulisan ke database.**
- **Fase 2 — Upsert:** dijalankan hanya setelah hasil Fase 1 diperiksa dan disetujui manusia.

Dengan gerbang manusia di tengah, **Opus 5 · xhigh** jadi alternatif hemat yang masuk akal. Tanpa gerbang, pakai **Fable 5 · high**. Jangan pakai Sonnet untuk bagian resolusi data kotor.

## Prinsip penutup

- Kerja yang menyentuh **mis-prod** (skrip DB, import produksi) → selalu model terkuat + dry-run + log DB efektif.
- Gerbang `npm run build` + `npm test` sebelum selesai sudah menangkap banyak kesalahan — itu yang membuat model menengah aman untuk kerja rutin.
- Pisahkan tugas besar jadi fase eksplisit saat memberi perintah; ini menaikkan keandalan model apa pun.
