import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    // Next.js /_next/image blocks upstreams that resolve to private IPs as an
    // SSRF protection. Our Directus lives behind Caddy on an internal network
    // (192.168.1.x), so we bypass Next.js optimization and let Directus serve
    // transformed WebP/AVIF directly via ?width=&format= query params.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "delovkusa.openlabio.ru",
        pathname: "/directus/assets/**",
      },
    ],
  },
};

export default nextConfig;
