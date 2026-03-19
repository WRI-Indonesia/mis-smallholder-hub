import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Users, Calendar, Phone, ArrowLeft } from "lucide-react"
import { farmerGroups } from "@/lib/static-data/community"

export default async function CommunityDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const group = farmerGroups.find(g => g.id === id)

  if (!group) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-[1000px]">
      <Link href="/community" className="inline-flex items-center text-sm font-semibold text-muted-foreground hover:text-primary mb-8 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali ke Direktori
      </Link>

      <div className="flex flex-col md:flex-row gap-8">
        <div className="flex-1 space-y-8">
          <div>
            <div className="inline-block px-3 py-1 bg-primary/10 text-primary font-bold text-sm uppercase tracking-widest rounded mb-4">
              {group.type}
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl leading-tight">
              {group.name}
            </h1>
            <p className="text-xl text-muted-foreground flex items-center mt-4">
              <MapPin className="mr-2 h-5 w-5 text-primary" />
              Distrik {group.region}, Riau
            </p>
          </div>

          <div className="prose prose-green dark:prose-invert max-w-none">
            <h2 className="text-2xl font-bold text-foreground">Tentang Organisasi</h2>
            <p className="text-foreground/80 leading-relaxed text-lg mt-4">
              {group.description}
            </p>
          </div>
        </div>

        <div className="w-full md:w-[320px] shrink-0">
          <Card className="sticky top-24 border-primary/20 shadow-md bg-card/60 backdrop-blur-sm">
            <CardHeader className="bg-muted/30 border-b pb-4">
              <CardTitle className="text-lg">Profil Kemitraan</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Anggota</p>
                  <p className="font-bold text-lg leading-tight">{group.members} Petani</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tahun Berdiri</p>
                  <p className="font-bold text-lg leading-tight">{group.established}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Kontak Hubung</p>
                  <p className="font-bold text-lg leading-tight">{group.contact}</p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border/50">
                <Button className="w-full font-semibold shadow-sm" size="lg">Hubungi Pengurus</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
