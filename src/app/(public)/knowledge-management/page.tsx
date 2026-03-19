import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { mockModules } from "@/lib/static-data/knowledge"

export default function KnowledgeManagementPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Knowledge Management</h1>
        <p className="mt-4 text-lg text-muted-foreground">Pusat dokumentasi, modul pelatihan, dan panduan untuk petani anggota (Smallholder HUB).</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {mockModules.map((mod) => (
          <Card key={mod.id} className="flex flex-col shadow-sm border-primary/10 hover:border-primary/40 transition-colors">
            <CardHeader className="flex flex-col items-center text-center">
              <div className="mb-4 bg-muted p-4 rounded-full">{mod.icon}</div>
              <p className="text-xs font-bold text-primary/80 uppercase tracking-wider">{mod.category}</p>
              <CardTitle className="text-lg leading-tight mt-2">{mod.title}</CardTitle>
            </CardHeader>
            <CardFooter className="mt-auto pt-4 flex gap-2">
              <Button variant="outline" size="sm" className="w-full font-semibold border-primary/30 hover:bg-primary/10 hover:text-primary">
                {mod.type === "Video" ? "Tonton" : "Baca"}
              </Button>
              <Button variant="secondary" size="icon" className="shrink-0 hover:bg-primary/20 hover:text-primary">
                <Download className="w-4 h-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
