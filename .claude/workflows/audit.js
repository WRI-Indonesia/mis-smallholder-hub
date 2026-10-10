export const meta = {
  name: 'audit',
  description: 'Audit repo read-only: dead code+penamaan, test, docs, Bantuan, TD+bug+keamanan — temuan diverifikasi',
  whenToUse: 'Dipanggil oleh command /audit (mingguan atau penuh). Hanya analisa; penulisan/perbaikan dikerjakan loop utama sesudah owner menyetujui.',
  phases: [
    { title: 'Analisa', detail: 'satu agen read-only per area' },
    { title: 'Verifikasi', detail: 'satu skeptis per area menguji temuan tinggi/sedang' },
  ],
}

// args: { areas?: string[] (subset dari AREA key), previous?: string[] (key temuan laporan sebelumnya), today?: string }
const input = args && typeof args === 'object' ? args : {}
const previous = Array.isArray(input.previous) ? input.previous : []

const READ_ONLY = [
  'STRICTLY READ-ONLY: jangan edit/buat/hapus/pindah berkas ter-track, jangan jalankan perintah git yang mengubah state,',
  'jangan buat/tutup/komentari issue GitHub (gh read-only boleh), jangan sentuh database apa pun, jangan cat berkas .env selain .env.example.',
  'Menulis ke folder gitignored /coverage atau scratchpad sesi boleh.',
  'Setiap temuan WAJIB ber-bukti konkret (file:line, hasil grep/hitungan, nomor issue). Tanpa bukti = jangan laporkan.',
  'Tulis title/evidence/suggestion dalam Bahasa Indonesia, ringkas. JANGAN cantumkan nama petani/offtaker asli, NIK, password, atau email staf.',
  'key = slug stabil kebab-case yang sama dari minggu ke minggu untuk masalah yang sama (mis. "deadcode-export-foo-bar", "help-p16-label-tampilan"), bukan nomor urut.',
].join(' ')

const AREAS = [
  {
    key: 'deadcode',
    title: 'Dead code & penamaan',
    prompt: `Area: dead code + penamaan berkas/folder.
1. Jalankan \`npx knip --no-progress\`. Verifikasi MANUAL tiap temuan: grep pemakai (rg fixed-string), import dinamis \`import()\`, berkas konvensi App Router (page/layout/route/loading/error/not-found/template/default), CSS @import, entry skrip/CLI di package.json & scripts/**, seed prisma/**, next.config.ts, vitest config.
2. False positive yang SUDAH diketahui — jangan laporkan sebagai mati: skrip CLI di scripts/** yang dirujuk docs/README seed/.claude/commands (selama repo belum punya knip.json dengan entry scripts/**), devDep sharp (TD-009), tailwindcss & tw-animate-css (CSS @import), shadcn & dotenv-cli (CLI), token @theme scaffold, ekspor src/components/ui/** (pola shadcn), ekspor/tipe yang dipakai di berkasnya sendiri atau oleh skrip seed, NEXTAUTH_SECRET/NEXTAUTH_URL (dibaca implisit next-auth). Keputusan tertunda #353 bagian E: hanya font Acumin (lisensi, #273) → laporkan sekali dengan action "biarkan" dan evidence "menunggu keputusan #353".
3. Cari juga kode di balik flag yang selalu false, blok komentar besar, TODO/FIXME yang menunjuk pekerjaan yang sudah selesai, env var yang dibaca kode tapi tak ada di .env.example (atau sebaliknya).
4. Penamaan: \`git ls-files\` di src/, prisma/, scripts/ (kecuali scripts/local), docs/, src/content/help/ — laporkan nama berkas/folder yang tidak kebab-case atau tidak konsisten. Kecualikan konvensi sah: route group (admin), segmen [id] / [...nextauth], page.tsx dkk., README.md/CLAUDE.md/LICENSE, dotfile, folder migrasi Prisma timestamp_snake, docs NNNN-slug, changelog YYYY-MM, folder QA vX.Y.Z / _template, prefix Bantuan (p-16-..., t-3-...).
Hapus/rename = destructive=true.`,
  },
  {
    key: 'test',
    title: 'Vitest bersih & terkini',
    prompt: `Area: test (Vitest, src/test/**).
1. Bersih: grep .skip/.only/it.todo/test.todo/xit/describe.skip. Test "mirror" yang menyalin logika produksi alih-alih mengimpornya. Test duplikat. Perf test (src/test/perf.test.ts, region.test.ts) yang tidak memakai minTime/minTimeAsync (src/test/perf-utils.ts) atau ambangnya < 3× angka terukur.
2. Coverage: \`npx vitest run --coverage --exclude src/test/perf.test.ts --coverage.reporter=json-summary --coverage.reporter=text-summary\`, baca coverage/coverage-summary.json. Laporkan angka total + per area (src/server/actions, src/lib, src/validations, src/hooks) di field summary.
3. Petakan tiap src/server/actions/*.ts ke test-nya. Untuk berkas < 60% baris atau tanpa test: guard yang belum teruji — hasPermission(menuKey, level) (menu key & level di-assert?), scope getAccessContext (termasuk jalur by-id), soft delete isActive, validasi Zod gagal. Tiap temuan sebut file:line guard-nya.
4. Lib murni src/lib < 50% yang memuat logika hot-path (agregasi, sort, validasi array besar).
Usulan test baru = action "perbaiki" dengan suggestion: fungsi target, apa yang di-assert, pola berkas test yang ditiru (mis. *-guard.test.ts).`,
  },
  {
    key: 'docs',
    title: 'Isi docs/',
    prompt: `Area: folder docs/. Mulai dari docs/README.md (indeks + §Konvensi docs) dan docs/decisions/README.md. Jangan jalankan npm run build:docs (menulis berkas); boleh \`npx vitest run src/test/docs-generated.test.ts\`.
1. Kelengkapan indeks: .md di docs/ (kecuali docs/qa/archive/**) yang tak terjangkau dari indeks; entri indeks ke berkas yang tak ada.
2. Tautan relatif rusak di docs/**/*.md (abaikan #anchor; kecuali qa/archive).
3. Rujukan kode basi: path ber-backtick src/…, scripts/…, prisma/… dan identifier kode ber-backtick yang sudah tidak ada (cek git ls-files / rg). Prioritas docs/standards, docs/database, docs/product, docs/project/{roadmap,sprint,tech-debt}.md.
4. Fakta yang bisa dicek di luar blok GENERATED: jumlah migrasi, menu, berkas Bantuan, berkas test; pernyataan yang saling bertentangan antar docs (termasuk CLAUDE.md vs docs/standards/*); fitur yang sudah dihapus.
5. Baris roadmap.md/sprint.md yang statusnya bertentangan dengan status issue GitHub (gh issue view --json state).
6. Penamaan berkas docs/ yang melanggar konvensinya sendiri.`,
  },
  {
    key: 'bantuan',
    title: 'Materi Bantuan',
    prompt: `Area: materi Bantuan src/content/help/** (frontmatter menuKey, permission, href). Boleh \`npx vitest run src/test/help-registry.test.ts\` (tulis hasilnya di summary beserta cakupan menu daun).
1. menuKey ↔ prisma/seeds/data/menu.csv: key tak dikenal, href ≠ route, menu daun (punya route, tanpa anak) tanpa materi.
2. Izin: frontmatter permission dan kalimat soal peran ("hanya akun berizin Export", "DONOR tidak melihat …") ↔ prisma/seeds/data/role-permissions.csv. Izin EFEKTIF = baris menu itu DIGABUNG baris semua induknya di prisma/seeds/data/menu.csv (kaskade union, src/lib/rbac.ts) — mis. VIEW di 'master-data' membuka semua submenu Master Data; jangan simpulkan "peran X tak punya akses" dari baris anak saja. Kontradiksi = tinggi.
3. Ketepatan UI: label tombol/tab/kolom/jalur menu yang ditebalkan di teks ↔ komponen halaman di src/app/(admin)/admin/<route>/**. Label yang sudah tak ada/berganti = sedang. Prioritaskan halaman yang berubah 14 hari terakhir: \`git log --since="14 days ago" --name-only --format= -- 'src/app/(admin)/**' | sort -u\`.
4. Fitur yang sudah tidak ada, langkah yang bertentangan dengan perilaku sekarang (tinggi).
5. Istilah: UI memakai "petani terdaftar" (bukan "petani aktif") untuk pembagi cakupan — rendah.
Gaya yang berlaku (jangan laporkan di luar ini): dua tingkat kedalaman (baris "+ "), troubleshooting inline di "## Kalau bermasalah", tanpa screenshot.`,
  },
  {
    key: 'tdbug',
    title: 'TD, bug & keamanan kode',
    prompt: `Area: register tech debt, bug terbuka, dan pola bug di kode.
1. docs/project/tech-debt.md: untuk SETIAP debt aktif, verifikasi ke kode: masih berlaku / sudah selesai (bukti) / sebagian / deskripsi basi (path/angka salah). Jalankan grep yang tersirat di butir "Validation"-nya. Konsistensi register: tabel Ringkasan (aktif/selesai/total), daftar "Debt aktif:" vs header bagian, tanggal paragraf "Pembaruan Berkala".
2. \`gh issue list --state open --label bug --json number,title,body\`: masih terjadi menurut kode (file:line)? sudah diperbaiki commit lain (\`git log --oneline --grep=#n\`)? terjadwal di docs/project/sprint.md?
3. \`gh issue list --state open --label priority:P1\`: issue yang sebenarnya sudah selesai di kode tapi masih open.
4. Pola bug di src/server/actions/*.ts: fungsi async ekspor yang mengakses DB tanpa hasPermission; read findMany/findFirst/count pada tabel soft-delete tanpa isActive: true; delete/deleteMany di luar pengecualian terdokumentasi CLAUDE.md (LandParcelNkt, LandParcelBorder, LandMarkerCounter); mutasi tanpa createdBy/modifiedBy; input tanpa Zod safeParse. Hanya temuan konkret file:line.
Temuan baru yang butuh kerja > S = action "issue"; utang yang disadari = "td"; TD yang sudah selesai = action "perbaiki" (tutup TD) dengan bukti.`,
  },
]

const FINDINGS = {
  type: 'object',
  properties: {
    summary: { type: 'string', description: 'Ringkasan 2–5 baris: angka kunci area ini (mis. coverage, cakupan Bantuan, jumlah TD terverifikasi).' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          title: { type: 'string' },
          severity: { type: 'string', enum: ['tinggi', 'sedang', 'rendah'] },
          evidence: { type: 'string' },
          suggestion: { type: 'string' },
          action: { type: 'string', enum: ['perbaiki', 'hapus', 'rename', 'issue', 'td', 'biarkan'] },
          destructive: { type: 'boolean' },
        },
        required: ['key', 'title', 'severity', 'evidence', 'suggestion', 'action', 'destructive'],
      },
    },
  },
  required: ['summary', 'findings'],
}

const VERDICTS = {
  type: 'object',
  properties: {
    verdicts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          real: { type: 'boolean' },
          reason: { type: 'string' },
        },
        required: ['key', 'real', 'reason'],
      },
    },
  },
  required: ['verdicts'],
}

const selected = Array.isArray(input.areas) && input.areas.length ? AREAS.filter((a) => input.areas.includes(a.key)) : AREAS
if (selected.length < AREAS.length) log(`Area dipilih: ${selected.map((a) => a.key).join(', ')} (dilewati: ${AREAS.filter((a) => !selected.includes(a)).map((a) => a.key).join(', ')})`)

const prevNote = previous.length
  ? `Key temuan laporan sebelumnya (pakai key yang SAMA bila masalahnya masih ada): ${previous.slice(0, 300).join(', ')}.`
  : 'Tidak ada laporan sebelumnya.'

const results = await pipeline(
  selected,
  (area) =>
    agent(`${READ_ONLY}\n\n${prevNote}\n\n${area.prompt}`, { label: `analisa:${area.key}`, phase: 'Analisa', schema: FINDINGS }),
  async (found, area) => {
    if (!found) return { area: area.key, title: area.title, summary: '(agen gagal)', findings: [], unverified: 0 }
    const toCheck = found.findings.filter((f) => f.severity !== 'rendah')
    if (!toCheck.length) return { area: area.key, title: area.title, summary: found.summary, findings: found.findings.map((f) => ({ ...f, verified: false })), unverified: found.findings.length }
    const v = await agent(
      `${READ_ONLY}\n\nKamu skeptis. Untuk tiap temuan di bawah (area "${area.title}"), coba BANTAH dengan memeriksa kode/berkas/issue sendiri: apakah buktinya benar, masih berlaku di HEAD sekarang, dan bukan false positive yang sudah diketahui? real=false bila buktinya salah, sudah diperbaiki, atau ragu. Kembalikan satu verdict per key.\n\n${JSON.stringify(toCheck, null, 1)}`,
      { label: `verifikasi:${area.key}`, phase: 'Verifikasi', schema: VERDICTS },
    )
    const verdict = new Map((v?.verdicts ?? []).map((x) => [x.key, x]))
    const findings = found.findings
      .map((f) => {
        if (f.severity === 'rendah') return { ...f, verified: false }
        const x = verdict.get(f.key)
        return x ? { ...f, verified: x.real, verifyNote: x.reason } : { ...f, verified: false, verifyNote: 'tanpa verdict' }
      })
      .filter((f) => f.severity === 'rendah' || f.verified)
    const dropped = toCheck.length - findings.filter((f) => f.severity !== 'rendah').length
    if (dropped) log(`${area.key}: ${dropped} temuan tinggi/sedang dibantah verifikator dan dibuang`)
    return { area: area.key, title: area.title, summary: found.summary, findings, unverified: findings.filter((f) => !f.verified).length, refuted: dropped }
  },
)

const areas = results.filter(Boolean)
const all = areas.flatMap((a) => a.findings.map((f) => ({ ...f, area: a.area })))
const keys = new Set(all.map((f) => f.key))
const delta = {
  baru: all.filter((f) => !previous.includes(f.key)).map((f) => f.key),
  masih: all.filter((f) => previous.includes(f.key)).map((f) => f.key),
  selesai: previous.filter((k) => !keys.has(k)),
}
log(`Selesai: ${all.length} temuan (${delta.baru.length} baru · ${delta.masih.length} masih · ${delta.selesai.length} hilang sejak laporan lalu)`)
return { areas, delta, counts: { total: all.length, tinggi: all.filter((f) => f.severity === 'tinggi').length, sedang: all.filter((f) => f.severity === 'sedang').length, rendah: all.filter((f) => f.severity === 'rendah').length } }
