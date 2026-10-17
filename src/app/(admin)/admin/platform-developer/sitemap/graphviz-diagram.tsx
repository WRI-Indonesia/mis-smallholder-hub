"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { SitemapGraph } from "@/lib/sitemap-mermaid";
import { toDot } from "@/lib/sitemap-layout";

type State = { status: "loading" } | { status: "ok"; svg: string } | { status: "error"; message: string };

let vizPromise: Promise<import("@viz-js/viz").Viz> | null = null;
/** Satu instans WASM Graphviz (±3 MB, dimuat sekali per sesi saat tab dibuka). */
function getViz() {
  vizPromise ??= import("@viz-js/viz").then((m) => m.instance());
  return vizPromise;
}

/**
 * Tab Graphviz: graf parser → DOT (`toDot`) → SVG oleh Graphviz `dot` (WASM,
 * pustaka `@viz-js/viz`). Mesin tata letak berlapis klasik dengan rute spline
 * yang melingkari node — pembanding "standar emas" untuk dagre/ELK.
 */
export function GraphvizDiagram({ graph }: { graph: SitemapGraph }) {
  // Hasil dikunci ke graf asalnya: graf baru → otomatis "loading" tanpa setState di badan efek.
  const [done, setDone] = useState<{ graph: SitemapGraph; state: State } | null>(null);
  const state: State = done && done.graph === graph ? done.state : { status: "loading" };
  useEffect(() => {
    let cancelled = false;
    getViz()
      .then((viz) => {
        if (cancelled) return;
        const svg = viz.renderString(toDot(graph), { format: "svg" });
        setDone({ graph, state: { status: "ok", svg } });
      })
      .catch((err: unknown) => {
        if (!cancelled) setDone({ graph, state: { status: "error", message: err instanceof Error ? err.message : String(err) } });
      });
    return () => {
      cancelled = true;
    };
  }, [graph]);

  if (state.status === "loading")
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Merender Graphviz…
      </div>
    );
  if (state.status === "error") return <p className="text-sm text-destructive">Graphviz gagal: {state.message}</p>;
  return (
    <div
      className="overflow-auto [&_svg]:h-auto [&_svg]:max-w-none"
      // SVG keluaran Graphviz dari DOT yang dibangun dari teks repo sendiri (bukan input pengguna).
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  );
}
