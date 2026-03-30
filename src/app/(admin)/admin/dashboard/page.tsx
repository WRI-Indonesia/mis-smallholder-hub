"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { getKpiStats, farmerGroupKPI, type GroupKPI } from "@/lib/static-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Users, Target, UsersRound, UserCheck,
  MapPinned, LandPlot, GraduationCap, MapPin, Leaf, X, Search, Locate
} from "lucide-react";
import MapGL, { Marker, MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";

const programOptions = ["All", "2025", "2026", "2027", "2028"];
const distrikOptions = ["All", "Kampar", "Rokan Hulu", "Siak", "Pelalawan"];

const iconMap: Record<string, React.ReactNode> = {
  UsersRound: <UsersRound className="h-5 w-5" />,
  Users: <Users className="h-5 w-5" />,
  UserCheck: <UserCheck className="h-5 w-5" />,
  MapPinned: <MapPinned className="h-5 w-5" />,
  LandPlot: <LandPlot className="h-5 w-5" />,
  GraduationCap: <GraduationCap className="h-5 w-5" />,
};

const REGION_COORDINATES: Record<string, { longitude: number; latitude: number; zoom: number }> = {
  "All": { longitude: 101.44, latitude: 0.53, zoom: 7.2 },
  "Kampar": { longitude: 101.03, latitude: 0.33, zoom: 9 },
  "Siak": { longitude: 102.04, latitude: 0.75, zoom: 9 },
  "Pelalawan": { longitude: 101.99, latitude: 0.30, zoom: 9 },
  "Rokan Hulu": { longitude: 100.32, latitude: 0.84, zoom: 9 },
};

export default function KPIDashboardPage() {
  const [program, setProgram] = useState("All");
  const [distrik, setDistrik] = useState("All");
  const [selectedGroup, setSelectedGroup] = useState<GroupKPI | null>(null);
  const [mapSearch, setMapSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  const mapRef = useRef<MapRef>(null);

  useEffect(() => setMounted(true), []);

  const mapStyle = mounted && resolvedTheme === "dark"
    ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
    : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

  const filteredGroups = useMemo(() =>
    farmerGroupKPI.filter(g => {
      const matchDistrik = distrik === "All" || g.region === distrik;
      const matchSearch = !mapSearch || g.name.toLowerCase().includes(mapSearch.toLowerCase());
      return matchDistrik && matchSearch;
    }),
    [distrik, mapSearch]);

  useEffect(() => {
    if (mapRef.current && REGION_COORDINATES[distrik]) {
      const t = REGION_COORDINATES[distrik];
      mapRef.current.flyTo({ center: [t.longitude, t.latitude], zoom: t.zoom, duration: 1200, essential: true });
    }
  }, [distrik]);

  const zoomToAll = () => {
    setSelectedGroup(null);
    setMapSearch("");
    const t = REGION_COORDINATES["All"];
    mapRef.current?.flyTo({ center: [t.longitude, t.latitude], zoom: t.zoom, duration: 1200, essential: true });
  };

  const handleMarkerClick = (group: GroupKPI) => {
    setSelectedGroup(group);
    mapRef.current?.flyTo({ center: [group.lng, group.lat], zoom: 11, duration: 1000, essential: true });
  };

  const allStats = useMemo(() => getKpiStats(program, distrik), [program, distrik]);

  return (
    <div className="-m-6 flex flex-col bg-muted/30" style={{ height: "calc(100vh - 56px)" }}>

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-6 h-14 bg-background border-b shrink-0">
        <div className="flex items-center gap-2.5">
          <Target className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-extrabold tracking-tight text-foreground">Basic Data</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={program} onValueChange={(v) => setProgram(v ?? "All")}>
            <SelectTrigger className="w-[140px] h-8 text-sm bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {programOptions.map(o => <SelectItem key={o} value={o}>{o === "All" ? "Semua Program" : o}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={distrik} onValueChange={(v) => setDistrik(v ?? "All")}>
            <SelectTrigger className="w-[150px] h-8 text-sm bg-background"><SelectValue /></SelectTrigger>
            <SelectContent>
              {distrikOptions.map(o => <SelectItem key={o} value={o}>{o === "All" ? "Semua Distriks" : o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="flex-1 flex flex-col min-h-0 p-4 gap-4">

        {/* KPI CARDS — 2 rows × 5 cols */}
        <div className="grid grid-cols-5 grid-rows-2 gap-3 shrink-0">
          {allStats.map((stat) => (
            <div key={stat.label} className="bg-background border rounded-lg px-4 py-3 flex flex-col justify-between min-h-[88px]">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[14px] font-bold text-muted-foreground uppercase tracking-widest leading-tight max-w-[80%]">{stat.label}</p>
                <div className="p-1.5 rounded-md bg-muted text-muted-foreground shrink-0">
                  {iconMap[stat.icon]}
                </div>
              </div>
              <p className="text-4xl font-black tracking-tight text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* MAP + DETAIL */}
        <div className="flex-1 flex rounded-lg border overflow-hidden bg-background min-h-0">

          {/* Map — 60% */}
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
                {filteredGroups.map(group => (
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

          {/* Detail — 40% */}
          <div className="w-[40%] border-l overflow-y-auto">
            {selectedGroup ? (
              <div className="p-4">
                {/* Title */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[12px] font-bold text-primary uppercase tracking-widest mb-0.5">{selectedGroup.region}</p>
                    <h3 className="text-lg font-extrabold text-foreground leading-tight">{selectedGroup.name}</h3>
                  </div>
                  <button onClick={() => setSelectedGroup(null)} className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Stats */}
                <div className="space-y-3">
                  <DetailSection title="Petani" rows={[
                    { icon: <Users className="h-4 w-4" />, label: "Total", value: selectedGroup.totalPetani, highlight: true },
                    { icon: <UserCheck className="h-4 w-4" />, label: "Laki-Laki", value: selectedGroup.petaniLaki },
                    { icon: <UserCheck className="h-4 w-4" />, label: "Perempuan", value: selectedGroup.petaniPerempuan },
                  ]} />
                  <DetailSection title="Lahan" rows={[
                    { icon: <MapPinned className="h-4 w-4" />, label: "Persil", value: selectedGroup.totalPersil, highlight: true },
                    { icon: <LandPlot className="h-4 w-4" />, label: "Luasan", value: selectedGroup.totalLuasan },
                  ]} />
                  <DetailSection title="Training" rows={[
                    { icon: <GraduationCap className="h-4 w-4" />, label: "Paket 1", value: selectedGroup.trainingPaket1 },
                    { icon: <GraduationCap className="h-4 w-4" />, label: "Paket 2 — MK", value: selectedGroup.trainingPaket2MK },
                    { icon: <GraduationCap className="h-4 w-4" />, label: "Paket 2 — HSE", value: selectedGroup.trainingPaket2HSE },
                    { icon: <GraduationCap className="h-4 w-4" />, label: "Paket 3 & 4", value: selectedGroup.trainingPaket34 },
                  ]} />
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-2">
                  <MapPin className="w-4 h-4 text-muted-foreground/40" />
                </div>
                <p className="text-xs font-bold text-foreground mb-0.5">Detail Kelompok Tani</p>
                <p className="text-[11px] text-muted-foreground max-w-[160px] leading-relaxed">
                  Klik titik pada peta untuk melihat detail KPI.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

type DetailRowData = { icon: React.ReactNode; label: string; value: string | number; highlight?: boolean };

function DetailSection({ title, rows }: { title: string; rows: DetailRowData[] }) {
  return (
    <div className="flex flex-col">
      <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3 pb-2 border-b">{title}</h4>
      <div className="space-y-2.5">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              {row.icon}
              <span className="text-md font-medium">{row.label}</span>
            </div>
            <span className={`font-black text-foreground ${row.highlight ? "text-2xl" : "text-md"}`}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
