/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Up to 10 files x 25 MB per request, plus multipart overhead.
    serverActions: { bodySizeLimit: "260mb" },
  },
};

export default nextConfig;
