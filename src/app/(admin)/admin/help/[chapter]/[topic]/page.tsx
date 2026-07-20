import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requirePermission } from "@/lib/rbac";
import {
  HELP_CHAPTERS,
  getHelpTopic,
  getAdjacentHelpTopics,
  buildHelpNav,
  buildHelpSearchIndex,
} from "@/lib/help-content";
import { HelpSidebar } from "../../help-sidebar";
import { HelpBlocks } from "../../help-blocks";

// Halaman satu topik Bantuan (#184) — tiap topik berdiri sendiri agar muat
// langkah/tutorial detail. Konten dari file Markdown di `src/content/help/`.

export function generateStaticParams() {
  return HELP_CHAPTERS.flatMap((chapter) =>
    chapter.topics.map((topic) => ({ chapter: chapter.slug, topic: topic.id })),
  );
}

export default async function HelpTopicPage({
  params,
}: {
  params: Promise<{ chapter: string; topic: string }>;
}) {
  await requirePermission("help");

  const { chapter: chapterSlug, topic: topicId } = await params;
  const found = getHelpTopic(chapterSlug, topicId);
  if (!found) notFound();

  const { chapter, chapterIndex, topic, number } = found;
  const { prev, next } = getAdjacentHelpTopics(chapterSlug, topicId);

  return (
    <div className="p-6 space-y-6">
      <div>
        <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
          <Link href="/admin/help" className="hover:underline">
            Bantuan
          </Link>
          <span className="mx-1.5">/</span>
          <Link href={`/admin/help/${chapter.slug}`} className="hover:underline">
            Bab {chapterIndex + 1} — {chapter.title}
          </Link>
        </nav>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold">
          <topic.icon className="h-6 w-6 shrink-0 text-primary" />
          {number} {topic.title}
        </h1>
        {topic.intro && <p className="text-muted-foreground mt-1">{topic.intro}</p>}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
        <HelpSidebar
          nav={buildHelpNav()}
          searchIndex={buildHelpSearchIndex()}
          activeChapter={chapter.slug}
          activeTopic={topic.id}
        />

        <div className="min-w-0 space-y-4">
          <article className="rounded-lg border bg-card p-6">
            <HelpBlocks blocks={topic.blocks} />
          </article>

          {/* Navigasi antar topik (menyeberang bab bila perlu) */}
          <div className="flex flex-wrap items-stretch justify-between gap-2">
            {prev ? (
              <Link
                href={`/admin/help/${prev.chapterSlug}/${prev.topicId}`}
                className="inline-flex max-w-[48%] items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
              >
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {prev.number} {prev.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/admin/help/${next.chapterSlug}/${next.topicId}`}
                className="inline-flex max-w-[48%] items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent"
              >
                <span className="truncate">
                  {next.number} {next.title}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Link>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Panduan ini bersifat umum; tampilan menu dapat berbeda mengikuti hak akses Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
