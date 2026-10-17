"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { cn } from "@/lib/utils";
import { SITEMAP_CLASS_STYLE, type SitemapDoc, type SitemapFileKey, type SitemapSection } from "@/lib/sitemap-mermaid";
import { MermaidDiagram } from "./mermaid-diagram";

/** Semua kanvas/mesin selain Mermaid dimuat saat tab-nya dibuka (pola Peta Data & Skema). */
function lazy<T extends object>(loader: () => Promise<T>, pick: (m: T) => React.ComponentType<never>) {
  return dynamic(() => loader().then((m) => pick(m) as React.ComponentType<Record<string, unknown>>), {
    ssr: false,
    loading: () => (
      <div className="flex h-[320px] items-center justify-center rounded-lg border text-sm text-muted-foreground">Menyiapkan kanvas…</div>
    ),
  });
}
const GraphvizDiagram = lazy(() => import("./graphviz-diagram"), (m) => m.GraphvizDiagram);
const SitemapFlow = lazy(() => import("./sitemap-flow"), (m) => m.SitemapFlow);
const SitemapFlowElk = lazy(() => import("./sitemap-flow-elk"), (m) => m.SitemapFlowElk);
const SitemapColumns = lazy(() => import("./sitemap-columns"), (m) => m.SitemapColumns);
const SitemapNetwork = lazy(() => import("./sitemap-network"), (m) => m.SitemapNetwork);
const SitemapTree = lazy(() => import("./sitemap-tree"), (m) => m.SitemapTree);
const SitemapMindmap = lazy(() => import("./sitemap-mindmap"), (m) => m.SitemapMindmap);
const SitemapSunburst = lazy(() => import("./sitemap-sunburst"), (m) => m.SitemapSunburst);
const SitemapOutline = lazy(() => import("./sitemap-outline"), (m) => m.SitemapOutline);

/**
 * Dua belas tampilan atas sumber yang sama (owner 2026-10-17, tanya bertahap:
 * "semua 1–10" + perbaiki React Flow dagre; pemilih tab berkelompok; bawaan
 * Mermaid). Kunci `view` dipakai di URL (`?view=`); `flow` dipertahankan
 * untuk tautan lama.
 */
export const SITEMAP_VIEWS = [
  { key: "mermaid", group: "Teks", label: "Mermaid", description: "Teks blok dirender apa adanya — identik dengan GitHub dan Miro." },
  { key: "mermaid-elk", group: "Teks", label: "Mermaid ELK", description: "Teks yang sama dengan tata letak ELK: garis ortogonal, lebih rapi untuk graf lebar." },
  { key: "sketch", group: "Teks", label: "Sketsa", description: "Mermaid gaya coretan tangan (rough.js) — enak untuk tangkapan layar video." },
  { key: "graphviz", group: "Teks", label: "Graphviz", description: "Mesin dot Graphviz (WASM): spline melingkari node, pembanding klasik." },
  { key: "flow", group: "Interaktif", label: "React Flow", description: "Kanvas interaktif, tata letak dagre; rute garis mengikuti titik dagre, label diberi ruang." },
  { key: "flow-elk", group: "Interaktif", label: "React Flow ELK", description: "Kanvas interaktif dengan ELK: garis siku terpisah jarak, tidak menembus node." },
  { key: "columns", group: "Interaktif", label: "Kolom", description: "Kolom tetap per jenis (Menu · Sub menu · Halaman · Bagian · Isi …); tingkat terbaca dari posisi." },
  { key: "network", group: "Interaktif", label: "Jaringan", description: "Gaya pegas fCoSE (cytoscape): menonjolkan kerapatan hubungan, bukan urutan." },
  { key: "tree", group: "Hierarki", label: "Pohon", description: "Tidy tree kiri → kanan, satu baris per simpul, bisa dilipat; rujukan silang oranye." },
  { key: "mindmap", group: "Hierarki", label: "Peta pikiran", description: "Mind map (markmap) yang bisa dilipat per cabang; warna cabang = jenis node." },
  { key: "sunburst", group: "Hierarki", label: "Sunburst", description: "Cincin konsentris: tiap cincin satu tingkat, lebar irisan = jumlah daun." },
  { key: "outline", group: "Hierarki", label: "Daftar", description: "Daftar bertingkat yang bisa dilipat dan dicari — tanpa grafik, ramah ponsel." },
] as const;
export type SitemapViewKey = (typeof SITEMAP_VIEWS)[number]["key"];
const VIEW_GROUPS = ["Teks", "Interaktif", "Hierarki"] as const;
const DEFAULT_VIEW: SitemapViewKey = "mermaid";

const LEGEND: { cls: string; label: string }[] = [
  { cls: "menu", label: "Menu" },
  { cls: "sub", label: "Sub menu" },
  { cls: "page", label: "Halaman" },
  { cls: "section", label: "Bagian" },
  { cls: "content", label: "Isi" },
  { cls: "dialog", label: "Dialog" },
  { cls: "decision", label: "Percabangan" },
  { cls: "data", label: "Data/berkas" },
  { cls: "external", label: "Layanan luar" },
];

/**
 * Peta Fitur (owner 2026-10-17): berkas `docs/product/sitemap/*.md` ditampilkan
 * per menu dengan dua belas tampilan atas sumber yang sama — empat berbasis
 * teks/SVG, empat kanvas interaktif, empat hierarki. Pilihan berkas & tampilan
 * ada di URL (`?menu=`, `?view=`) supaya bisa dibagikan.
 */
export function SitemapViewClient({ docs }: { docs: SitemapDoc[] }) {
  const { get, setMany } = useUrlFilters();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const menuParam = get("menu");
  const doc = docs.find((d) => d.key === menuParam) ?? docs[0];
  const viewParam = get("view");
  const view: SitemapViewKey = SITEMAP_VIEWS.some((v) => v.key === viewParam) ? (viewParam as SitemapViewKey) : DEFAULT_VIEW;
  const viewDef = SITEMAP_VIEWS.find((v) => v.key === view)!;
  const diagramSections = doc.sections.filter((s) => s.mermaid !== null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {docs.map((d) => (
          <Button
            key={d.key}
            size="sm"
            variant={d.key === doc.key ? "default" : "outline"}
            onClick={() => setMany({ menu: d.key === docs[0].key ? null : (d.key as SitemapFileKey) })}
          >
            {d.title}
          </Button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-start gap-x-4 gap-y-2" role="tablist" aria-label="Tampilan diagram">
          {VIEW_GROUPS.map((group) => (
            <div key={group} className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{group}</span>
              <div className="flex flex-wrap items-center gap-0.5 rounded-md border bg-muted/40 p-0.5">
                {SITEMAP_VIEWS.filter((v) => v.group === group).map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    role="tab"
                    aria-selected={v.key === view}
                    title={v.description}
                    onClick={() => setMany({ view: v.key === DEFAULT_VIEW ? null : v.key })}
                    className={cn(
                      "rounded px-2 py-1 text-xs transition-colors",
                      v.key === view ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{viewDef.label}:</span> {viewDef.description}
          </p>
          <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="Legenda warna">
            {LEGEND.map((l) => {
              const s = SITEMAP_CLASS_STYLE[l.cls];
              return (
                <li key={l.cls} className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-sm border" style={{ background: s.fill, borderColor: s.stroke }} aria-hidden />
                  {l.label}
                </li>
              );
            })}
            <li className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm border border-dashed border-muted-foreground" aria-hidden />
              prototipe / direncanakan
            </li>
          </ul>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{doc.summary}</p>

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="hidden xl:block" aria-label="Daftar isi">
          <ol className="sticky top-20 space-y-1 text-sm">
            {diagramSections.map((s) => (
              <li key={s.slug}>
                <a href={`#${s.slug}`} className="block truncate rounded px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 space-y-6">
          {diagramSections.map((s) => (
            <SectionCard key={`${doc.key}-${s.slug}`} section={s} view={view} dark={dark} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Diagram({ section, view, dark }: { section: SitemapSection; view: SitemapViewKey; dark: boolean }) {
  if (view === "mermaid") return <MermaidDiagram source={section.mermaid!} />;
  if (view === "mermaid-elk") return <MermaidDiagram source={section.mermaid!} variant="elk" />;
  if (view === "sketch") return <MermaidDiagram source={section.mermaid!} variant="sketch" />;
  const graph = section.graph;
  if (!graph) return <p className="text-sm text-destructive">Diagram ini belum bisa dibaca parser graf — lihat tab Mermaid.</p>;
  switch (view) {
    case "graphviz":
      return <GraphvizDiagram graph={graph} />;
    case "flow":
      return <SitemapFlow graph={graph} dark={dark} />;
    case "flow-elk":
      return <SitemapFlowElk graph={graph} dark={dark} />;
    case "columns":
      return <SitemapColumns graph={graph} dark={dark} />;
    case "network":
      return <SitemapNetwork graph={graph} dark={dark} />;
    case "tree":
      return <SitemapTree graph={graph} title={section.heading} />;
    case "mindmap":
      return <SitemapMindmap graph={graph} title={section.heading} />;
    case "sunburst":
      return <SitemapSunburst graph={graph} title={section.heading} />;
    case "outline":
      return <SitemapOutline graph={graph} />;
  }
}

function SectionCard({ section, view, dark }: { section: SitemapSection; view: SitemapViewKey; dark: boolean }) {
  return (
    <Card id={section.slug} className="scroll-mt-20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{section.heading}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Diagram section={section} view={view} dark={dark} />

        {section.table ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  {section.table.header.map((h) => (
                    <th key={h} className="py-1.5 pr-4 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.table.rows.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    {row.map((cell, j) => (
                      <td key={j} className={cn("py-1.5 pr-4 align-top", j === 1 && "font-mono text-xs")}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {section.notes.length ? (
          <div className="space-y-1 text-sm text-muted-foreground">
            {section.notes.map((n, i) => (
              <p key={i}>{n}</p>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
