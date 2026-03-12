/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Expose build timestamp as a public env var for version detection
  env: {
    NEXT_PUBLIC_BUILD_ID: new Date().toISOString(),
  },
};
module.exports = nextConfig;
