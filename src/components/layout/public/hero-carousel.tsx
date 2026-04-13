"use client"

import { useState, useEffect } from "react"
import { HeroImage } from "@/lib/static-data/public/home"

export function HeroCarousel({ images }: { images: HeroImage[] }) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (!images || images.length === 0) return
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length)
    }, 6000) // Change image every 6 seconds
    
    return () => clearInterval(interval)
  }, [images])

  if (!images || images.length === 0) return null

  // Ensure 'images' array doesn't contain an empty parsed row (if CSV has trailing newline)
  const validImages = images.filter(img => img.url)

  return (
    <div className="absolute inset-0 w-full h-full -z-30 overflow-hidden bg-black/40">
      {validImages.map((image, index) => (
        <div
          key={image.id}
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? "opacity-60" : "opacity-0"
          }`}
          style={{
            backgroundImage: `url(${image.url})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      ))}
    </div>
  )
}
