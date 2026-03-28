import { Button } from "@/components/ui/button"
import { HeroCarousel } from "@/components/hero-carousel"
import { heroImages, homeStats, homeRegions, homePartners, homeContent, homeNewsList } from "@/lib/static-data"
import { MapPin, ArrowRight, Building2, Leaf, ShieldCheck, Landmark, Lightbulb, Handshake, Calendar, Image as ImageIcon, Sprout } from "lucide-react"
import Link from "next/link"

const partnerIconMap: Record<string, any> = {
  wri: Leaf,
  rspo: ShieldCheck,
  gov: Landmark,
  finance: Building2,
  research: Lightbulb,
  ngo: Handshake
};

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative isolate w-full py-24 lg:py-32 overflow-hidden flex items-center justify-center min-h-screen">
        <HeroCarousel images={heroImages} />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-black/50 via-background/40 to-background -z-20" />

        <div className="container px-4 md:px-6 mx-auto text-center relative z-10 flex flex-col items-center">
          <h1
            className="text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl text-white drop-shadow-lg max-w-4xl mx-auto leading-tight"
            dangerouslySetInnerHTML={{ __html: homeContent['hero']?.title || "" }}
          />
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
      <section className="w-full py-24 bg-muted/30">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">{homeContent['community']?.title}</h2>
            <p className="text-muted-foreground text-lg">{homeContent['community']?.subtitle}</p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 divide-x divide-border border-y border-border py-12 bg-card/50 rounded-3xl shadow-sm">
            {homeStats.map(stat => (
              <div key={stat.id} className="flex flex-col items-center justify-center text-center">
                <span className="text-5xl font-bold text-primary mb-2 drop-shadow-sm">{stat.value}</span>
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Region Cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {homeRegions.map(region => (
              <div key={region.id} className="bg-card/40 backdrop-blur-sm rounded-3xl p-6 lg:p-8 border border-border/80 hover:border-primary/40 hover:bg-card/60 hover:shadow-2xl transition-all duration-500 flex flex-col h-full group">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex flex-shrink-0 items-center justify-center mb-6 shadow-inner border border-primary/20 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <MapPin className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3 leading-tight">{region.name}</h3>
                <p className="text-sm text-muted-foreground mb-8 flex-grow leading-relaxed">{region.description}</p>

                <div className="space-y-4 pt-6 border-t border-border/60 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">Kelompok Tani</span>
                    <span className="font-bold text-foreground bg-primary/10 px-2.5 py-1 rounded-md">{region.groupsCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">Anggota</span>
                    <span className="font-bold text-foreground bg-primary/10 px-2.5 py-1 rounded-md">{region.membersCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">Hektar</span>
                    <span className="font-bold text-foreground bg-primary/10 px-2.5 py-1 rounded-md">{region.areaCount}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Activities Section */}
      <section className="w-full py-24 bg-background border-y border-border/40">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">{homeContent['activities']?.title}</h2>
            <p className="text-muted-foreground text-lg">{homeContent['activities']?.subtitle}</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-16">
            {homeNewsList.map(article => (
              <div key={article.id} className="bg-card rounded-3xl overflow-hidden border border-border group hover:border-primary/40 hover:shadow-xl transition-all duration-300 flex flex-col shadow-sm">
                <div className="w-full h-56 bg-muted overflow-hidden relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={article.thumbnail} alt={article.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent opacity-90"></div>
                </div>
                <div className="p-8 flex flex-col flex-grow -mt-10 relative z-10 bg-card rounded-t-3xl">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 font-semibold uppercase tracking-wider">
                    <span className="flex items-center bg-primary/10 text-primary px-2.5 py-1 rounded-full"><Calendar className="w-3.5 h-3.5 mr-1.5" /> {article.publishDate}</span>
                    <span className="flex items-center"><MapPin className="w-3.5 h-3.5 mr-1.5 text-primary" /> {article.category}</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-4 leading-snug group-hover:text-primary transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <div className="mt-auto pt-4 border-t border-border/40">
                    <Link href={`/news/${article.id}`} className="inline-flex items-center text-sm font-bold text-primary hover:text-primary/80 transition-colors">
                      Baca Selengkapnya <ArrowRight className="ml-1.5 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-10 py-7 rounded-full shadow-lg text-base">
              <ImageIcon className="mr-2 w-5 h-5" /> {homeContent['activities']?.action1}
            </Button>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="w-full py-24 bg-muted/40">
        <div className="container px-4 md:px-6 mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-primary/10 text-primary font-bold text-xs border border-primary/20 uppercase tracking-widest">
              <ShieldCheck className="w-4 h-4" /> Bermitra Dengan
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">{homeContent['partners']?.title}</h2>
            <p className="text-muted-foreground text-lg">{homeContent['partners']?.subtitle}</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {homePartners.map(partner => {
              const Icon = partnerIconMap[partner.icon] || Handshake;
              return (
                <div key={partner.id} className="bg-card rounded-2xl p-6 border border-border flex items-center gap-5 hover:bg-primary/5 transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer group hover:border-primary/30">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-inner">
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base leading-tight mb-1.5 group-hover:text-primary">{partner.name}</h3>
                    <p className="text-sm text-muted-foreground">{partner.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  )
}
