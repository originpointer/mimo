import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Ensure Next.js uses the `mimorepo/` lockfile as workspace root.
    root: path.resolve(__dirname, "../.."),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:6006/api/:path*",
      },
    ];
  },
};

export default nextConfig;
