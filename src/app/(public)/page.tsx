import { Button } from "@/components/ui/button"
import { HeroCarousel } from "@/components/layout/public/hero-carousel"
import { heroImages, homeStats, homeRegions, homePartners, homeContent, homeNewsList } from "@/lib/static-data/public/home"
import { MapPin, ArrowRight, Building2, Leaf, ShieldCheck, Landmark, Lightbulb, Handshake, Calendar, Sprout, Users, TreePine, ChevronRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

const partnerIconMap: Record<string, any> = {
  wri: Leaf,
  rspo: ShieldCheck,
  gov: Landmark,
  finance: Building2,
  research: Lightbulb,
  ngo: Handshake
};

const statIconMap: Record<string, any> = {
  "1": Handshake,
  "2": MapPin,
  "3": Users,
  "4": TreePine
};

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative isolate w-full py-24 lg:py-32 overflow-hidden flex items-center justify-center min-h-screen">
        <HeroCarousel images={heroImages} />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/50 via-background/40 to-background -z-20" />

        <div className="container px-4 md:px-6 mx-auto text-center relative z-10 flex flex-col items-center">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl text-white drop-shadow-lg max-w-4xl mx-auto leading-tight">
            {homeContent['hero']?.title?.split('<br/>').map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && <br />}
              </span>
            ))}
          </h1>
          <p className="mx-auto mt-6 max-w-[700px] text-lg text-gray-200 drop-shadow-md font-medium">
            {homeContent['hero']?.subtitle}
          </p>
          <div className="mt-10 flex gap-4">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xl px-8 rounded-full">
              {homeContent['hero']?.action1} <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" className="border-gray-400 text-white hover:bg-white hover:text-black font-semibold rounded-full bg-black/40 backdrop-blur-md">
              <Sprout className="mr-2 w-4 h-4 text-primary" /> {homeContent['hero']?.action2}
            </Button>
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="w-full py-20 lg:py-28 bg-muted/30">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20 uppercase tracking-widest">
              <Users className="w-4 h-4" /> Jaringan Kami
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{homeContent['community']?.title}</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">{homeContent['community']?.subtitle}</p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-16">
            {homeStats.map(stat => {
              const StatIcon = statIconMap[stat.id] || Users;
              return (
                <div key={stat.id} className="bg-card rounded-2xl p-6 md:p-8 border border-border/60 shadow-sm text-center flex flex-col items-center gap-3 hover:shadow-md hover:border-primary/30 transition-all duration-300">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
                    <StatIcon className="w-5 h-5" />
                  </div>
                  <span className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider leading-tight">{stat.label}</span>
                </div>
              );
            })}
          </div>

          {/* Region Cards */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {homeRegions.map(region => (
              <div key={region.id} className="bg-card rounded-2xl p-6 border border-border/60 hover:border-primary/40 hover:shadow-xl transition-all duration-500 flex flex-col h-full group">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex shrink-0 items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground leading-tight">{region.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6 flex-grow leading-relaxed">{region.description}</p>

                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/40">
                  <div className="text-center">
                    <span className="block text-lg font-bold text-foreground">{region.groupsCount}</span>
                    <span className="text-[11px] text-muted-foreground font-medium">Kelompok</span>
                  </div>
                  <div className="text-center border-x border-border/40">
                    <span className="block text-lg font-bold text-foreground">{region.membersCount}</span>
                    <span className="text-[11px] text-muted-foreground font-medium">Anggota</span>
                  </div>
                  <div className="text-center">
                    <span className="block text-lg font-bold text-foreground">{region.areaCount}</span>
                    <span className="text-[11px] text-muted-foreground font-medium">Hektar</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/community">
              <Button variant="outline" className="font-semibold rounded-full px-8 py-6 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                Lihat Semua Komunitas <ChevronRight className="ml-1.5 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Activities Section */}
      <section className="w-full py-20 lg:py-28 bg-background">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20 uppercase tracking-widest">
                <Calendar className="w-4 h-4" /> Berita Terbaru
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{homeContent['activities']?.title}</h2>
              <p className="text-muted-foreground text-lg leading-relaxed">{homeContent['activities']?.subtitle}</p>
            </div>
            <div className="shrink-0">
              <Button variant="outline" className="font-semibold rounded-full px-6 py-5 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                {homeContent['activities']?.action1} <ArrowRight className="ml-1.5 w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {homeNewsList.map(article => (
              <Link key={article.id} href={`/news/${article.id}`} className="group">
                <article className="bg-card rounded-2xl overflow-hidden border border-border/60 hover:border-primary/40 hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                  <div className="w-full aspect-[16/10] bg-muted overflow-hidden relative">
                    <Image src={article.thumbnail} alt={article.title} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-full font-semibold">
                        <Calendar className="w-3 h-3" /> {article.publishDate}
                      </span>
                      <span className="flex items-center gap-1 font-medium">
                        <MapPin className="w-3 h-3 text-primary" /> {article.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-4 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {article.title}
                    </h3>
                    <div className="mt-auto pt-3 border-t border-border/40">
                      <span className="inline-flex items-center text-sm font-bold text-primary group-hover:gap-2 transition-all">
                        Baca Selengkapnya <ArrowRight className="ml-1 w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="w-full py-20 lg:py-28 bg-muted/30">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20 uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" /> Bermitra Dengan
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{homeContent['partners']?.title}</h2>
            <p className="text-muted-foreground text-lg leading-relaxed">{homeContent['partners']?.subtitle}</p>
          </div>

          <div className="max-w-4xl mx-auto">
            {/* Featured Partner */}
            {homePartners.length > 0 && (() => {
              const featured = homePartners[0];
              const FeaturedIcon = partnerIconMap[featured.icon] || Handshake;
              return (
                <div className="bg-card rounded-2xl p-8 md:p-10 border border-primary/20 flex flex-col md:flex-row items-center gap-6 mb-6 shadow-sm">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FeaturedIcon className="w-9 h-9" />
                  </div>
                  <div className="text-center md:text-left">
                    <span className="text-xs font-bold text-primary uppercase tracking-wider">Mitra Utama</span>
                    <h3 className="text-xl font-bold text-foreground mt-1">{featured.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{featured.description}</p>
                  </div>
                </div>
              );
            })()}

            {/* Other Partners Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {homePartners.slice(1).map(partner => {
                const Icon = partnerIconMap[partner.icon] || Handshake;
                return (
                  <div key={partner.id} className="bg-card rounded-2xl p-5 border border-border/60 flex items-center gap-4 hover:border-primary/30 hover:shadow-md transition-all duration-300 group">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-foreground text-sm leading-tight group-hover:text-primary transition-colors">{partner.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{partner.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
