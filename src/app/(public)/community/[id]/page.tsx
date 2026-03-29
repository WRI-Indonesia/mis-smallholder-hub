import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  MapPin, Users, Calendar, Phone, ArrowLeft, Leaf,
  Wheat, Award, MessageCircle, TrendingUp, User, LayoutGrid
} from "lucide-react"
import { farmerGroups } from "@/lib/static-data/public/community"
import ProfileMiniMap from "@/components/maps/ProfileMiniMap"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const group = farmerGroups.find(g => g.id === id)
  if (!group) return { title: "Komunitas Tidak Ditemukan" }
  return {
    title: `${group.name} | Smallholder HUB`,
    description: group.description
  }
}

export default async function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const group = farmerGroups.find(g => g.id === id)
  if (!group) notFound()

  // Parse certifications string into array
  const certList = group.certifications?.split("|").map(c => c.trim()).filter(Boolean) ?? []

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero Banner ───────────────────────────────────────────── */}
      <div className="relative w-full h-[320px] md:h-[440px]">
        <Image
          src={group.image_url}
          alt={group.name}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />

        {/* Back button */}
        <div className="absolute top-6 left-6">
          <Link href="/community" className="inline-flex items-center gap-2 text-white/90 hover:text-white bg-black/30 backdrop-blur-md px-4 py-2 rounded-full text-sm font-semibold border border-white/20 transition-colors hover:bg-black/50">
            <ArrowLeft className="h-4 w-4" />
            Direktori Komunitas
          </Link>
        </div>

        {/* Hero Content at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <div className="max-w-5xl mx-auto">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge className="bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[10px] px-3 py-1">
                {group.type}
              </Badge>
              {certList.map(cert => (
                <Badge key={cert} variant="outline" className="border-white/40 text-white bg-white/10 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider gap-1">
                  <Award className="w-3 h-3" />
                  {cert}
                </Badge>
              ))}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight drop-shadow-lg">
              {group.name}
            </h1>
            <p className="flex items-center gap-1.5 text-white/80 mt-3 text-base font-medium">
              <MapPin className="h-4 w-4 text-primary" />
              {group.village}, {group.region} — Provinsi Riau
            </p>
          </div>
        </div>
      </div>

      {/* ── Main Content ───────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-10">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── LEFT COLUMN ── */}
          <div className="flex-1 space-y-8 min-w-0">

            {/* Key Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Stat: Anggota */}
              <div className="bg-card border border-border/70 rounded-2xl p-5 flex flex-col items-center text-center shadow-sm">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <span className="text-2xl font-extrabold text-foreground">{group.members}</span>
                <span className="text-xs text-muted-foreground font-medium mt-1">Petani Anggota</span>
              </div>
              {/* Stat: Luas Lahan */}
              <div className="bg-card border border-border/70 rounded-2xl p-5 flex flex-col items-center text-center shadow-sm">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                  <LayoutGrid className="w-5 h-5 text-primary" />
                </div>
                <span className="text-2xl font-extrabold text-foreground">{group.total_land_ha.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground font-medium mt-1">Hektar Lahan</span>
              </div>
              {/* Stat: Produksi */}
              <div className="bg-card border border-border/70 rounded-2xl p-5 flex flex-col items-center text-center shadow-sm">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <span className="text-2xl font-extrabold text-foreground">{group.annual_production_ton.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground font-medium mt-1">Ton/Tahun</span>
              </div>
              {/* Stat: Tahun Berdiri */}
              <div className="bg-card border border-border/70 rounded-2xl p-5 flex flex-col items-center text-center shadow-sm">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <span className="text-2xl font-extrabold text-foreground">{group.established}</span>
                <span className="text-xs text-muted-foreground font-medium mt-1">Tahun Berdiri</span>
              </div>
            </div>

            {/* About Section */}
            <div className="bg-card border border-border/70 rounded-2xl p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Leaf className="w-5 h-5 text-primary" />
                Tentang Organisasi
              </h2>
              <p className="text-foreground/75 leading-relaxed text-[15px]">
                {group.description}
              </p>
            </div>

            {/* Komoditas Section */}
            <div className="bg-card border border-border/70 rounded-2xl p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Wheat className="w-5 h-5 text-primary" />
                Komoditas Utama
              </h2>
              <div className="flex flex-wrap gap-2">
                {group.commodities.split("|").map(c => (
                  <span key={c} className="px-4 py-2 bg-primary/10 text-primary font-semibold rounded-full text-sm border border-primary/20">
                    {c.trim()}
                  </span>
                ))}
              </div>
            </div>

            {/* Sertifikasi Section */}
            {certList.length > 0 && (
              <div className="bg-card border border-border/70 rounded-2xl p-6 md:p-8 shadow-sm">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Sertifikasi & Standar
                </h2>
                <div className="flex flex-wrap gap-3">
                  {certList.map(cert => (
                    <div key={cert} className="flex items-center gap-2 px-4 py-3 bg-muted/50 rounded-xl border border-border/60">
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                      <span className="font-bold text-sm text-foreground">{cert}</span>
                      <span className="text-xs text-muted-foreground">Bersertifikat</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div className="w-full lg:w-[300px] xl:w-[320px] shrink-0 space-y-6">

            {/* Contact Card */}
            <Card className="border-primary/20 shadow-xl bg-card overflow-hidden">
              <CardHeader className="bg-muted/30 border-b pb-4">
                <CardTitle className="text-base flex justify-between items-center">
                  Hubungi Pengurus
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-5">
                {/* Chairman */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ketua</p>
                    <p className="font-bold text-sm text-foreground">{group.chairman_name}</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-border" />

                {/* Phone */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Telepon</p>
                    <p className="font-bold text-sm text-foreground">{group.contact}</p>
                  </div>
                </div>


                {/* WhatsApp CTA */}
                <a
                  href={`https://wa.me/${group.whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 w-full bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 text-green-600 dark:text-green-400 px-4 py-3 rounded-xl font-bold text-sm transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  Chat via WhatsApp
                </a>
              </CardContent>

              {/* Mini Map */}
              <ProfileMiniMap lat={group.lat} lng={group.lng} />
            </Card>

            {/* Info Singkat Card */}
            <Card className="border-border/70 shadow-sm bg-card">
              <CardContent className="p-5 space-y-4">
                <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Info Singkat</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Jenis</span>
                    <span className="font-semibold text-foreground">{group.type}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Distrik</span>
                    <span className="font-semibold text-foreground">{group.region}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Desa</span>
                    <span className="font-semibold text-foreground">{group.village}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Berdiri</span>
                    <span className="font-semibold text-foreground">{group.established}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Anggota</span>
                    <span className="font-semibold text-foreground">{group.members} Petani</span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}
