import type { NextConfig } from "next";

const backendTarget = process.env.API_PROXY_TARGET ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      // Match Vite dev proxy behavior:
      // - client calls /api/*
      // - backend receives /* (strip /api prefix)
      {
        source: "/api/:path*",
        destination: `${backendTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;

