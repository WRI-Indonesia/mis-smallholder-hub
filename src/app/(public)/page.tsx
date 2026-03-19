import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sprout, BookOpen, Users } from "lucide-react"

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="w-full py-20 bg-primary/10">
        <div className="container px-4 md:px-6 mx-auto text-center">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl text-primary drop-shadow-sm">
            Smallholder HUB
          </h1>
          <p className="mx-auto mt-4 max-w-[700px] text-lg text-muted-foreground">
            Platform terpadu untuk memberdayakan petani kecil melalui manajemen data, komunitas, dan pengetahuan praktik pertanian terbaik.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button size="lg" className="font-semibold shadow-md">Daftar Sekarang</Button>
            <Button variant="outline" size="lg" className="font-semibold">Pelajari Lebih Lanjut</Button>
          </div>
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
