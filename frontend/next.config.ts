import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "admin.delovkusa.openlabio.ru",
        pathname: "/assets/**",
      },
      {
        protocol: "http",
        hostname: "192.168.1.214",
        port: "9000",
        pathname: "/bakarybucket/**",
      },
    ],
  },
};

export default nextConfig;
