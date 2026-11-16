import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The queue is live SQLite state. Do not cache page renders.
  async redirects() {
    return [
      { source: "/get", destination: "/p/edf/get", permanent: false },
      { source: "/add", destination: "/p/edf/add", permanent: false },
    ];
  },
  agentRules: false,
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
