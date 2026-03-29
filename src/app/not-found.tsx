import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] text-center space-y-6 px-4">
      <div className="p-6 bg-muted/30 rounded-full border border-border/50 shadow-sm">
        <AlertCircle className="h-16 w-16 text-muted-foreground/80" />
      </div>
      <div className="space-y-3">
        <h1 className="text-5xl font-extrabold tracking-tight text-foreground">
          404 <span className="text-primary">Not Found</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
          Maaf, halaman atau dokumen yang Anda cari tidak ditemukan. Periksa kembali tautan Anda atau kembali ke halaman utama.
        </p>
      </div>
      <div className="flex gap-4 pt-4">
        <Link href="/">
          <Button size="lg" className="font-semibold shadow-sm">
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  )
}
