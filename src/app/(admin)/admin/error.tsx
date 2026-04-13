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
    <div className="flex h-full min-h-[400px] w-full flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-2xl font-bold">Terjadi Kesalahan</h2>
      <p className="text-muted-foreground mb-4">Mohon maaf, halaman tidak dapat dimuat saat ini.</p>
      <Button onClick={() => reset()} variant="default">
        Coba Lagi
      </Button>
    </div>
  )
}
