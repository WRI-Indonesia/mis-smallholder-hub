"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 text-center px-4">
      <h2 className="text-3xl font-extrabold tracking-tight">Terjadi Kesalahan</h2>
      <p className="text-muted-foreground mb-4 max-w-md">Mohon maaf, halaman tidak dapat dimuat saat ini. Silakan coba kembali beberapa saat lagi.</p>
      <Button onClick={() => reset()} variant="default">
        Coba Lagi
      </Button>
    </div>
  )
}
