import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow mobile LAN testing for HMR
  allowedDevOrigins: ['192.168.18.70'],
};

export default nextConfig;
