"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"
import { mockModules } from "@/lib/static-data/knowledge-management"

export default function KnowledgeManagementPage() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("All")

  const filteredModules = mockModules.filter((mod) => {
    const matchSearch = mod.title.toLowerCase().includes(search.toLowerCase()) || 
                        mod.category.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" ? true : mod.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-12 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
          Knowledge <span className="text-primary">Management</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Pusat perpustakaan digital, modul pelatihan, dan panduan praktik terbaik (BMP) untuk petani Smallholder HUB.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-2 mb-12 bg-card p-3 rounded-2xl border shadow-sm max-w-4xl mx-auto">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            className="pl-12 h-14 bg-transparent border-none shadow-none text-base focus-visible:ring-0 rounded-xl" 
            placeholder="Cari judul modul atau kategori..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="h-8 w-px bg-border/60 hidden sm:block mx-2" />
        <div className="w-full sm:w-[280px] shrink-0">
          <Select value={typeFilter} onValueChange={(val) => setTypeFilter(val || "All")}>
            <SelectTrigger className="h-14 w-full bg-transparent border-none shadow-none text-base focus:ring-0 rounded-xl font-medium">
              <SelectValue placeholder="Semua Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Semua Format</SelectItem>
              <SelectItem value="Artikel">Artikel</SelectItem>
              <SelectItem value="Dokumentasi Kegiatan">Dokumentasi Kegiatan</SelectItem>
              <SelectItem value="Toolkit Training">Toolkit Training</SelectItem>
              <SelectItem value="Video">Video</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredModules.map((mod) => (
          mod.type === "Video" ? (
             <Card key={mod.id} className="h-full flex flex-col shadow-sm border-border overflow-hidden bg-card/60 backdrop-blur-sm group hover:shadow-md transition-shadow">
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
               <div className="p-5 flex-1 flex flex-col">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest px-2.5 py-1 bg-rose-500/10 rounded-full">
                    {mod.type}
                  </span>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest line-clamp-1">{mod.category}</span>
                </div>
                 <h3 className="text-lg font-bold leading-snug line-clamp-2 text-foreground mb-2">
                   {mod.title}
                 </h3>
                 <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed mt-auto">
                   {mod.description}
                 </p>
               </div>
             </Card>
          ) : (
            <Link href={`/knowledge-management/${mod.id}`} key={mod.id} className="block group h-full">
              <Card className="h-full flex flex-col shadow-sm border-border hover:-translate-y-1 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-card/60 backdrop-blur-sm overflow-hidden">
                <div className="w-full h-48 bg-muted relative shrink-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mod.thumbnail} alt={mod.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest px-2.5 py-1 bg-primary/10 rounded-full">
                      {mod.type}
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest line-clamp-1">{mod.category}</span>
                  </div>
                  <h3 className="text-lg font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2 text-foreground mb-2">
                    {mod.title}
                  </h3>
                  <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed mt-auto">
                    {mod.description}
                  </p>
                </div>
              </Card>
            </Link>
          )
        ))}
        
        {filteredModules.length === 0 && (
          <div className="col-span-full text-center py-16 bg-muted/20 rounded-xl border border-dashed text-muted-foreground">
            Tidak ada modul atau dokumen yang sesuai dengan pencarian Anda.
          </div>
        )}
      </div>
    </div>
  )
}
