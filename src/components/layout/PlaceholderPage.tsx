// Generic placeholder page factory template — copy this when scaffolding new pages
import { Construction } from "lucide-react"

export default function PlaceholderPage({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
      <div className="p-5 bg-muted rounded-full">
        <Construction className="h-12 w-12 text-muted-foreground" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="text-muted-foreground text-lg max-w-md">
        {description ?? "Halaman ini sedang dalam pengembangan dan akan segera tersedia."}
      </p>
    </div>
  )
}
