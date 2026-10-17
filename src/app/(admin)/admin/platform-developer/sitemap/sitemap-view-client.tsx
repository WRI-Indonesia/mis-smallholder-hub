"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { cn } from "@/lib/utils";
import { SITEMAP_CLASS_STYLE, type SitemapDoc, type SitemapFileKey, type SitemapSection } from "@/lib/sitemap-mermaid";
import { MermaidDiagram } from "./mermaid-diagram";

/** Kanvas React Flow hanya dimuat saat tab-nya dibuka (pola Peta Data & Skema). */
const SitemapFlow = dynamic(() => import("./sitemap-flow").then((m) => m.SitemapFlow), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] items-center justify-center rounded-lg border text-sm text-muted-foreground">
      Menyiapkan kanvas…
    </div>
  ),
});

const VIEWS = ["mermaid", "flow"] as const;
type View = (typeof VIEWS)[number];

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
 * per menu dengan dua mesin gambar atas sumber yang sama — tab **Mermaid**
 * (render teks blok apa adanya, identik dengan GitHub/Miro) dan tab
 * **React Flow** (graf hasil parser subset, bisa digeser & di-zoom). Pilihan
 * berkas & tab ada di URL (`?menu=`, `?view=`) supaya bisa dibagikan.
 */
export function SitemapViewClient({ docs }: { docs: SitemapDoc[] }) {
  const { get, setMany } = useUrlFilters();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const menuParam = get("menu");
  const doc = docs.find((d) => d.key === menuParam) ?? docs[0];
  const viewParam = get("view");
  const view: View = (VIEWS as readonly string[]).includes(viewParam ?? "") ? (viewParam as View) : "mermaid";
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onValueChange={(v) => setMany({ view: v === "mermaid" ? null : v })}>
          <TabsList>
            <TabsTrigger value="mermaid">Mermaid</TabsTrigger>
            <TabsTrigger value="flow">React Flow</TabsTrigger>
          </TabsList>
        </Tabs>
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

function SectionCard({ section, view, dark }: { section: SitemapSection; view: View; dark: boolean }) {
  return (
    <Card id={section.slug} className="scroll-mt-20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{section.heading}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {view === "mermaid" ? (
          <MermaidDiagram source={section.mermaid!} />
        ) : section.graph ? (
          <SitemapFlow graph={section.graph} dark={dark} />
        ) : (
          <p className="text-sm text-destructive">Diagram ini belum bisa dibaca parser React Flow — lihat tab Mermaid.</p>
        )}

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
