"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Search } from "lucide-react"
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
    <div className="container mx-auto px-4 py-8 max-w-6xl">
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
              <SelectItem value="PDF">PDF</SelectItem>
              <SelectItem value="Dokumen">Dokumen</SelectItem>
              <SelectItem value="Video">Video Tutorial</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {filteredModules.map((mod) => (
          <Card key={mod.id} className="flex flex-col shadow-sm border-primary/10 hover:-translate-y-1 hover:border-primary/50 transition-all duration-300 hover:shadow-xl bg-card/60 backdrop-blur-sm group cursor-pointer">
            <CardHeader className="flex flex-col items-center text-center">
              <div className="mb-4 bg-muted p-4 rounded-full group-hover:bg-primary/10 transition-colors">{mod.icon}</div>
              <p className="text-xs font-bold text-primary/80 uppercase tracking-wider">{mod.category}</p>
              <CardTitle className="text-lg leading-tight mt-2 group-hover:text-primary transition-colors">{mod.title}</CardTitle>
            </CardHeader>
            <CardFooter className="mt-auto pt-4 flex gap-2">
              <Button variant="outline" size="sm" className="w-full font-semibold border-primary/30 hover:bg-primary/10 hover:text-primary">
                {mod.type === "Video" ? "Tonton" : "Baca"}
              </Button>
              <Button variant="secondary" size="icon" className="shrink-0 hover:bg-primary/20 hover:text-primary">
                <Download className="w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
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
