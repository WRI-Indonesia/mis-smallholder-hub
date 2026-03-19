import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, FileText, Download, Share2 } from "lucide-react"
import { mockModules } from "@/lib/static-data/knowledge-management"

export default async function KnowledgeDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const mod = mockModules.find((m) => m.id === id)

  if (!mod) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/knowledge-management" className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-primary mb-8 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali ke Katalog Modul
      </Link>

      <article className="space-y-8 flex flex-col min-h-[60vh]">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="inline-block px-3 py-1 bg-primary/10 text-primary font-bold text-xs uppercase tracking-widest rounded border border-primary/20">
              {mod.type}
            </span>
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              {mod.category}
            </span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl leading-tight">
            {mod.title}
          </h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
            {mod.description}
          </p>
        </header>

        {mod.type === "Video" && mod.videoUrl ? (
          <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-lg border border-border mt-6">
            <iframe 
              className="w-full h-full" 
              src={mod.videoUrl} 
              title={mod.title} 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            />
          </div>
        ) : (
          <div className="w-full aspect-[21/9] bg-muted rounded-2xl overflow-hidden shadow-lg border border-border mt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mod.thumbnail} alt={mod.title} className="w-full h-full object-cover" />
          </div>
        )}

        {mod.content && (
          <div className="prose prose-green dark:prose-invert max-w-none prose-lg mt-8">
            <h2 className="text-2xl font-bold mb-4">Materi Utama</h2>
            <p className="whitespace-pre-line leading-relaxed text-foreground/80">
              {mod.content}
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="mt-auto pt-10">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-6 rounded-2xl shadow-sm border border-border/80">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-lg text-foreground">Unduh Dokumen Lengkap</p>
                <p className="text-sm font-medium text-muted-foreground">Format PDF, 2.4 MB</p>
              </div>
            </div>
            <div className="flex w-full sm:w-auto gap-3">
              <Button variant="outline" className="w-full sm:w-auto font-semibold">
                <Share2 className="mr-2 w-4 h-4" />
                Bagikan
              </Button>
              <Button className="w-full sm:w-auto font-semibold shadow-sm">
                <Download className="mr-2 w-4 h-4" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
