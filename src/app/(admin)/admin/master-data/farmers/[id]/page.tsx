import { getFarmerById } from "@/server/actions/farmer";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = { title: "Farmer Detail" };

export default async function FarmerDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;

  const result = await getFarmerById(id);
  if (!result.success || !result.data) {
    notFound();
  }

  const farmer = result.data;

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">Farmer Detail</h2>
          <div className="flex items-center text-sm text-muted-foreground gap-3">
            <Link href="/admin/master-data/farmers" className="flex items-center hover:text-foreground transition-colors">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Link>
            <span>ID: {farmer.wriFarmerId || farmer.id}</span>
          </div>
        </div>
        <Button variant="outline" className="hidden sm:flex">
          <Download className="mr-2 h-4 w-4" />
          Export Profile Petani
        </Button>
      </div>

      <div className="space-y-6">
        {/* Basic Info (Full Row) */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{farmer.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {farmer.farmerGroup?.name} | {farmer.nik}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white border-transparent">registered</Badge>
              <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white border-transparent">mapped</Badge>
              <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white border-transparent">trained</Badge>
              <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white border-transparent">certified</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="map" className="w-full">
          <TabsList className="flex w-full overflow-x-auto justify-start border-b rounded-none h-12 bg-transparent p-0">
            <TabsTrigger value="map" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-full">Peta Kebun</TabsTrigger>
            <TabsTrigger value="training" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-full">Training</TabsTrigger>
            <TabsTrigger value="produksi" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-full">Produksi</TabsTrigger>
            <TabsTrigger value="perawatan" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-full">Perawatan</TabsTrigger>
            <TabsTrigger value="pekerja" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-full">Pekerja</TabsTrigger>
            <TabsTrigger value="sertifikasi" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 h-full">Sertifikasi</TabsTrigger>
          </TabsList>

          <TabsContent value="map" className="pt-6 mt-0 border-none">
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="py-4 border-b">
                <CardTitle className="text-base font-medium">Map</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[400px] bg-muted/30 relative flex items-center justify-center">
                   <div className="absolute inset-0 opacity-10 bg-[url('https://maps.wikimedia.org/osm-intl/12/2074/1409.png')] bg-cover bg-center"></div>
                   <div className="relative z-10 flex flex-col items-center">
                      <span className="text-sm font-medium">Map View</span>
                      <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-yellow-500" /> Under development
                      </span>
                   </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="training" className="pt-6 mt-0 border-none">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="py-4">
                <CardTitle className="text-base font-medium">Data Pelatihan</CardTitle>
                <CardDescription>Riwayat pelatihan yang telah diikuti oleh petani.</CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Under development</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="produksi" className="pt-6 mt-0 border-none">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="py-4">
                <CardTitle className="text-base font-medium">Data Produksi</CardTitle>
                <CardDescription>Rekaman hasil produksi panen petani.</CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Under development</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="perawatan" className="pt-6 mt-0 border-none">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="py-4">
                <CardTitle className="text-base font-medium">Perawatan Kebun (BMP)</CardTitle>
                <CardDescription>Catatan perawatan kebun dan best management practices.</CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Under development</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pekerja" className="pt-6 mt-0 border-none">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="py-4">
                <CardTitle className="text-base font-medium">Tenaga Kerja (HSE)</CardTitle>
                <CardDescription>Daftar pekerja dan implementasi HSE.</CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Under development</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sertifikasi" className="pt-6 mt-0 border-none">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="py-4">
                <CardTitle className="text-base font-medium">Sertifikasi Dimiliki</CardTitle>
                <CardDescription>Daftar sertifikat kelapa sawit yang dimiliki petani.</CardDescription>
              </CardHeader>
              <CardContent className="pb-6">
                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-500 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Under development</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
