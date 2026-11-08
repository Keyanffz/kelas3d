import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    // Halaman memuat datanya di browser lewat sesi Laravel, jadi validasi instant navigation
    // cuma untuk segmen yang memintanya sendiri lewat `export const instant`.
    instantInsights: { validationLevel: "manual-warning" },
  },
  // Demo di jaringan kelas: web dibuka lewat IP laptop server, sama dengan host API.
  allowedDevOrigins: [new URL(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost").hostname],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
