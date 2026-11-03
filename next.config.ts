import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the on-screen "issue" / route-status indicator. The dashboard is a polished
  // demo surface and the dev chrome reads as visual noise — Next.js will still surface
  // build/runtime errors in the terminal and React error overlay.
  devIndicators: false,
  async redirects() {
    return [
      { source: "/blog", destination: "/beitraege#artikel", permanent: true },
      {
        source: "/blog/:slug((?!.*\\.).*)",
        destination: "/beitraege/:slug",
        permanent: true,
      },
      { source: "/news", destination: "/beitraege#extern-gelesen", permanent: true },
      { source: "/live", destination: "/tag", permanent: true },
      { source: "/live/:path*", destination: "/tag/:path*", permanent: true },
      { source: "/site", destination: "/ort?sicht=projekt", permanent: true },
      { source: "/netz", destination: "/ort?sicht=netz#testnetz", permanent: true },
      { source: "/szenarien", destination: "/ort?sicht=netz#grenze", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/fca/fca-table.json",
        headers: [{ key: "Cache-Control", value: "public, max-age=300" }],
      },
    ];
  },
};

export default nextConfig;
