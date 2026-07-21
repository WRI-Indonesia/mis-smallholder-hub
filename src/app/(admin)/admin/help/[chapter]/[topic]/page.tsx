import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, ArrowUpRight, Clock, Target, Lock } from "lucide-react";
import { auth } from "@/lib/auth";
import { getEffectiveMenuPermissions, requirePermission } from "@/lib/rbac";
import {
  getHelpTopic,
  getAdjacentHelpTopics,
  buildHelpNav,
  buildHelpSearchIndex,
} from "@/lib/help-content";
import { isTopicAccessible } from "@/lib/help-access";
import { resolveHelpMedia } from "@/lib/help-media";
import { HelpSidebar } from "../../help-sidebar";
import { HelpBlocks } from "../../help-blocks";
import { HelpLayout } from "../../help-layout";

// Halaman satu topik Bantuan (#184) — tiap topik berdiri sendiri agar muat
// langkah/tutorial detail. Konten dari file Markdown di `src/content/help/`.

export default async function HelpTopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ chapter: string; topic: string }>;
  searchParams: Promise<{ detail?: string }>;
}) {
  await requirePermission("help");

  const { chapter: chapterSlug, topic: topicId } = await params;
  // Dibuka dari hasil pencarian → langsung mode Detail, karena kecocokannya bisa
  // berada di materi yang justru tersembunyi pada mode Ringkas.
  const openDetail = (await searchParams).detail === "1";
  const found = getHelpTopic(chapterSlug, topicId);
  if (!found) notFound();

  const { chapter, chapterIndex, topic, number } = found;
  const { prev, next } = getAdjacentHelpTopics(chapterSlug, topicId);

  // Tutorial di luar hak akses pembaca tetap boleh dibaca, hanya diberi
  // keterangan — supaya tak ada yang mengikuti langkah lalu mencari tombol
  // yang memang tidak akan muncul di layarnya.
  const session = await auth();
  const role = session?.user?.role ?? "";
  const locked =
    topic.menuKey != null &&
    role !== "SUPERADMIN" &&
    !isTopicAccessible(topic, await getEffectiveMenuPermissions(role, session?.user?.id));
  // Media `s3://key` di-presign per-request agar tautannya selalu segar (#185).
  const blocks = await resolveHelpMedia(topic.blocks);

  // Toggle hanya dirender bila topiknya memang punya materi tingkat Detail.
  const hasDetail = blocks.some(
    (b) =>
      (b.type === "paragraph" && b.detail) ||
      (b.type === "steps" && b.items.some((it) => it.detail)),
  );

  return (
    // Header ikut kolom konten (bukan di atas grid) agar posisi sidebar sama di
    // semua halaman Bantuan — panjang judul & ada/tidaknya intro tak menggesernya.
    <HelpLayout
      sidebar={
        <HelpSidebar
          nav={buildHelpNav()}
          searchIndex={buildHelpSearchIndex()}
          activeChapter={chapter.slug}
          activeTopic={topic.id}
        />
      }
    >
      <>
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

        {(topic.goal || topic.href || topic.duration != null) && (
          <div className="rounded-lg border bg-muted/30 p-4">
            {topic.goal && (
              <p className="flex gap-2 text-sm">
                <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>
                  <span className="font-medium">Hasil akhir: </span>
                  {topic.goal}
                </span>
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {topic.href && (
                // Tab baru: panduan tetap terbuka agar bisa diikuti sambil
                // mengerjakan langkahnya di tab sebelah.
                <Link
                  href={topic.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {topic.hrefLabel ?? "Buka halamannya"}
                  <ArrowUpRight className="h-4 w-4" />
                  <span className="sr-only">(terbuka di tab baru)</span>
                </Link>
              )}
              {topic.duration != null && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />± {topic.duration} menit
                </span>
              )}
              {locked && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                  <Lock className="h-3 w-3" />
                  Menu ini di luar hak akses akun Anda
                </span>
              )}
            </div>
          </div>
        )}

        {/* Toggle kedalaman — checkbox tersembunyi + CSS, tanpa JavaScript
              (konsisten dengan sifat statis halaman Bantuan). Mode Ringkas
              menyembunyikan seluruh elemen `data-detail`; sumber tulisannya satu,
              jadi versi ringkas dan rinci tak mungkin saling ketinggalan. */}
        {hasDetail ? (
          <div>
            <input
              type="checkbox"
              id="help-depth"
              aria-label="Kedalaman: Detail"
              defaultChecked={openDetail}
              className="peer sr-only"
            />
            {/* Kelas peer-* HARUS berada di elemen yang bersibling setelah
                  checkbox — Tailwind menghasilkan `:where(.peer):checked ~ *`.
                  Karena itu gaya kedua tombol diatur dari pembungkus ini lewat
                  selektor turunan `[data-opt=...]`, bukan di span-nya langsung. */}
            <div className="mb-3 flex items-center gap-2 peer-checked:[&_[data-opt=detail]]:bg-primary peer-checked:[&_[data-opt=detail]]:font-medium peer-checked:[&_[data-opt=detail]]:text-primary-foreground peer-checked:[&_[data-opt=ringkas]]:bg-transparent peer-checked:[&_[data-opt=ringkas]]:font-normal peer-checked:[&_[data-opt=ringkas]]:text-muted-foreground peer-focus-visible:[&_[data-depth-toggle]]:outline-2 peer-focus-visible:[&_[data-depth-toggle]]:outline-offset-2 peer-focus-visible:[&_[data-depth-toggle]]:outline-primary">
              <span className="text-xs text-muted-foreground">Kedalaman:</span>
              <label
                htmlFor="help-depth"
                data-depth-toggle
                className="inline-flex cursor-pointer overflow-hidden rounded-md border text-xs"
              >
                <span
                  data-opt="ringkas"
                  className="bg-primary px-2.5 py-1 font-medium text-primary-foreground transition-colors"
                >
                  Ringkas
                </span>
                <span
                  data-opt="detail"
                  className="px-2.5 py-1 text-muted-foreground transition-colors"
                >
                  Detail
                </span>
              </label>
            </div>
            <article
              data-depth="ringkas"
              className="rounded-lg border bg-card p-6 [&[data-depth=ringkas]_[data-detail]]:hidden peer-checked:[&[data-depth=ringkas]_[data-detail]]:block"
            >
              <HelpBlocks blocks={blocks} />
            </article>
          </div>
        ) : (
          <article className="rounded-lg border bg-card p-6">
            <HelpBlocks blocks={blocks} />
          </article>
        )}

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
      </>
    </HelpLayout>
  );
}
