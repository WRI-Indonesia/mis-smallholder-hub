import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sprout, BookOpen, Users } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative w-full py-24 lg:py-32 overflow-hidden flex items-center justify-center min-h-[85vh]">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/10 to-background -z-20" />
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] -z-10" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px] -z-10" />

        <div className="container px-4 md:px-6 mx-auto text-center relative z-10">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-semibold text-sm border border-primary/20 tracking-wider">
            🌿 DIGITALISASI PERTANIAN
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl lg:text-8xl text-foreground drop-shadow-sm max-w-5xl mx-auto">
            SMALLHOLDER <span className="text-primary">HUB</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[700px] text-lg text-muted-foreground">
            Platform terpadu untuk memberdayakan petani kecil melalui manajemen data, komunitas, dan pengetahuan praktik pertanian terbaik.
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-20 bg-background">
        <div className="container px-4 md:px-6 mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Fitur Utama</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="hover:shadow-lg transition-shadow border-primary/20">
              <CardHeader className="flex flex-row items-center gap-4">
                <Sprout className="w-10 h-10 text-primary" />
                <CardTitle>Manajemen Lahan</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-foreground/80">
                  Pemetaan aset poligon lahan dan pencatatan riwayat penanaman serta panen yang informatif.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow border-primary/20">
              <CardHeader className="flex flex-row items-center gap-4">
                <Users className="w-10 h-10 text-primary" />
                <CardTitle>Komunitas Petani</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-foreground/80">
                  Wadah diskusi mandiri antar petani untuk saling bertukar solusi penanganan hama atau kendala cuaca.
                </CardDescription>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow border-primary/20">
              <CardHeader className="flex flex-row items-center gap-4">
                <BookOpen className="w-10 h-10 text-primary" />
                <CardTitle>Pengetahuan Praktis</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base text-foreground/80">
                  Akses langsung ke e-modul, panduan budidaya, dan materi sertifikasi Best Management Practices (BMP).
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
