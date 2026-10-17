"use client";

import { useEffect, useId, useState } from "react";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";

type State = { status: "loading" } | { status: "ok"; svg: string } | { status: "error"; message: string };

/**
 * Merender satu blok Mermaid di klien. Pustaka `mermaid` (±1 MB) dimuat
 * dinamis hanya saat tab Mermaid dibuka — halaman lain tidak terbebani.
 * SVG hasil render berasal dari teks `docs/product/sitemap/*.md` milik repo
 * sendiri (bukan input pengguna) dan dirender dengan `securityLevel: "strict"`.
 */
export function MermaidDiagram({ source }: { source: string }) {
  const reactId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: dark ? "dark" : "base",
          fontFamily: "inherit",
          flowchart: { htmlLabels: true, wrappingWidth: 420, curve: "basis" },
        });
        const { svg } = await mermaid.render(`sitemap-${reactId}`, source);
        if (!cancelled) setState({ status: "ok", svg });
      } catch (err) {
        if (!cancelled) setState({ status: "error", message: err instanceof Error ? err.message : String(err) });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, dark, reactId]);

  if (state.status === "loading")
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Merender diagram…
      </div>
    );
  if (state.status === "error")
    return (
      <div className="space-y-2 text-sm">
        <p className="text-destructive">Diagram tidak dapat dirender: {state.message}</p>
        <pre className="overflow-auto rounded-md bg-muted p-3 text-xs">{source}</pre>
      </div>
    );
  return (
    <div
      className="overflow-auto [&_svg]:h-auto [&_svg]:max-w-none"
      // SVG dari pustaka mermaid atas teks repo sendiri (lihat catatan komponen).
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  );
}
