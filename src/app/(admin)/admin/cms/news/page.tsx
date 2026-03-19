import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Edit } from "lucide-react"
import { mockArticles } from "@/lib/static-data/news"

export default function CMSNewsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Berita & Pengumuman</h1>
          <p className="text-muted-foreground">Publikasi liputan kegiatan dan pengumuman untuk member/app mobile.</p>
        </div>
        <Button className="w-full sm:w-auto font-semibold">
          <PlusCircle className="mr-2 h-4 w-4" />
          Tulis Berita Baru
        </Button>
      </div>

      <div className="grid gap-4">
        {mockArticles.map((item, idx) => (
          <Card key={item.id} className="hover:border-primary/40 transition-colors shadow-sm">
            <CardContent className="flex items-center justify-between p-6">
              <div className="space-y-1">
                <h3 className="font-semibold text-lg text-foreground">{item.title}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{item.date}</span>
                  <span>•</span>
                  <span>{item.author}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge variant={item.status === "Published" ? "default" : "secondary"}>
                  {item.status}
                </Badge>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
