import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    outputFileTracingRoot: path.join(__dirname, "../../"),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any,
};

export default nextConfig;
