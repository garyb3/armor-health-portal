import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, "."),
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  // Legacy single-tenant URLs land on the new /franklin/* routes so existing
  // bookmarks and email links keep working. 302 for now — flip to 308 once stable.
  async redirects() {
    return [
      { source: "/pipeline", destination: "/franklin/pipeline", permanent: false },
      { source: "/pipeline/archived", destination: "/franklin/pipeline/archived", permanent: false },
      { source: "/pipeline/category/:slug", destination: "/franklin/pipeline/category/:slug", permanent: false },
      { source: "/pipeline/:id", destination: "/franklin/pipeline/:id", permanent: false },
      { source: "/admin", destination: "/franklin/admin", permanent: false },
      { source: "/admin/:path*", destination: "/franklin/admin/:path*", permanent: false },
      { source: "/dashboard", destination: "/franklin/pipeline", permanent: false },
    ];
  },
};

export default nextConfig;
