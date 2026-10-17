"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SITEMAP_CLASS_STYLE, primaryClass, type SitemapEdge, type SitemapGraph } from "@/lib/sitemap-mermaid";
import { buildSpanningForest, type SitemapTreeNode } from "@/lib/sitemap-layout";

const KIND_WORD: Record<SitemapEdge["kind"], string> = { solid: "berisi", dotted: "pindah ke", thick: "alur data ke" };

function matches(t: SitemapTreeNode, q: string): boolean {
  return t.node.lines.some((l) => l.toLowerCase().includes(q)) || t.children.some((c) => matches(c, q));
}

/**
 * Tab Daftar: hutan rentang sebagai daftar bertingkat `<details>` yang bisa
 * dilipat dan dicari — tanpa grafik, paling terbaca di layar sempit dan
 * untuk menyalin teks. Rujukan silang ditulis sebagai baris "→ label → tujuan"
 * di bawah simpul asalnya.
 */
export function SitemapOutline({ graph }: { graph: SitemapGraph }) {
  const [q, setQ] = useState("");
  const forest = useMemo(() => buildSpanningForest(graph), [graph]);
  const labelOf = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n.lines[0]])), [graph]);
  const crossBySource = useMemo(() => {
    const m = new Map<string, SitemapEdge[]>();
    for (const e of forest.crossEdges) {
      if (!m.has(e.source)) m.set(e.source, []);
      m.get(e.source)!.push(e);
    }
    return m;
  }, [forest]);
  const query = q.trim().toLowerCase();

  const renderNode = (t: SitemapTreeNode, depth: number): React.ReactNode => {
    if (query && !matches(t, query)) return null;
    const cls = primaryClass(t.node);
    const s = SITEMAP_CLASS_STYLE[cls] ?? SITEMAP_CLASS_STYLE.content;
    const dashed = t.node.classes.includes("proto") || t.node.classes.includes("planned");
    const cross = crossBySource.get(t.node.id) ?? [];
    const head = (
      <span className="inline-flex min-w-0 items-start gap-2">
        <span className={cn("mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-sm border", dashed && "border-dashed")} style={{ background: s.fill, borderColor: s.stroke }} aria-hidden />
        <span className={cn("min-w-0", (cls === "menu" || cls === "page") && "font-semibold")}>
          {t.via?.label ? <span className="mr-1 rounded bg-muted px-1 text-[10px] text-muted-foreground">{t.via.label}</span> : null}
          {cls === "content" ? (
            <span className="block whitespace-pre-wrap text-[13px] text-muted-foreground">{t.node.lines.join("\n")}</span>
          ) : (
            <span className="whitespace-pre-wrap">{t.node.lines.join("\n")}</span>
          )}
        </span>
      </span>
    );
    const crossLines = cross.length ? (
      <ul className="ml-5 mt-0.5 space-y-0.5 text-xs text-muted-foreground">
        {cross.map((e) => (
          <li key={e.id}>
            → {e.label ? <span className="rounded bg-muted px-1 text-[10px]">{e.label}</span> : KIND_WORD[e.kind]} <span className="text-foreground">{labelOf.get(e.target)}</span>
          </li>
        ))}
      </ul>
    ) : null;
    if (!t.children.length)
      return (
        <li key={t.node.id} className="py-0.5">
          {head}
          {crossLines}
        </li>
      );
    return (
      <li key={t.node.id} className="py-0.5">
        <details open={depth < 2 || !!query}>
          <summary className="cursor-pointer list-none rounded px-1 hover:bg-muted [&::-webkit-details-marker]:hidden">
            <span className="mr-1 inline-block w-3 text-muted-foreground">▸</span>
            {head}
          </summary>
          {crossLines}
          <ul className="ml-5 border-l pl-3">{t.children.map((c) => renderNode(c, depth + 1))}</ul>
        </details>
      </li>
    );
  };

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3 text-sm">
      <div className="relative max-w-xs">
        <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari di diagram ini…" className="h-8 pl-7 text-sm" aria-label="Cari simpul" />
      </div>
      <ul className="[&_details[open]>summary_span:first-child]:rotate-90 [&_summary_span:first-child]:transition-transform">
        {forest.roots.map((r) => renderNode(r, 0))}
      </ul>
      {query && !forest.roots.some((r) => matches(r, query)) ? <p className="text-xs text-muted-foreground">Tidak ada simpul yang cocok.</p> : null}
    </div>
  );
}
