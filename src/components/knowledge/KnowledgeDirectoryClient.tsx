"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Search, FileText, BookOpen, Video, Wrench, Clock, User, Tag, ChevronRight, Play } from "lucide-react"
import { KnowledgeModule, KnowledgeType } from "@/lib/static-data/public/knowledge-management"

// ── Type config ─────────────────────────────────────────────
const TYPE_CONFIG: Record<KnowledgeType, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  "Artikel":               { icon: FileText,  color: "text-blue-500",    bg: "bg-blue-500/10",    border: "border-blue-500/20" },
  "Dokumentasi Kegiatan":  { icon: BookOpen,  color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  "Video":                 { icon: Play,      color: "text-rose-500",    bg: "bg-rose-500/10",    border: "border-rose-500/20" },
  "Toolkit Training":      { icon: Wrench,    color: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
}

const TABS: { label: string; value: string }[] = [
  { label: "Semua",               value: "All" },
  { label: "Artikel",             value: "Artikel" },
  { label: "Video",               value: "Video" },
  { label: "Dokumentasi",         value: "Dokumentasi Kegiatan" },
  { label: "Toolkit",             value: "Toolkit Training" },
]

interface Props { initialModules: KnowledgeModule[] }

export default function KnowledgeDirectoryClient({ initialModules }: Props) {
  const [search, setSearch] = useState("")
  const [activeTab, setActiveTab] = useState("All")

  // Stats for Hero
  const stats = useMemo(() => ({
    total: initialModules.length,
    artikel: initialModules.filter(m => m.type === "Artikel").length,
    video: initialModules.filter(m => m.type === "Video").length,
    toolkit: initialModules.filter(m => m.type === "Toolkit Training").length,
    dokumentasi: initialModules.filter(m => m.type === "Dokumentasi Kegiatan").length,
  }), [initialModules])

  const filteredModules = useMemo(() => initialModules.filter((mod) => {
    const matchSearch =
      mod.title.toLowerCase().includes(search.toLowerCase()) ||
      mod.category.toLowerCase().includes(search.toLowerCase()) ||
      mod.author?.toLowerCase().includes(search.toLowerCase()) ||
      mod.tags?.toLowerCase().includes(search.toLowerCase())
    const matchTab = activeTab === "All" || mod.type === activeTab
    return matchSearch && matchTab
  }), [initialModules, search, activeTab])

  return (
    <div className="min-h-screen bg-background">

      {/* ── HERO SECTION ─────────────────────────────────────────── */}
      <section className="relative bg-card border-b border-border overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 pointer-events-none" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />

        <div className="relative container mx-auto px-4 md:px-8 py-16 md:py-20 max-w-6xl">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-xs font-bold text-primary uppercase tracking-widest mb-6">
              <BookOpen className="w-3.5 h-3.5" />
              Perpustakaan Digital
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight mb-4">
              Knowledge <span className="text-primary">Management</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-10">
              Pusat perpustakaan digital, modul pelatihan, dan panduan praktik terbaik untuk mendukung petani Smallholder HUB menuju pertanian berkelanjutan.
            </p>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-foreground">{stats.artikel}</div>
                  <div className="text-xs text-muted-foreground font-medium">Artikel</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center">
                  <Video className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-foreground">{stats.video}</div>
                  <div className="text-xs text-muted-foreground font-medium">Video</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-foreground">{stats.toolkit}</div>
                  <div className="text-xs text-muted-foreground font-medium">Toolkit</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-foreground">{stats.dokumentasi}</div>
                  <div className="text-xs text-muted-foreground font-medium">Dokumentasi</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FILTER SECTION ─────────────────────────────────────────── */}
      <section className="sticky top-16 z-20 bg-background/80 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="container mx-auto px-4 md:px-8 max-w-6xl py-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">

            {/* Tab Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto shrink-0">
              {TABS.map(tab => (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-200 border ${
                    activeTab === tab.value
                      ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30"
                      : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="hidden sm:block h-6 w-px bg-border shrink-0" />

            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10 h-10 bg-muted/50 border-border/60 focus-visible:ring-1 focus-visible:ring-primary rounded-xl text-sm"
                placeholder="Cari judul, kategori, penulis, atau tag..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Results count */}
            <div className="text-xs text-muted-foreground font-medium shrink-0 hidden sm:block">
              {filteredModules.length} konten
            </div>
          </div>
        </div>
      </section>

      {/* ── CONTENT GRID ─────────────────────────────────────────── */}
      <section className="container mx-auto px-4 md:px-8 py-10 max-w-6xl">
        {filteredModules.length === 0 ? (
          <div className="text-center py-24 bg-muted/20 rounded-3xl border-2 border-dashed border-border flex flex-col items-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Konten Tidak Ditemukan</h3>
            <p className="text-sm text-muted-foreground max-w-xs text-center">
              Coba ubah kata kunci pencarian atau pilih kategori yang berbeda.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredModules.map((mod) => {
              const cfg = TYPE_CONFIG[mod.type]
              const Icon = cfg.icon
              const tagList = mod.tags?.split("|").map(t => t.trim()).filter(Boolean) ?? []

              if (mod.type === "Video") {
                return (
                  <Card key={mod.id} className="overflow-hidden border-border/70 bg-card flex flex-col group hover:border-primary/40 hover:shadow-xl transition-all duration-300">
                    {/* Video embed */}
                    <div className="w-full h-48 bg-black relative shrink-0">
                      <iframe
                        className="w-full h-full"
                        src={mod.videoUrl}
                        title={mod.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <CardBody mod={mod} cfg={cfg} Icon={Icon} tagList={tagList} />
                  </Card>
                )
              }

              return (
                <Link href={`/knowledge-management/${mod.id}`} key={mod.id} className="block group">
                  <Card className="overflow-hidden border-border/70 bg-card flex flex-col h-full hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    {/* Thumbnail */}
                    <div className="w-full h-48 bg-muted relative shrink-0 overflow-hidden">
                      <Image
                        src={mod.thumbnail}
                        alt={mod.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      {/* Type overlay */}
                      <div className={`absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 ${cfg.bg} border ${cfg.border} backdrop-blur-md rounded-full`}>
                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>{mod.type}</span>
                      </div>
                    </div>
                    <CardBody mod={mod} cfg={cfg} Icon={Icon} tagList={tagList} />
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

// ── Shared Card Body Component ──────────────────────────────
function CardBody({
  mod, cfg, Icon, tagList
}: {
  mod: KnowledgeModule
  cfg: typeof TYPE_CONFIG[KnowledgeType]
  Icon: React.ElementType
  tagList: string[]
}) {
  const formattedDate = mod.published_date
    ? new Date(mod.published_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
    : ""

  return (
    <div className="p-5 flex-1 flex flex-col">
      {/* Category + type for Video */}
      <div className="flex items-center gap-2 mb-3">
        {mod.type === "Video" && (
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${cfg.bg} border ${cfg.border} rounded-full`}>
            <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>{mod.type}</span>
          </div>
        )}
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{mod.category}</span>
      </div>

      {/* Title */}
      <h3 className="text-base font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2 text-foreground mb-2">
        {mod.title}
      </h3>

      {/* Description */}
      <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed mb-4">
        {mod.description}
      </p>

      {/* Tags */}
      {tagList.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {tagList.slice(0, 3).map(tag => (
            <span key={tag} className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted/70 px-2 py-0.5 rounded-full border border-border/60">
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Meta footer */}
      <div className="mt-auto pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground font-medium">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3" />
            <span className="line-clamp-1 max-w-[100px]">{mod.author}</span>
          </div>
          {mod.read_time_min > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {mod.read_time_min} menit
            </div>
          )}
        </div>
        {mod.type !== "Video" && (
          <ChevronRight className="w-4 h-4 group-hover:text-primary group-hover:translate-x-1 transition-all" />
        )}
      </div>
    </div>
  )
}
