import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "midfield.mlbstatic.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.mlbstatic.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.tujonron.net",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
