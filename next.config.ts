import type { NextConfig } from "next";

// Build statique « mode démo » pour Cloudflare Pages : DEMO_BUILD=1 bunx next build
// (API simulées côté client via src/lib/demo-api.ts — voir worklog Task 10)
const isDemoBuild = process.env.DEMO_BUILD === "1";

const nextConfig: NextConfig = {
  ...(isDemoBuild
    ? { output: "export" as const, distDir: ".next-demo", images: { unoptimized: true } }
    : { output: "standalone" as const }),
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
