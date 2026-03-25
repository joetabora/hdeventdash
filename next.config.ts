import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  async rewrites() {
    return [
      {
        source: "/firebase-messaging-sw.js",
        destination: "/api/fcm-service-worker",
      },
    ];
  },
};

export default nextConfig;
