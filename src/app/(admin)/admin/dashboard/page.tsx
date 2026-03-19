import { dashboardStats } from "@/lib/static-data/dashboard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Map, Tractor, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

const statIcons = [
  <Users key="users" className="h-5 w-5" />,
  <Map key="map" className="h-5 w-5" />,
  <Tractor key="tractor" className="h-5 w-5" />,
  <AlertTriangle key="alert" className="h-5 w-5" />,
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Admin</h1>
        <p className="text-muted-foreground">Ringkasan data Smallholder HUB untuk wilayah Anda.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat, idx) => (
          <Card 
            key={stat.label}
            className={cn("shadow-sm border-l-4", 
              stat.variant === "destructive" ? "border-l-destructive/60" : "border-l-primary/60"
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-semibold text-foreground/80">{stat.label}</CardTitle>
              <span className={stat.variant === "destructive" ? "text-destructive" : "text-primary"}>
                {statIcons[idx]}
              </span>
            </CardHeader>
            <CardContent>
              <div className={cn("text-3xl font-bold", stat.variant === "destructive" ? "text-destructive" : "text-foreground")}>
                {stat.value}
              </div>
              <p className={cn("text-xs font-medium", stat.variant === "destructive" ? "text-destructive/80" : "text-primary/80")}>
                {stat.trend}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
        <Card className="col-span-4 h-[300px] flex items-center justify-center bg-muted/30 border-dashed shadow-none">
          <p className="text-muted-foreground font-medium flex items-center gap-2">
            <Map className="w-5 h-5"/> Area Visualisasi Peta Lahan
          </p>
        </Card>
        <Card className="col-span-3 h-[300px] flex items-center justify-center bg-muted/30 border-dashed shadow-none">
          <p className="text-muted-foreground font-medium">Area Grafik Trend Produksi Mingguan</p>
        </Card>
      </div>
    </div>
  )
}
