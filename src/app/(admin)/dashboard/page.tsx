import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Map, Tractor, AlertTriangle } from "lucide-react"

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard Admin</h1>
        <p className="text-muted-foreground">Ringkasan data Smallholder HUB untuk wilayah Anda.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-l-4 border-l-primary/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground/80">Total Petani</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">1,248</div>
            <p className="text-xs text-primary/80 font-medium">+12% dari bulan lalu</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-primary/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground/80">Total Luas Lahan</CardTitle>
            <Map className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">4,530 Ha</div>
            <p className="text-xs text-primary/80 font-medium">+5 Ha terdaftar minggu ini</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-primary/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground/80">Sertifikasi RSPO</CardTitle>
            <Tractor className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">84%</div>
            <p className="text-xs text-primary/80 font-medium">Petani telah tersertifikasi</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-l-4 border-l-destructive/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-foreground/80">Laporan Insiden (HSE)</CardTitle>
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">3</div>
            <p className="text-xs text-destructive/80 font-medium">Menunggu tindak lanjut</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Spacer for future charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
        <Card className="col-span-4 h-[300px] flex items-center justify-center bg-muted/30 border-dashed shadow-none">
          <p className="text-muted-foreground font-medium flex items-center gap-2"><Map className="w-5 h-5"/>Area Visualisasi Peta Lahan</p>
        </Card>
        <Card className="col-span-3 h-[300px] flex items-center justify-center bg-muted/30 border-dashed shadow-none">
          <p className="text-muted-foreground font-medium flex items-center gap-2">Area Grafik Trend Produksi Mingguan</p>
        </Card>
      </div>
    </div>
  )
}
