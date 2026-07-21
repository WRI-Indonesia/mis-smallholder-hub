import Link from "next/link";
import { ChevronRight, Clock, Lock } from "lucide-react";
import { auth } from "@/lib/auth";
import { getAccessibleMenuKeys, requirePermission } from "@/lib/rbac";
import {
  HELP_CHAPTERS,
  buildHelpNav,
  buildHelpSearchIndex,
  helpChaptersBySection,
  isTopicAccessible,
  topicNumber,
} from "@/lib/help-content";
import { HelpSidebar } from "./help-sidebar";
import { HelpLayout } from "./help-layout";

// Indeks Bantuan. Tiga lapis: **tutorial** (per tugas) sebagai pintu masuk,
// lalu **konsep** (istilah & aturan main) sebagai rujukan. Materi tiap bab ada
// di sub-halaman `/admin/help/[chapter]`.

export default async function HelpIndexPage() {
  await requirePermission("help");

  // Tutorial ditandai (bukan disembunyikan) bila menunya di luar hak akses
  // pembaca — panduan tetap berguna saat pelatihan lintas peran.
  const session = await auth();
  const role = session?.user?.role ?? "";
  const accessibleMenuKeys =
    role === "SUPERADMIN" ? null : await getAccessibleMenuKeys(role, session?.user?.id);

  const tutorialChapters = helpChaptersBySection("tutorial");
  const konsepChapters = helpChaptersBySection("konsep");

  return (
    // Header ikut kolom konten agar posisi sidebar konsisten antar halaman.
    <HelpLayout sidebar={<HelpSidebar nav={buildHelpNav()} searchIndex={buildHelpSearchIndex()} />}>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Bantuan</h1>
          <p className="text-muted-foreground">
            Panduan penggunaan Smallholder HUB MIS. Mulai dari tugas yang ingin Anda kerjakan, atau
            gunakan pencarian di samping.
          </p>
        </div>

        {tutorialChapters.length > 0 && (
          <section className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Apa yang ingin Anda lakukan?</h2>
              <p className="text-sm text-muted-foreground">
                Panduan langkah demi langkah untuk pekerjaan sehari-hari.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {tutorialChapters.flatMap((chapter) =>
                chapter.topics.map((topic) => {
                  const locked =
                    accessibleMenuKeys != null && !isTopicAccessible(topic, accessibleMenuKeys);
                  return (
                    <Link
                      key={`${chapter.slug}-${topic.id}`}
                      href={`/admin/help/${chapter.slug}/${topic.id}`}
                      className="group flex gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
                    >
                      <div className="mt-0.5 rounded-md bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <topic.icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium leading-tight">{topic.title}</h3>
                        {topic.goal && (
                          <p className="mt-1 text-sm text-muted-foreground">{topic.goal}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {topic.duration != null && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />± {topic.duration} menit
                            </span>
                          )}
                          {locked && (
                            <span className="inline-flex items-center gap-1 text-amber-600">
                              <Lock className="h-3 w-3" />
                              Di luar hak akses akun Anda
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  );
                }),
              )}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Konsep &amp; istilah</h2>
            <p className="text-sm text-muted-foreground">
              Aturan main sistem yang dirujuk tutorial — istilah, hak akses, dan gambaran tiap
              modul.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {konsepChapters.map((chapter) => {
              // Nomor bab mengikuti posisi di HELP_CHAPTERS agar konsisten
              // dengan penomoran di sidebar dan halaman bab.
              const ci = HELP_CHAPTERS.findIndex((c) => c.slug === chapter.slug);
              return (
                <Link
                  key={chapter.slug}
                  href={`/admin/help/${chapter.slug}`}
                  className="group rounded-lg border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-md bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                      <chapter.icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold">{chapter.title}</h3>
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
              );
            })}
          </div>
        </section>
      </div>
    </HelpLayout>
  );
}
