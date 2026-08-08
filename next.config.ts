import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow mobile LAN testing for HMR
  allowedDevOrigins: ['192.168.18.70'],
  experimental: {
    serverActions: {
      // Default 1 MB terlalu kecil untuk jalur upload spasial: ZIP shapefile
      // dikirim base64 (parseShapefile/parseTreeShapefile) dan payload pohon
      // bisa puluhan ribu baris JSON (#238 — review temuan body-limit).
      bodySizeLimit: "16mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.csv$/,
      type: "asset/source",
    });
    // Konten Bantuan (#184): file .md di-bundle sebagai string agar ikut
    // terbawa saat build/deploy (tanpa baca filesystem saat runtime).
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });
    // WASM unrar (dukungan Shapefile .rar): di-emit sebagai file statis; URL-nya
    // di-fetch saat runtime lalu diberikan ke node-unrar-js sebagai wasmBinary.
    config.module.rules.push({
      test: /unrar\.wasm$/,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;
