import { useEffect, useRef, useState } from "react"
import { useTheme } from "next-themes"
import MapGL, { Marker, MapRef } from "react-map-gl/maplibre"
import { Search, Locate, MapPin, Leaf } from "lucide-react"
import { Input } from "@/components/ui/input"
import { FarmerGroupData } from "@/lib/static-data/admin/dashboard"
import { REGION_COORDINATES } from "@/lib/map-utils"

interface BasicDataMapProps {
  groups: FarmerGroupData[]
  distrik: string
  selectedGroup: FarmerGroupData | null
  setSelectedGroup: (group: FarmerGroupData | null) => void
  mapSearch: string
  setMapSearch: (search: string) => void
}

export function BasicDataMap({ groups, distrik, selectedGroup, setSelectedGroup, mapSearch, setMapSearch }: BasicDataMapProps) {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme } = useTheme()
  const mapRef = useRef<MapRef>(null)

  useEffect(() => setMounted(true), [])

  const mapStyle = mounted && resolvedTheme === "dark"
    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"

  useEffect(() => {
    if (mapRef.current && REGION_COORDINATES[distrik]) {
      const t = REGION_COORDINATES[distrik]
      mapRef.current.flyTo({ center: [t.longitude, t.latitude], zoom: t.zoom, duration: 1200, essential: true })
    }
  }, [distrik])

  const zoomToAll = () => {
    setSelectedGroup(null)
    setMapSearch("")
    const t = REGION_COORDINATES["All"]
    mapRef.current?.flyTo({ center: [t.longitude, t.latitude], zoom: t.zoom, duration: 1200, essential: true })
  }

  const handleMarkerClick = (group: FarmerGroupData) => {
    setSelectedGroup(group)
    mapRef.current?.flyTo({ center: [group.lng, group.lat], zoom: 11, duration: 1000, essential: true })
  }

  return (
    <div className="w-[60%] relative bg-muted shrink-0">
      {mounted ? (
        <MapGL
          ref={mapRef}
          initialViewState={REGION_COORDINATES["All"]}
          mapStyle={mapStyle}
          interactive={true}
          attributionControl={false}
          style={{ width: "100%", height: "100%" }}
        >
          {groups.map(group => (
            <Marker key={group.id} longitude={group.lng} latitude={group.lat} anchor="bottom"
              onClick={e => { e.originalEvent.stopPropagation(); handleMarkerClick(group); }}>
              <div className="cursor-pointer hover:scale-105 transition-transform flex items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-primary-foreground border-2 border-white dark:border-zinc-800 shadow-md transition-colors shrink-0 ${selectedGroup?.id === group.id ? "bg-destructive" : "bg-primary"}`}>
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded bg-background/90 backdrop-blur-sm border shadow-sm whitespace-nowrap ${selectedGroup?.id === group.id ? "text-destructive border-destructive/30" : "text-foreground border-border/80"}`}>
                  {group.name}
                </span>
              </div>
            </Marker>
          ))}
        </MapGL>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
          <Leaf className="w-8 h-8 text-primary/20" />
        </div>
      )}

      {/* Floating controls */}
      <div className="absolute top-3 left-3 right-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-xs bg-background/90 backdrop-blur-sm border-border/80 shadow-sm rounded-md"
            placeholder="Cari kelompok tani..."
            value={mapSearch}
            onChange={(e) => setMapSearch(e.target.value)}
          />
        </div>
        <button
          onClick={zoomToAll}
          className="h-8 px-3 text-xs font-semibold bg-background/90 backdrop-blur-sm border border-border/80 rounded-md shadow-sm hover:bg-accent transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Locate className="h-3.5 w-3.5" />
          Lihat Semua
        </button>
      </div>
    </div>
  )
}
