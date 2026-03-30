/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Note: Route Handlers use the platform request limit too (e.g. Vercel ~4.5MB hobby).
      bodySizeLimit: "50mb",
    },
  },
};

module.exports = nextConfig;
