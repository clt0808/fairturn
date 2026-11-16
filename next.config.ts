import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The queue is live SQLite state. Do not cache page renders.
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
