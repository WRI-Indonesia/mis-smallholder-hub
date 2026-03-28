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
    return config;
  },
};

export default nextConfig;
