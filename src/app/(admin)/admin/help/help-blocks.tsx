import { embedUrl, type MdBlock, type MdInline } from "@/lib/markdown-lite";

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
              <p key={i} className="text-sm text-muted-foreground">
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
