"use client";

import { useState } from "react";
import { type FarmerGroupRow } from "@/server/actions/farmer-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MapPin, Users, ChevronLeft, ChevronDown, ChevronUp, HardHat, Shapes, Maximize, TrendingUp, Activity, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Map from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

interface GroupDetailClientProps {
  group: FarmerGroupRow;
}

export function GroupDetailClient({ group }: GroupDetailClientProps) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [isInfoOpen, setIsInfoOpen] = useState(true);

  // Placeholder calculations based on farmer count
  // TODO Fase 5–6: Replace with real DB queries (parcels, hseWorkers, productions)
  const totalAnggota = group._count.farmers;
  const pekerja = totalAnggota * 2;
  const polygon = totalAnggota;
  const luas = (totalAnggota * 2.2).toFixed(2);
  const produksi = (totalAnggota * 14.5).toFixed(2);
  const produktivitas = 6.59;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-4">
      <Collapsible open={isInfoOpen} onOpenChange={setIsInfoOpen} className="w-full space-y-4">
        {/* Compact Header Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => router.push("/admin/master-data/groups")}
              title="Kembali ke Daftar Kelompok Tani"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight leading-none">{group.name}</h2>
              <Badge variant="secondary" className="px-2 py-0.5 text-xs h-6">
                {group.abrv3id || "3ID N/A"}
              </Badge>
              <Badge className="px-2 py-0.5 text-xs h-6 bg-primary/10 text-primary hover:bg-primary/20 border-none">
                {group.district.name}
              </Badge>
            </div>
          </div>
          <CollapsibleTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3 shrink-0">
            {isInfoOpen ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Sembunyikan Info
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Info Detail
              </>
            )}
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-4 pt-2">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Anggota</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-xl font-bold">{totalAnggota}</div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Jumlah Pekerja</CardTitle>
                <HardHat className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-xl font-bold">{pekerja}</div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Jumlah Polygon</CardTitle>
                <Shapes className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-xl font-bold">{polygon}</div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Luas Kebun</CardTitle>
                <Maximize className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-xl font-bold">{luas} <span className="text-sm font-normal text-muted-foreground">Ha</span></div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Total Produksi</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-xl font-bold">{produksi} <span className="text-sm font-normal text-muted-foreground">Ton/Thn</span></div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
                <CardTitle className="text-xs font-medium text-muted-foreground">Produktivitas</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-xl font-bold">{produktivitas} <span className="text-sm font-normal text-muted-foreground">Ton/Ha/Thn</span></div>
              </CardContent>
            </Card>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Main Content Tabs */}
      <Tabs defaultValue="land-parcel" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto rounded-none border-b bg-transparent p-0 mb-4 h-auto">
          <TabsTrigger
            value="land-parcel"
            className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none"
          >
            Land Parcel
          </TabsTrigger>
          <TabsTrigger
            value="training"
            className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none"
          >
            Training
          </TabsTrigger>
          <TabsTrigger
            value="anggota"
            className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none"
          >
            Data Training Anggota
          </TabsTrigger>
          <TabsTrigger
            value="bmp"
            className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none"
          >
            BMP
          </TabsTrigger>
          <TabsTrigger
            value="hse"
            className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none"
          >
            HSE
          </TabsTrigger>
          <TabsTrigger
            value="hcv"
            className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none"
          >
            HCV
          </TabsTrigger>
        </TabsList>

        <TabsContent value="land-parcel" className="m-0">
          <Card className="border-0 shadow-none">
            <CardContent className="p-0">
              <div className="h-[calc(100vh-220px)] min-h-[400px] w-full rounded-md overflow-hidden border">
                <Map
                  initialViewState={{
                    longitude: group.locationLong || 101.4474,
                    latitude: group.locationLat || 0.5104,
                    zoom: 10,
                  }}
                  mapStyle={
                    resolvedTheme === "dark"
                      ? "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
                      : "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
                  }
                  interactive={true}
                >
                  {/* Placeholder for future markers/polygons */}
                </Map>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Training</CardTitle>
              <CardDescription>Daftar kegiatan pelatihan yang pernah dilaksanakan untuk kelompok ini.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 text-sm">
                <Tag className="h-4 w-4" />
                <span>Modul pelatihan akan tersedia di Fase 6. Data pelatihan belum tersedia.</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anggota" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Training Anggota</CardTitle>
              <CardDescription>Rincian status kelulusan dan kehadiran pelatihan per petani anggota.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 text-sm">
                <Tag className="h-4 w-4" />
                <span>Modul pelatihan akan tersedia di Fase 6. Data training anggota belum tersedia.</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bmp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data BMP (Best Management Practices)</CardTitle>
              <CardDescription>Informasi seputar produksi dan perawatan lahan per anggota.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 text-sm">
                <Tag className="h-4 w-4" />
                <span>Modul BMP akan tersedia di Fase 6. Data BMP belum tersedia.</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hse" className="space-y-4">
          <Card className="border-dashed bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center h-64 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Tag className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">HSE (Health, Safety, Environment)</h3>
              <p className="text-muted-foreground max-w-sm">
                Modul pelaporan K3 (Kesehatan dan Keselamatan Kerja) masih dalam tahap pengembangan.
              </p>
              <Badge variant="outline" className="mt-4">Under Development</Badge>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hcv" className="space-y-4">
          <Card className="border-dashed bg-muted/20">
            <CardContent className="flex flex-col items-center justify-center h-64 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <MapPin className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold mb-2">HCV (High Conservation Value)</h3>
              <p className="text-muted-foreground max-w-sm">
                Modul pemetaan dan monitoring area bernilai konservasi tinggi masih dalam tahap pengembangan.
              </p>
              <Badge variant="outline" className="mt-4">Under Development</Badge>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
