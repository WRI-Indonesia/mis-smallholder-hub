"use client"

import { useEffect, useState } from "react"
import Map, { Marker } from "react-map-gl/maplibre"
import { MapPin } from "lucide-react"
import { useTheme } from "next-themes"

interface ProfileMiniMapProps {
  lat: number
  lng: number
}

export default function ProfileMiniMap({ lat, lng }: ProfileMiniMapProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => setMounted(true), [])

  const mapStyle = mounted && resolvedTheme === "dark" 
    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"

  if (!mounted) {
    return <div className="h-full w-full bg-muted animate-pulse border-t" />
  }

  return (
    <div className="h-[200px] w-full bg-muted border-t relative isolate">
      <Map
        initialViewState={{ longitude: lng, latitude: lat, zoom: 11 }}
        mapStyle={mapStyle}
        interactive={false}
        attributionControl={false}
      >
        <Marker longitude={lng} latitude={lat} anchor="bottom">
           <MapPin className="w-8 h-8 text-primary drop-shadow-md" fill="currentColor" opacity={0.2} />
        </Marker>
      </Map>
      <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-medium border shadow-sm pointer-events-none">
        Kordinat Terdaftar
      </div>
    </div>
  )
}
