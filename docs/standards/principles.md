# Standar — Prinsip Development

> Bagian dari dokumentasi **Standar**. Indeks: [../README.md](../README.md) · Terkait: [workflow.md](./workflow.md) · [code-standards.md](./code-standards.md) · [rbac.md](./rbac.md) · [ui-ux.md](./ui-ux.md) · [architecture.md](./architecture.md)

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

- Nyatakan asumsi secara eksplisit. Jika ragu, tanya.
- Jika ada beberapa interpretasi, paparkan — jangan pilih diam-diam.
- Jika ada pendekatan lebih sederhana, sampaikan. Push back jika perlu.
- Jika sesuatu tidak jelas, berhenti. Sebutkan apa yang membingungkan.

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

- **Minimal code** — Sesedikit mungkin untuk menyelesaikan kebutuhan. Jangan over-engineer.
- **Flat over nested** — Prefer early return, guard clause.
- **Obvious over clever** — Code harus bisa dibaca tanpa penjelasan tambahan.
- **Single responsibility** — Satu fungsi/komponen = satu tugas.
- **No premature abstraction** — Baru abstraksi jika ada 3+ kasus sama.
- **Delete over comment** — Hapus dead code, jangan comment out.
- **No speculative features** — Tidak ada fitur/error handling untuk skenario yang tidak diminta.

Tes: Jika 200 baris bisa jadi 50, tulis ulang.

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

- Sentuh **hanya** yang harus diubah sesuai permintaan.
- Jangan "improve" code, comment, atau formatting yang berdekatan.
- Jangan refactor yang belum rusak.
- Match style existing, walau berbeda preferensi.
- Jika temukan dead code lain, sebutkan — jangan hapus tanpa diminta.
- Hapus imports/variables yang menjadi unused **akibat perubahan kamu** saja.

Tes: Setiap baris yang berubah harus bisa di-trace langsung ke permintaan user.

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

Ubah task menjadi goal yang bisa diverifikasi:

- "Add validation" → Tulis test invalid input, lalu buat passing
- "Fix bug" → Tulis test reproduksi, lalu fix
- "Refactor X" → Pastikan tests pass sebelum dan sesudah

Untuk multi-step task, buat plan singkat:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
