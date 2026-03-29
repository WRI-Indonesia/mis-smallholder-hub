"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, MapPin, Users, Calendar, ArrowRight, ChevronRight, Leaf } from "lucide-react"
import Map, { Marker, Popup, MapRef } from "react-map-gl/maplibre"
import "maplibre-gl/dist/maplibre-gl.css"
import { useTheme } from "next-themes"
import { FarmerGroup } from "@/lib/static-data/public/community"

// Define rough bounding center for our regions for flyTo animation
const REGION_COORDINATES: Record<string, { longitude: number; latitude: number; zoom: number }> = {
  "All": { longitude: 101.44, latitude: 0.53, zoom: 6.8 }, // Riau Center
  "Kampar": { longitude: 101.03, latitude: 0.33, zoom: 9 },
  "Siak": { longitude: 102.04, latitude: 0.75, zoom: 9 },
  "Pelalawan": { longitude: 101.99, latitude: 0.30, zoom: 9 },
  "Rokan Hulu": { longitude: 100.32, latitude: 0.84, zoom: 9 },
}

interface CommunityDirectoryClientProps {
  initialGroups: FarmerGroup[]
}

export default function CommunityDirectoryClient({ initialGroups }: CommunityDirectoryClientProps) {
  const [search, setSearch] = useState("")
  const [regionFilter, setRegionFilter] = useState("All")
  const { resolvedTheme } = useTheme()
  const [selectedPin, setSelectedPin] = useState<string | null>(null)
  const mapRef = useRef<MapRef>(null)
  
  // Prevent hydration mismatch for map theme
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const mapStyle = mounted && resolvedTheme === "dark" 
    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"

  // Optimized filtering using useMemo
  const filteredGroups = useMemo(() => {
    return initialGroups.filter((group) => {
      const matchSearch = group.name.toLowerCase().includes(search.toLowerCase()) || 
                          group.type.toLowerCase().includes(search.toLowerCase());
      const matchRegion = regionFilter === "All" ? true : group.region === regionFilter;
      return matchSearch && matchRegion;
    });
  }, [initialGroups, search, regionFilter]);

  // Handle flyTo animation when region filter changes
  useEffect(() => {
    if (mapRef.current && REGION_COORDINATES[regionFilter]) {
      const target = REGION_COORDINATES[regionFilter];
      mapRef.current.flyTo({
        center: [target.longitude, target.latitude],
        zoom: target.zoom,
        duration: 1500, // Ms
        essential: true,
      });
    }
  }, [regionFilter]);

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-64px)]">
      
      {/* 60% Left - Map View */}
      <section className="relative w-full lg:w-[60%] h-[400px] lg:h-[calc(100vh-64px)] lg:sticky lg:top-16 bg-muted/30 border-r border-border overflow-hidden z-0">
        <div className="absolute inset-0 z-0 bg-muted">
          {mounted && (
             <Map
               ref={mapRef}
               initialViewState={REGION_COORDINATES["All"]}
               mapStyle={mapStyle}
               interactive={true}
               attributionControl={false}
             >
               {filteredGroups.map(group => (
                 <Marker 
                   key={group.id} 
                   longitude={group.lng} 
                   latitude={group.lat} 
                   anchor="bottom"
                   onClick={e => {
                     e.originalEvent.stopPropagation();
                     setSelectedPin(group.id);
                   }}
                 >
                   <div className="relative group cursor-pointer transform hover:scale-125 transition-transform duration-300">
                     <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground shadow-xl border-2 border-white dark:border-background">
                       <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                     </div>
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/30 rounded-full animate-ping delay-150 -z-10" />
                   </div>
                 </Marker>
               ))}

               {/* Marker Popup */}
               {selectedPin && (
                 (() => {
                   const activeNode = filteredGroups.find(g => g.id === selectedPin);
                   if (!activeNode) return null;
                   return (
                     <Popup
                       longitude={activeNode.lng}
                       latitude={activeNode.lat}
                       anchor="bottom"
                       offset={30}
                       onClose={() => setSelectedPin(null)}
                       closeButton={false}
                       className="z-50 rounded-2xl overflow-hidden shadow-2xl"
                     >
                       <div className="p-0 bg-card text-foreground rounded-xl border min-w-[240px] overflow-hidden">
                         <div className="h-24 w-full relative bg-muted">
                            <Image 
                              src={activeNode.image_url} 
                              alt={activeNode.name}
                              fill
                              sizes="240px"
                              className="object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <span className="absolute bottom-2 left-3 text-[10px] font-bold text-white uppercase tracking-wider px-2 py-0.5 bg-primary/80 backdrop-blur-sm rounded-sm">
                              {activeNode.type}
                            </span>
                         </div>
                         <div className="p-4">
                           <h3 className="font-bold text-[15px] leading-tight mb-2 line-clamp-2">{activeNode.name}</h3>
                           <div className="flex items-center text-xs text-muted-foreground mb-4 font-medium">
                             <MapPin className="w-3.5 h-3.5 mr-1 text-primary/70" /> {activeNode.village}, {activeNode.region}
                           </div>
                           <Link href={`/community/${activeNode.id}`} className="text-xs font-bold text-primary flex items-center bg-primary/10 w-full py-2.5 justify-center rounded-lg hover:bg-primary/20 transition-colors">
                             Lihat Detail <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                           </Link>
                         </div>
                       </div>
                     </Popup>
                   );
                 })()
               )}
             </Map>
          )}
          {!mounted && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
              <Leaf className="w-12 h-12 text-primary/20 animate-bounce" />
            </div>
          )}
        </div>
        
        {/* Floating Heading Overlay on Mobile */}
        <div className="absolute top-4 left-4 lg:hidden z-10 pointer-events-none">
          <div className="bg-background/80 backdrop-blur-md p-4 rounded-2xl shadow-lg border border-border/50 pointer-events-auto">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Direktori Kemitraan
            </h1>
          </div>
        </div>
      </section>

      {/* 40% Right - Search, Filter & Cards */}
      <section className="w-full lg:w-[40%] flex flex-col bg-background relative z-10 h-full lg:overflow-y-auto">
        <div className="p-6 md:p-8 flex flex-col gap-6">
          <div className="hidden lg:block">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl mb-3">
              Jaringan <span className="text-primary">Komunitas</span>
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Jelajahi dan temukan kemitraan dengan Koperasi serta Asosiasi Petani di jaringan Smallholder HUB.
            </p>
          </div>

          {/* Filter & Search */}
          <div className="flex flex-row gap-3">
            <div className="w-[140px] md:w-[180px] shrink-0">
              <Select value={regionFilter} onValueChange={(val) => setRegionFilter(val || "All")}>
                <SelectTrigger className="w-full bg-card border-border/80 shadow-sm rounded-xl text-sm font-medium focus:ring-1 focus:ring-primary">
                  <SelectValue placeholder="Semua Distrik" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/80 shadow-lg text-sm">
                  <SelectItem value="All">Semua Distrik</SelectItem>
                  <SelectItem value="Kampar">Kampar</SelectItem>
                  <SelectItem value="Siak">Siak</SelectItem>
                  <SelectItem value="Pelalawan">Pelalawan</SelectItem>
                  <SelectItem value="Rokan Hulu">Rokan Hulu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                className="pl-10 w-full bg-card border-border/80 shadow-sm focus-visible:ring-1 focus-visible:ring-primary rounded-xl text-sm" 
                placeholder="Cari nama komunitas..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* List of Cards */}
          <div className="flex flex-col gap-5 pb-8">
            {filteredGroups.map((group) => (
              <Link href={`/community/${group.id}`} key={group.id} className="block group">
                <Card className="hover:border-primary/50 transition-all duration-300 hover:shadow-xl cursor-pointer bg-card overflow-hidden border-border/70 flex flex-col sm:flex-row">
                  {/* Thumbnail Image */}
                  <div className="w-full sm:w-[140px] h-[160px] sm:h-auto relative bg-muted shrink-0 overflow-hidden">
                     <Image 
                       src={group.image_url} 
                       alt={group.name}
                       fill
                       sizes="(max-width: 640px) 100vw, 140px"
                       className="object-cover group-hover:scale-105 transition-transform duration-500"
                     />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 sm:bg-gradient-to-r sm:from-black/10 via-transparent to-transparent" />
                     {/* Badge Overlay for mobile */}
                     <div className="absolute bottom-3 left-3 sm:hidden">
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider px-2 py-1 bg-primary/90 backdrop-blur-md rounded border border-white/20">
                          {group.type}
                        </span>
                     </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-1">
                    <CardHeader className="p-4 md:p-5 pb-2">
                      <div className="hidden sm:flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wider px-2 py-0.5 bg-primary/10 rounded border border-primary/20">
                          {group.type}
                        </span>
                        <div className="flex items-center gap-1 bg-muted px-2 py-0.5 rounded text-[10px] font-medium text-muted-foreground border">
                          <Leaf className="w-3 h-3 text-primary/70" />
                          {group.commodities}
                        </div>
                      </div>
                      
                      <CardTitle className="text-lg group-hover:text-primary transition-colors leading-tight line-clamp-2">
                        {group.name}
                      </CardTitle>
                      
                      <div className="flex items-center text-[12px] font-medium text-muted-foreground mt-2">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-primary/70 shrink-0" />
                          <span className="line-clamp-1">{group.village}, {group.region}</span>
                      </div>
                        
                      <CardDescription className="line-clamp-2 mt-2 text-foreground/80 leading-relaxed text-xs">
                        {group.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 md:p-5 pt-0 mt-auto">
                      <div className="flex items-center justify-between text-[11px] text-foreground/70 font-medium border-t border-border/50 pt-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center">
                            <Users className="w-3.5 h-3.5 mr-1 text-primary/70" />
                            {group.members} Petani
                          </div>
                          <div className="flex items-center">
                            <Calendar className="w-3.5 h-3.5 mr-1 text-primary/70" />
                            Est. {group.established}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-1" />
                      </div>
                    </CardContent>
                  </div>
                </Card>
              </Link>
            ))}
            
            {filteredGroups.length === 0 && (
              <div className="text-center py-16 bg-muted/20 rounded-3xl border-2 border-dashed border-border text-muted-foreground flex flex-col items-center justify-center">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <MapPin className="w-8 h-8 text-muted-foreground/30" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-1">Pencarian Tidak Ditemukan</h3>
                <p className="text-sm mt-1 max-w-[250px] mx-auto text-center">Silakan sesuaikan kata kunci atau ubah wilayah distrik Anda.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
