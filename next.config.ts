import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.serebii.net",
      },
    ],
  },
  outputFileTracingIncludes: {
    "/*": ["./storage/**/*"],
    "/api/**/*": ["./storage/**/*"],
  },
  turbopack: {
    root: rootDir,
  },
};

export default nextConfig;
