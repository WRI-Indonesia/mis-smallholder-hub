import { Lightbulb, Info, AlertTriangle } from "lucide-react";
import { embedUrl, type MdBlock, type MdCalloutTone, type MdInline } from "@/lib/markdown-lite";

/**
 * Gaya teks tingkat Detail — lebih ringan daripada teks utama.
 *
 * `font-light` = bobot **300** yang sungguhan: `acumin-pro-condensed-light.woff2`
 * terdaftar di `globals.css`. (Tanpa berkas itu, `font-light` tak berefek —
 * browser mensintesis huruf tebal, tetapi tidak pernah mensintesis yang tipis.)
 *
 * Kontras warna sengaja tidak diturunkan lebih jauh: pembaca lapangan sering
 * memakai layar silau, dan justru bagian Detail yang paling perlu terbaca.
 */
const DETAIL_TEXT = "text-[0.8125rem] font-light leading-relaxed text-muted-foreground";

/** Warna & ikon per nada callout. Label dipakai screen reader. */
const CALLOUT_TONES: Record<
  MdCalloutTone,
  { icon: React.ComponentType<{ className?: string }>; className: string; label: string }
> = {
  tip: {
    icon: Lightbulb,
    className:
      "border-emerald-300/70 bg-emerald-50/60 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200",
    label: "Tips",
  },
  penting: {
    icon: Info,
    className:
      "border-sky-300/70 bg-sky-50/60 text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200",
    label: "Penting",
  },
  "hati-hati": {
    icon: AlertTriangle,
    className:
      "border-amber-300/70 bg-amber-50/60 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200",
    label: "Hati-hati",
  },
};

// Render blok Markdown-lite ke elemen React (#184) — tanpa
// `dangerouslySetInnerHTML`, sehingga konten tak pernah jadi HTML mentah.

function Inline({ parts }: { parts: MdInline[] }) {
  return (
    <>
      {parts.map((part, i) => {
        switch (part.type) {
          case "strong":
            return (
              <strong key={i} className="font-medium text-foreground">
                {part.value}
              </strong>
            );
          case "code":
            return (
              <code key={i} className="rounded bg-muted px-1 py-0.5 text-[0.85em] font-mono">
                {part.value}
              </code>
            );
          case "link":
            return (
              <a
                key={i}
                href={part.href}
                className="text-primary underline underline-offset-2"
                target={part.href.startsWith("http") ? "_blank" : undefined}
                rel={part.href.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                {part.value}
              </a>
            );
          default:
            return <span key={i}>{part.value}</span>;
        }
      })}
    </>
  );
}

export function HelpBlocks({ blocks }: { blocks: MdBlock[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            return (
              <h4 key={i} className="pt-2 text-sm font-semibold">
                <Inline parts={block.inline} />
              </h4>
            );
          case "paragraph":
            return (
              <p
                key={i}
                // `data-detail` disembunyikan/ditampilkan oleh toggle Ringkas–Detail
                // di halaman topik — CSS murni, tanpa JavaScript.
                data-detail={block.detail ? "" : undefined}
                className={
                  block.detail
                    ? `${DETAIL_TEXT} border-l-2 border-border/60 pl-3`
                    : "text-sm text-muted-foreground"
                }
              >
                <Inline parts={block.inline} />
              </p>
            );
          case "list":
            return (
              <ul key={i} className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {block.items.map((item, j) => (
                  <li key={j}>
                    <Inline parts={item} />
                  </li>
                ))}
              </ul>
            );
          case "steps":
            // Nomor dari posisi, bukan dari angka di berkas — menyisipkan langkah
            // di tengah tidak menuntut penomoran ulang seluruh materi.
            return (
              <ol key={i} className="space-y-3">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary tabular-nums"
                    >
                      {j + 1}
                    </span>
                    <div className="pt-0.5 text-sm">
                      <Inline parts={item.inline} />
                      {item.detail && (
                        <p data-detail className={`mt-1.5 ${DETAIL_TEXT}`}>
                          <Inline parts={item.detail} />
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            );
          case "callout": {
            const tone = CALLOUT_TONES[block.tone];
            const Icon = tone.icon;
            return (
              <div key={i} className={`flex gap-2.5 rounded-lg border p-3 ${tone.className}`}>
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-sm">
                  <span className="sr-only">{tone.label}: </span>
                  <Inline parts={block.inline} />
                </p>
              </div>
            );
          }
          case "definition":
            return (
              <div key={i} className="grid gap-1 sm:grid-cols-[220px_1fr] sm:gap-4">
                <div className="text-sm font-medium">{block.term}</div>
                <div className="text-sm text-muted-foreground">
                  <Inline parts={block.desc} />
                </div>
              </div>
            );
          case "media":
            // Gambar/video panduan (#184): berkas dari `public/help/`, atau
            // embed YouTube/Vimeo. `<img>` biasa (bukan next/image) karena
            // ukuran aset panduan tak diketahui di build time.
            return (
              <figure key={i} className="space-y-1.5">
                {block.kind === "image" && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={block.src}
                    alt={block.caption}
                    loading="lazy"
                    className="w-full max-w-3xl rounded-md border bg-muted"
                  />
                )}
                {block.kind === "video" && (
                  <video
                    src={block.src}
                    controls
                    preload="metadata"
                    className="w-full max-w-3xl rounded-md border bg-black"
                  />
                )}
                {block.kind === "embed" && (
                  <div className="aspect-video w-full max-w-3xl overflow-hidden rounded-md border">
                    <iframe
                      src={embedUrl(block.src)}
                      title={block.caption || "Video panduan"}
                      loading="lazy"
                      allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                    />
                  </div>
                )}
                {block.caption && (
                  <figcaption className="text-xs text-muted-foreground">{block.caption}</figcaption>
                )}
              </figure>
            );
        }
      })}
    </div>
  );
}
