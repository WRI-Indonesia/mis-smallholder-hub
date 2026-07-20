import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requirePermission } from "@/lib/rbac";
import {
  HELP_CHAPTERS,
  buildHelpNav,
  buildHelpSearchIndex,
  topicNumber,
} from "@/lib/help-content";
import { HelpSidebar } from "./help-sidebar";

// Indeks Bantuan (#184): daftar bab + pencarian. Materi tiap bab ada di
// sub-halaman `/admin/help/[chapter]`.

export default async function HelpIndexPage() {
  await requirePermission("help");

  const totalTopics = HELP_CHAPTERS.reduce((n, c) => n + c.topics.length, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bantuan</h1>
        <p className="text-muted-foreground">
          Panduan penggunaan Smallholder HUB MIS — {HELP_CHAPTERS.length} bab, {totalTopics} topik.
          Pilih bab di bawah atau gunakan pencarian.
        </p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
        <HelpSidebar nav={buildHelpNav()} searchIndex={buildHelpSearchIndex()} />

        <div className="grid gap-4 sm:grid-cols-2 min-w-0">
          {HELP_CHAPTERS.map((chapter, ci) => (
            <Link
              key={chapter.slug}
              href={`/admin/help/${chapter.slug}`}
              className="group rounded-lg border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-md bg-emerald-50 p-2 text-emerald-700">
                  <chapter.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold">
                    Bab {ci + 1} — {chapter.title}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">{chapter.summary}</p>
                  <ul className="mt-3 space-y-1">
                    {chapter.topics.map((topic, ti) => (
                      <li key={topic.id} className="text-sm text-muted-foreground">
                        {topicNumber(ci, ti)} {topic.title}
                      </li>
                    ))}
                  </ul>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Buka bab
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
