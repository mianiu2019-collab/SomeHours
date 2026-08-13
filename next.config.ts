import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The regular web build is unchanged. Capacitor uses a static export so the
  // app can run fully on-device without depending on a hosted website.
  ...(process.env.CAPACITOR_BUILD === "true"
    ? { output: "export" as const, images: { unoptimized: true } }
    : {}),
};

export default nextConfig;
