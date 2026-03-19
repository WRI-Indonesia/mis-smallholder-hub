"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { farmerGroups } from "@/lib/static-data/community"
import { Search, MapPin, Users, Calendar } from "lucide-react"

export default function CommunityPage() {
  const [search, setSearch] = useState("")
  const [regionFilter, setRegionFilter] = useState("All")

  const filteredGroups = farmerGroups.filter((group) => {
    const matchSearch = group.name.toLowerCase().includes(search.toLowerCase()) || 
                        group.type.toLowerCase().includes(search.toLowerCase());
    const matchRegion = regionFilter === "All" ? true : group.region === regionFilter;
    return matchSearch && matchRegion;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8 text-center sm:text-left">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Direktori Komunitas</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Temukan direktori Koperasi dan Asosiasi Petani di 4 Distrik Utama Smallholder HUB.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8 bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-9 bg-background" 
            placeholder="Cari nama koperasi atau asosiasi..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-[240px]">
          <Select value={regionFilter} onValueChange={(val) => setRegionFilter(val || "All")}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Pilih Distrik..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">Semua Distrik</SelectItem>
              <SelectItem value="Kampar">Kampar</SelectItem>
              <SelectItem value="Siak">Siak</SelectItem>
              <SelectItem value="Pelalawan">Pelalawan</SelectItem>
              <SelectItem value="Rokan Hulu">Rokan Hulu</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredGroups.map((group) => (
          <Link href={`/community/${group.id}`} key={group.id} className="block group">
            <Card className="h-full hover:-translate-y-1 hover:border-primary/50 transition-all duration-300 hover:shadow-xl cursor-pointer flex flex-col bg-card/60 backdrop-blur-sm border-border/50">
              <CardHeader>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider px-2 py-1 bg-primary/10 rounded border border-primary/10">
                    {group.type}
                  </span>
                  <div className="flex items-center text-xs font-semibold text-muted-foreground ml-2 text-right">
                    <MapPin className="w-3 h-3 mr-1 text-primary/70" />
                    {group.region}
                  </div>
                </div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors leading-tight">
                  {group.name}
                </CardTitle>
                <CardDescription className="line-clamp-2 mt-2 text-foreground/80 leading-relaxed">
                  {group.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto pt-0">
                <div className="flex items-center gap-4 text-sm text-foreground/70 font-medium">
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1.5 text-primary/70" />
                    {group.members} Petani
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1.5 text-primary/70" />
                    Est. {group.established}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        
        {filteredGroups.length === 0 && (
          <div className="col-span-full text-center py-16 bg-muted/20 rounded-xl border border-dashed text-muted-foreground">
            Tidak ada kemitraan Koperasi/Asosiasi yang sesuai dengan kriteria filter.
          </div>
        )}
      </div>
    </div>
  )
}
