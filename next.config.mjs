/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Stale URL indexed by Google (404). Send it to the program landing page.
      { source: '/boundless-creator-program', destination: '/', permanent: true },
    ];
  },
};

export default nextConfig;
