import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow mobile LAN testing for HMR
  allowedDevOrigins: ['192.168.18.70'],
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
    return config;
  },
};

export default nextConfig;
