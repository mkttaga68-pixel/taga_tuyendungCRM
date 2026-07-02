import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Monorepo root so Next.js traces workspace packages (e.g. @taga-crm/shared)
    outputFileTracingRoot: path.join(__dirname, "../../"),
  },
};

export default nextConfig;
