import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft, FileText, Download, Share2, Clock, User,
  Tag, Calendar, ChevronRight, BookOpen, Wrench, Play
} from "lucide-react"
import { mockModules, KnowledgeType } from "@/lib/static-data/public/knowledge-management"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const mod = mockModules.find((m) => m.id === id)
  if (!mod) return { title: "Konten Tidak Ditemukan" }
  return {
    title: `${mod.title} | Smallholder HUB`,
    description: mod.description,
  }
}

const TYPE_CONFIG: Record<KnowledgeType, { color: string; bg: string; border: string; icon: string }> = {
  "Artikel":              { color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/20",    icon: "📄" },
  "Dokumentasi Kegiatan": { color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", icon: "📋" },
  "Video":                { color: "text-rose-600 dark:text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/20",    icon: "🎥" },
  "Toolkit Training":     { color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-500/10",   border: "border-amber-500/20",   icon: "🛠️" },
}

export default async function KnowledgeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const mod = mockModules.find((m) => m.id === id)
  if (!mod) notFound()

  const cfg = TYPE_CONFIG[mod.type]
  const tagList = mod.tags?.split("|").map(t => t.trim()).filter(Boolean) ?? []
  const relatedModules = mockModules
    .filter(m => m.id !== mod.id && (m.category === mod.category || m.type === mod.type))
    .slice(0, 4)

  const formattedDate = mod.published_date
    ? new Date(mod.published_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : ""

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div className="relative w-full h-[280px] md:h-[380px] bg-muted">
        {mod.type === "Video" && mod.videoUrl ? (
          <iframe
            className="w-full h-full"
            src={mod.videoUrl}
            title={mod.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <Image
              src={mod.thumbnail}
              alt={mod.title}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />
          </>
        )}

        {/* Back button */}
        <div className="absolute top-6 left-6 z-10">
          <Link href="/knowledge-management" className="inline-flex items-center gap-2 text-white/90 hover:text-white bg-black/30 backdrop-blur-md px-4 py-2 rounded-full text-sm font-semibold border border-white/20 transition-colors hover:bg-black/50">
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Katalog
          </Link>
        </div>

        {/* Bottom content (for non-video) */}
        {mod.type !== "Video" && (
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <div className="max-w-3xl">
              <div className={`inline-flex items-center gap-2 px-3 py-1 ${cfg.bg} ${cfg.border} border rounded-full text-xs font-bold uppercase tracking-wider ${cfg.color} mb-4`}>
                <span>{cfg.icon}</span> {mod.type}
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-white leading-tight drop-shadow-lg mb-3">
                {mod.title}
              </h1>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* ── LEFT: Article Content ── */}
          <article className="flex-1 min-w-0 space-y-8">

            {/* Meta info bar */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pb-6 border-b border-border">
              {mod.author && (
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary/70" />
                  <span className="font-semibold text-foreground">{mod.author}</span>
                </div>
              )}
              {formattedDate && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-primary/70" />
                  {formattedDate}
                </div>
              )}
              {mod.read_time_min > 0 && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary/70" />
                  {mod.read_time_min} menit baca
                </div>
              )}
              <div className={`ml-auto flex items-center gap-1.5 px-3 py-1 ${cfg.bg} ${cfg.border} border rounded-full text-xs font-bold ${cfg.color} uppercase tracking-wider`}>
                {mod.category}
              </div>
            </div>

            {/* Video title (appears above for video type) */}
            {mod.type === "Video" && (
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground leading-tight">
                  {mod.title}
                </h1>
                <p className="mt-3 text-lg text-muted-foreground">{mod.description}</p>
              </div>
            )}

            {/* Description highlight */}
            {mod.type !== "Video" && (
              <div className="bg-primary/5 border-l-4 border-primary rounded-r-xl p-5">
                <p className="text-foreground/80 text-[16px] leading-relaxed font-medium italic">
                  {mod.description}
                </p>
              </div>
            )}

            {/* Main content */}
            {mod.content && (
              <div className="prose prose-green dark:prose-invert max-w-none prose-p:text-foreground/80 prose-p:leading-relaxed prose-headings:text-foreground">
                <h2>Materi Utama</h2>
                <p>{mod.content}</p>
              </div>
            )}

            {/* Tags */}
            {tagList.length > 0 && (
              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                  {tagList.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-muted/70 text-muted-foreground text-xs font-semibold rounded-full border border-border/60">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Download CTA */}
            {mod.type !== "Video" && (
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-6 rounded-2xl border border-border/80 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Unduh Dokumen Lengkap</p>
                    <p className="text-sm text-muted-foreground">Format PDF · Tersedia gratis</p>
                  </div>
                </div>
                <div className="flex w-full sm:w-auto gap-3">
                  <Button variant="outline" className="w-full sm:w-auto font-semibold gap-2">
                    <Share2 className="w-4 h-4" />
                    Bagikan
                  </Button>
                  <Button className="w-full sm:w-auto font-semibold gap-2 shadow-sm">
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </article>

          {/* ── RIGHT: Sidebar ── */}
          <aside className="w-full lg:w-[300px] xl:w-[320px] shrink-0 space-y-6">

            {/* Info Card */}
            <Card className="border-border/70 shadow-sm bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Info Konten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Tipe</span>
                  <span className={`font-semibold ${cfg.color}`}>{mod.type}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Kategori</span>
                  <span className="font-semibold text-foreground">{mod.category}</span>
                </div>
                {mod.author && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Penulis</span>
                    <span className="font-semibold text-foreground text-right max-w-[160px]">{mod.author}</span>
                  </div>
                )}
                {formattedDate && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Diterbitkan</span>
                    <span className="font-semibold text-foreground">{formattedDate}</span>
                  </div>
                )}
                {mod.read_time_min > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Durasi Baca</span>
                    <span className="font-semibold text-foreground">{mod.read_time_min} menit</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Related Content */}
            {relatedModules.length > 0 && (
              <Card className="border-border/70 shadow-sm bg-card overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Konten Terkait</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {relatedModules.map(related => {
                      const relCfg = TYPE_CONFIG[related.type]
                      return (
                        <Link key={related.id} href={`/knowledge-management/${related.id}`}
                          className="flex items-start gap-3 p-4 hover:bg-muted/40 transition-colors group">
                          <div className="w-12 h-12 rounded-xl bg-muted relative overflow-hidden shrink-0">
                            <Image
                              src={related.thumbnail}
                              alt={related.title}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={`text-[10px] font-bold uppercase tracking-wider ${relCfg.color} mb-1`}>
                              {related.type}
                            </div>
                            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                              {related.title}
                            </p>
                            {related.read_time_min > 0 && (
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                                <Clock className="w-3 h-3" />
                                {related.read_time_min} mnt
                              </div>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary mt-1 shrink-0 transition-colors" />
                        </Link>
                      )
                    })}
                  </div>
                  <div className="p-4 border-t border-border/50">
                    <Link href="/knowledge-management" className="text-sm font-semibold text-primary flex items-center justify-center gap-1 hover:underline">
                      Lihat semua konten <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
