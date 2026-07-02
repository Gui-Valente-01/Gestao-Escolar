/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Server Actions are stable in Next 14, body size bump for AI payloads
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
