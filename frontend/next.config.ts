import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Directus через Caddy — один домен с префиксом /directus/
      {
        protocol: "https",
        hostname: "delovkusa.openlabio.ru",
        pathname: "/directus/assets/**",
      },
    ],
  },
};

export default nextConfig;
