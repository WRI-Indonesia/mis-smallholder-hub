"use client";

import { useState, useEffect } from "react";

export interface HeroImage {
  src: string;
  alt: string;
}

export function HeroCarousel({ images }: { images: HeroImage[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [images.length]);

  if (images.length === 0) return null;

  return (
    <div className="absolute inset-0 -z-10">
      <div
        className="w-full h-full bg-cover bg-center transition-opacity duration-1000"
        style={{ backgroundImage: `url(${images[currentIndex]?.src ?? ""})` }}
      />
    </div>
  );
}
