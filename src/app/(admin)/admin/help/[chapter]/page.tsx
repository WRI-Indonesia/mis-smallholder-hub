import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requirePermission } from "@/lib/rbac";
import {
  HELP_CHAPTERS,
  getHelpChapter,
  buildHelpNav,
  buildHelpSearchIndex,
  topicNumber,
} from "@/lib/help-content";
import { HelpSidebar } from "../help-sidebar";
import { HelpLayout } from "../help-layout";

// Ikhtisar satu bab (#184): daftar topik sebagai kartu — materi lengkap ada di
// halaman topik `/admin/help/[chapter]/[topic]`.

export function generateStaticParams() {
  return HELP_CHAPTERS.map((c) => ({ chapter: c.slug }));
}

export default async function HelpChapterPage({
  params,
}: {
  params: Promise<{ chapter: string }>;
}) {
  await requirePermission("help");

  const { chapter: slug } = await params;
  const chapter = getHelpChapter(slug);
  if (!chapter) notFound();

  const index = HELP_CHAPTERS.findIndex((c) => c.slug === slug);
  const prev = index > 0 ? HELP_CHAPTERS[index - 1] : null;
  const next = index < HELP_CHAPTERS.length - 1 ? HELP_CHAPTERS[index + 1] : null;

  return (
    // Header ikut kolom konten agar posisi sidebar konsisten antar halaman.
    <HelpLayout
      sidebar={
        <HelpSidebar
          nav={buildHelpNav()}
          searchIndex={buildHelpSearchIndex()}
          activeChapter={chapter.slug}
        />
      }
    >
      <>
        <div>
          <Link href="/admin/help" className="text-sm text-muted-foreground hover:underline">
            ← Bantuan
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold">
            <chapter.icon className="h-6 w-6 shrink-0 text-primary" />
            Bab {index + 1} — {chapter.title}
          </h1>
          <p className="text-muted-foreground">{chapter.summary}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {chapter.topics.map((topic, ti) => (
            <Link
              key={topic.id}
              href={`/admin/help/${chapter.slug}/${topic.id}`}
              className="group rounded-lg border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <div className="flex items-start gap-3">
                <topic.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <h2 className="font-semibold">
                    {topicNumber(index, ti)} {topic.title}
                  </h2>
                  {topic.intro && (
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{topic.intro}</p>
                  )}
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Baca topik
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Navigasi antar bab */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          {prev ? (
            <Link
              href={`/admin/help/${prev.slug}`}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-accent"
            >
              <ChevronLeft className="h-4 w-4" />
              Bab {index} — {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/admin/help/${next.slug}`}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm hover:bg-accent"
            >
              Bab {index + 2} — {next.title}
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </>
    </HelpLayout>
  );
}
