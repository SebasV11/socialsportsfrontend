import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const backendBase = (process.env.BACKEND_INTERNAL_URL || 'https://102826.stu.sd-lab.nl/SocialSportBackend/public').replace(/\/$/, '');

    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [
        {
          source: '/api/:path*',
          destination: `${backendBase}/api/:path*`,
        },
        {
          source: '/storage/:path*',
          destination: `${backendBase}/storage/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
