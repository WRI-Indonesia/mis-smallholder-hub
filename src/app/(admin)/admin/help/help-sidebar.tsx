"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import type { HelpNavChapter, HelpSearchEntry } from "@/lib/help-content";

// Navigasi Bantuan (#184): tree bab→topik + pencarian client-side atas indeks
// ringan yang dikirim server. Satu-satunya bagian ber-"use client" di modul
// Bantuan — konten tetap dirender Server Component. Tiap topik = halaman
// sendiri (`/admin/help/[chapter]/[topic]`).

interface Props {
  nav: HelpNavChapter[];
  searchIndex: HelpSearchEntry[];
  /** Slug bab yang sedang dibuka (null di halaman indeks). */
  activeChapter?: string | null;
  /** Id topik yang sedang dibuka (null bila di indeks/ikhtisar bab). */
  activeTopic?: string | null;
}

export function HelpSidebar({ nav, searchIndex, activeChapter = null, activeTopic = null }: Props) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (q.length < 2) return null;
    const terms = q.split(/\s+/).filter(Boolean);
    return searchIndex.filter((entry) => terms.every((t) => entry.haystack.includes(t)));
  }, [q, searchIndex]);

  return (
    <nav
      aria-label="Daftar bab bantuan"
      className="rounded-lg border bg-card p-3 lg:sticky lg:top-6"
    >
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari topik bantuan..."
          className="h-9 pl-8 pr-8"
          aria-label="Cari topik bantuan"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Hapus pencarian"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {results ? (
        <div className="space-y-1">
          <p className="px-1 pb-1 text-xs text-muted-foreground">
            {results.length > 0 ? `${results.length} topik cocok` : "Tidak ada topik yang cocok."}
          </p>
          {results.map((r) => (
            <Link
              key={`${r.chapterSlug}-${r.topicId}`}
              // `?detail=1`: kecocokan bisa berada di materi tingkat Detail yang
              // pada mode Ringkas disembunyikan — membuka hasil pencarian dalam mode
              // Ringkas berarti kata yang dicari tak terlihat, bahkan oleh Ctrl+F.
              href={`/admin/help/${r.chapterSlug}/${r.topicId}?detail=1`}
              className="block rounded-md px-2 py-1.5 hover:bg-accent"
            >
              <span className="block text-sm font-medium">
                {r.number} {r.topicTitle}
              </span>
              <span className="block text-xs text-muted-foreground">{r.chapterTitle}</span>
            </Link>
          ))}
        </div>
      ) : (
        <ul className="space-y-0.5">
          {nav.map((chapter, ci) => {
            const isActiveChapter = chapter.slug === activeChapter;
            return (
              <li key={chapter.slug}>
                <details open={isActiveChapter || activeChapter === null} className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent [&::-webkit-details-marker]:hidden">
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" />
                    <Link
                      href={`/admin/help/${chapter.slug}`}
                      className={cn(
                        "truncate font-medium hover:underline",
                        isActiveChapter && "text-primary",
                      )}
                    >
                      {ci + 1}. {chapter.title}
                    </Link>
                  </summary>
                  <ul className="ml-[1.35rem] space-y-0.5 border-l py-0.5 pl-3">
                    {chapter.topics.map((topic) => {
                      const isActive = isActiveChapter && topic.id === activeTopic;
                      return (
                        <li key={topic.id}>
                          <Link
                            href={`/admin/help/${chapter.slug}/${topic.id}`}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                              "block rounded-md px-2 py-1 text-sm hover:bg-accent hover:text-foreground",
                              isActive
                                ? "bg-accent font-medium text-primary"
                                : "text-muted-foreground",
                            )}
                          >
                            {topic.number} {topic.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
