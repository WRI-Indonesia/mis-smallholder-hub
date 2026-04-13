import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-sm text-muted-foreground">Memuat data...</p>
    </div>
  )
}
