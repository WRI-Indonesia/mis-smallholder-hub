/**
 * Parser Markdown **subset** untuk konten Bantuan (#184) — sengaja tanpa
 * dependency: konten berasal dari file repo (tepercaya, formatnya kita
 * kendalikan) dan hasilnya dirender sebagai **elemen React**, bukan HTML
 * mentah, sehingga tak ada jalur `dangerouslySetInnerHTML`.
 *
 * Subset yang didukung (lihat `src/content/help/README.md`):
 * - Frontmatter `---` di awal file: `key: value` per baris.
 * - `## Judul` → sub-judul (h4 saat dirender).
 * - `**Istilah** — penjelasan` (atau `-` / `:`) di awal baris → baris definisi.
 * - `- item` → daftar berpoin.
 * - Baris lain yang berdampingan → paragraf.
 * - Inline: `**tebal**`, `` `kode` ``, `[teks](url)`.
 */

export interface MdFrontmatter {
  [key: string]: string;
}

export type MdInline =
  | { type: "text"; value: string }
  | { type: "strong"; value: string }
  | { type: "code"; value: string }
  | { type: "link"; value: string; href: string };

/** Media dari sintaks `![keterangan](sumber)` — jenis ditebak dari sumbernya. */
export type MdMediaKind = "image" | "video" | "embed";

/**
 * Satu langkah tutorial. `detail` adalah penjelasan tambahan (baris `+`) yang
 * hanya tampil pada mode Detail — sumbernya satu, tampilannya dua tingkat,
 * sehingga versi ringkas dan versi rinci tak mungkin saling ketinggalan.
 */
export interface MdStep {
  inline: MdInline[];
  detail?: MdInline[];
}

export type MdBlock =
  | { type: "heading"; inline: MdInline[] }
  | { type: "paragraph"; inline: MdInline[]; detail?: boolean }
  | { type: "list"; items: MdInline[][] }
  | { type: "definition"; term: string; desc: MdInline[] }
  | { type: "steps"; items: MdStep[] }
  | { type: "callout"; tone: MdCalloutTone; inline: MdInline[] }
  | { type: "media"; kind: MdMediaKind; src: string; caption: string };

/** Nada callout — dipakai memilih warna & ikon saat render. */
export type MdCalloutTone = "tip" | "penting" | "hati-hati";

export interface MdDocument {
  frontmatter: MdFrontmatter;
  blocks: MdBlock[];
}

/** Pisahkan frontmatter (bila ada) dari body. */
export function parseFrontmatter(source: string): { frontmatter: MdFrontmatter; body: string } {
  const text = source.replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!match) return { frontmatter: {}, body: text.trim() };

  const frontmatter: MdFrontmatter = {};
  for (const line of match[1].split("\n")) {
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).trim();
    const value = line
      .slice(sep + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (key) frontmatter[key] = value;
  }
  return { frontmatter, body: text.slice(match[0].length).trim() };
}

/** Inline: `**tebal**`, `` `kode` ``, `[teks](url)`; sisanya teks biasa. */
export function parseInline(text: string): MdInline[] {
  const out: MdInline[] = [];
  const pattern = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ type: "strong", value: m[1] });
    else if (m[2] !== undefined) out.push({ type: "code", value: m[2] });
    else out.push({ type: "link", value: m[3], href: m[4] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out.length > 0 ? out : [{ type: "text", value: "" }];
}

// `**Istilah** — penjelasan` (em dash, en dash, hyphen, atau titik dua).
const DEFINITION_RE = /^\*\*([^*]+)\*\*\s*[—–:-]\s*(.+)$/;

// `1. langkah` — langkah bernomor tutorial. Nomor di berkas boleh salah urut;
// penomoran tampilan selalu diturunkan dari posisi, bukan dari angka yang ditulis.
const STEP_RE = /^\d+[.)]\s+(.+)$/;

// `+ teks` — penjelasan tambahan tingkat Detail. Menempel pada langkah tepat di
// atasnya bila ada; selain itu berdiri sebagai paragraf tingkat Detail.
const DETAIL_RE = /^\+\s+(.+)$/;

// `> [!tip] teks` · nada: tip | penting | hati-hati.
const CALLOUT_RE = /^>\s*\[!(tip|penting|hati-hati)\]\s*(.*)$/i;

// `![keterangan](sumber)` berdiri sendiri di satu baris → gambar/video/embed.
const MEDIA_RE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;

const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/;

/** Sumber media di S3 privat: `s3://<key>` (#185) — di-presign saat render. */
export function s3KeyFromSrc(src: string): string | null {
  const m = /^s3:\/\/(.+)$/.exec(src.trim());
  const key = m?.[1]?.trim();
  return key ? key : null;
}

/**
 * Tebak jenis media dari sumbernya: berkas video (`.mp4`/`.webm`/`.ogv`) →
 * pemutar `<video>`; tautan YouTube/Vimeo → embed; selain itu gambar.
 */
export function mediaKind(src: string): MdMediaKind {
  if (/\.(mp4|webm|ogv)(\?.*)?$/i.test(src)) return "video";
  if (YOUTUBE_RE.test(src) || /vimeo\.com\//.test(src)) return "embed";
  return "image";
}

/** URL embed yang siap dipakai `<iframe>` (YouTube/Vimeo). */
export function embedUrl(src: string): string {
  const yt = YOUTUBE_RE.exec(src);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = /vimeo\.com\/(?:video\/)?(\d+)/.exec(src);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return src;
}

/** Parse body markdown (tanpa frontmatter) menjadi blok. */
export function parseBlocks(body: string): MdBlock[] {
  const blocks: MdBlock[] = [];
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let list: string[] = [];
  let steps: MdStep[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ type: "paragraph", inline: parseInline(paragraph.join(" ").trim()) });
    paragraph = [];
  };
  const flushList = () => {
    if (list.length === 0) return;
    blocks.push({ type: "list", items: list.map((item) => parseInline(item)) });
    list = [];
  };
  const flushSteps = () => {
    if (steps.length === 0) return;
    blocks.push({ type: "steps", items: steps });
    steps = [];
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (line === "") {
      flushParagraph();
      flushList();
      flushSteps();
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      flushSteps();
      blocks.push({ type: "heading", inline: parseInline(line.slice(3).trim()) });
      continue;
    }

    const callout = CALLOUT_RE.exec(line);
    if (callout) {
      flushParagraph();
      flushList();
      flushSteps();
      blocks.push({
        type: "callout",
        tone: callout[1].toLowerCase() as MdCalloutTone,
        inline: parseInline(callout[2].trim()),
      });
      continue;
    }

    // Langkah bernomor didahulukan atas daftar berpoin & paragraf; nomor yang
    // ditulis diabaikan supaya menyisipkan langkah di tengah tidak menuntut
    // penomoran ulang seluruh berkas.
    const step = STEP_RE.exec(line);
    if (step) {
      flushParagraph();
      flushList();
      steps.push({ inline: parseInline(step[1].trim()) });
      continue;
    }

    const detail = DETAIL_RE.exec(line);
    if (detail) {
      const text = detail[1].trim();
      const lastStep = steps[steps.length - 1];
      if (lastStep) {
        // Menempel pada langkah terakhir; beberapa baris `+` berurutan digabung.
        const parsed = parseInline(text);
        lastStep.detail = lastStep.detail
          ? [...lastStep.detail, { type: "text", value: " " }, ...parsed]
          : parsed;
      } else {
        flushParagraph();
        flushList();
        blocks.push({ type: "paragraph", inline: parseInline(text), detail: true });
      }
      continue;
    }
    const media = MEDIA_RE.exec(line);
    if (media) {
      flushParagraph();
      flushList();
      flushSteps();
      const src = media[2];
      blocks.push({ type: "media", kind: mediaKind(src), src, caption: media[1].trim() });
      continue;
    }
    if (line.startsWith("- ")) {
      flushParagraph();
      flushSteps();
      list.push(line.slice(2).trim());
      continue;
    }
    const def = DEFINITION_RE.exec(line);
    if (def) {
      flushParagraph();
      flushList();
      flushSteps();
      blocks.push({ type: "definition", term: def[1].trim(), desc: parseInline(def[2].trim()) });
      continue;
    }
    flushList();
    flushSteps();
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  flushSteps();
  return blocks;
}

export function parseMarkdown(source: string): MdDocument {
  const { frontmatter, body } = parseFrontmatter(source);
  return { frontmatter, blocks: parseBlocks(body) };
}

/** Teks polos seluruh blok — dipakai membangun indeks pencarian. */
export function blocksToPlainText(blocks: MdBlock[]): string {
  const inlineText = (parts: MdInline[]) => parts.map((p) => p.value).join("");
  return blocks
    .map((b) => {
      switch (b.type) {
        case "heading":
        case "paragraph":
        // Isi langkah & callout ikut terindeks: pencarian tutorial justru paling
        // sering menyasar teks di dalam langkah ("tombol Tambah Petani"), bukan judul.
        case "callout":
          return inlineText(b.inline);
        case "list":
          return b.items.map(inlineText).join(" ");
        case "steps":
          return b.items
            .map((it) => inlineText(it.inline) + (it.detail ? " " + inlineText(it.detail) : ""))
            .join(" ");
        case "definition":
          return `${b.term} ${inlineText(b.desc)}`;
        case "media":
          return b.caption;
      }
    })
    .join(" ");
}
