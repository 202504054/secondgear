import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/recommend/result",
        destination: "/recommend",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
